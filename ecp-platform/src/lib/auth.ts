import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { AuthProvider, AuthenticatedUser, SessionSummary, UserRole } from "@/domain/auth/types";
import { prisma } from "@/infrastructure/db/prisma";
import { sendPhoneVerificationCode } from "@/lib/notifications";

const SESSION_COOKIE_NAME = "ecp_session";
const GOOGLE_STATE_COOKIE_NAME = "ecp_google_state";
const SESSION_DURATION_MS = 1000 * 60 * 60 * 24 * 30;
const PHONE_CODE_DURATION_MS = 1000 * 60 * 10;

export interface AdminUserSummary {
  id: string;
  name: string;
  email: string | null;
  phoneNumber: string | null;
  role: UserRole;
  createdAt: string;
  providers: AuthProvider[];
  savedConfigurationCount: number;
  activeSessionCount: number;
}

interface AdminUserRecord {
  id: string;
  name: string;
  email: string | null;
  phoneNumber: string | null;
  role: UserRole;
  createdAt: Date;
  accounts: Array<{ provider: AuthProvider }>;
  _count: {
    savedQuotes: number;
    sessions: number;
  };
}

export const registrationSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  password: z.string().min(8).max(72),
  returnTo: z.string().optional(),
});

export const passwordLoginSchema = z.object({
  email: z.string().trim().email().max(120),
  password: z.string().min(8).max(72),
  returnTo: z.string().optional(),
});

export const phoneStartSchema = z.object({
  phoneNumber: z.string().trim().min(8).max(20),
  returnTo: z.string().optional(),
});

export const phoneVerifySchema = z.object({
  phoneNumber: z.string().trim().min(8).max(20),
  code: z.string().trim().length(6),
  name: z.string().trim().min(2).max(80).optional(),
  returnTo: z.string().optional(),
});

function requirePrismaForAuth() {
  if (!prisma) {
    throw new Error("Authentication requires Prisma. Run npm run db:push and restart the app.");
  }

  return prisma;
}

function hashToken(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizePhone(phoneNumber: string) {
  return phoneNumber.replace(/[^+0-9]/g, "");
}

function getBaseUrl() {
  return process.env.AUTH_BASE_URL?.trim() || "http://127.0.0.1:3000";
}

function parseList(value?: string) {
  return new Set(
    (value ?? "")
      .split(",")
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean),
  );
}

function resolveRole(email?: string | null, phoneNumber?: string | null) {
  const adminEmails = parseList(process.env.AUTH_ADMIN_EMAILS);
  const adminPhones = parseList(process.env.AUTH_ADMIN_PHONES);

  if ((email && adminEmails.has(email.toLowerCase())) || (phoneNumber && adminPhones.has(phoneNumber.toLowerCase()))) {
    return "ADMIN" as const;
  }

  return "USER" as const;
}

function toAuthenticatedUser(user: {
  id: string;
  name: string;
  email: string | null;
  phoneNumber: string | null;
  role: "USER" | "ADMIN";
}): AuthenticatedUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: user.role,
  };
}

function sanitizeReturnTo(returnTo?: string | null) {
  if (!returnTo || !returnTo.startsWith("/") || returnTo.startsWith("//")) {
    return "/";
  }

  return returnTo;
}

async function createSession(userId: string) {
  const db = requirePrismaForAuth();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await db.userSession.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
    },
  });

  return { token, expiresAt };
}

function attachSessionCookie(response: NextResponse, token: string, expiresAt: Date) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}

export async function createAuthenticatedJsonResponse(input: {
  userId: string;
  body: Record<string, unknown>;
  status?: number;
}) {
  const { token, expiresAt } = await createSession(input.userId);
  const response = NextResponse.json(input.body, { status: input.status ?? 200 });
  attachSessionCookie(response, token, expiresAt);
  return response;
}

export async function createLogoutResponse(request: Request) {
  const db = requirePrismaForAuth();
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await db.userSession.deleteMany({ where: { tokenHash: hashToken(token) } });
  }

  const response = NextResponse.redirect(new URL("/", request.url));
  clearSessionCookie(response);
  return response;
}

export async function getCurrentUser(): Promise<AuthenticatedUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token || !prisma) {
    return null;
  }

  const session = await prisma.userSession.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      user: {
        select: { id: true, name: true, email: true, phoneNumber: true, role: true },
      },
    },
  });

  if (!session) {
    return null;
  }

  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.userSession.delete({ where: { id: session.id } });
    return null;
  }

  await prisma.userSession.update({
    where: { id: session.id },
    data: { lastSeenAt: new Date() },
  });

  return toAuthenticatedUser(session.user);
}

export async function getSessionSummary(): Promise<SessionSummary> {
  return { user: await getCurrentUser() };
}

export async function requireUser(returnTo: string) {
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?returnTo=${encodeURIComponent(sanitizeReturnTo(returnTo))}`);
  }

  return user;
}

export async function requireAdmin(returnTo: string) {
  const user = await requireUser(returnTo);
  if (user.role !== "ADMIN") {
    redirect("/");
  }

  return user;
}

export async function requireRouteUser() {
  const user = await getCurrentUser();
  if (!user) {
    return null;
  }

  return user;
}

export async function registerUser(input: z.infer<typeof registrationSchema>) {
  const db = requirePrismaForAuth();
  const email = normalizeEmail(input.email);
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    throw new Error("An account already exists for that email address.");
  }

  const user = await db.user.create({
    data: {
      name: input.name.trim(),
      email,
      passwordHash: await bcrypt.hash(input.password, 10),
      emailVerifiedAt: new Date(),
      role: resolveRole(email, null),
      accounts: {
        create: {
          provider: "EMAIL",
          providerAccountId: email,
        },
      },
    },
    select: { id: true, name: true, email: true, phoneNumber: true, role: true },
  });

  return toAuthenticatedUser(user);
}

export async function loginWithPassword(input: z.infer<typeof passwordLoginSchema>) {
  const db = requirePrismaForAuth();
  const email = normalizeEmail(input.email);
  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, phoneNumber: true, role: true, passwordHash: true },
  });

  if (!user?.passwordHash) {
    throw new Error("Invalid email or password.");
  }

  const matches = await bcrypt.compare(input.password, user.passwordHash);
  if (!matches) {
    throw new Error("Invalid email or password.");
  }

  return toAuthenticatedUser(user);
}

export async function startPhoneLogin(input: z.infer<typeof phoneStartSchema>) {
  const db = requirePrismaForAuth();
  const phoneNumber = normalizePhone(input.phoneNumber);
  const code = String(Math.floor(100000 + Math.random() * 900000));

  await db.phoneVerification.create({
    data: {
      phoneNumber,
      codeHash: hashToken(code),
      expiresAt: new Date(Date.now() + PHONE_CODE_DURATION_MS),
    },
  });

  const delivery = await sendPhoneVerificationCode({ phoneNumber, code });
  return { phoneNumber, ...delivery };
}

export async function verifyPhoneLogin(input: z.infer<typeof phoneVerifySchema>) {
  const db = requirePrismaForAuth();
  const phoneNumber = normalizePhone(input.phoneNumber);
  const record = await db.phoneVerification.findFirst({
    where: {
      phoneNumber,
      consumedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });

  if (!record || record.expiresAt.getTime() < Date.now() || record.codeHash !== hashToken(input.code)) {
    throw new Error("Invalid or expired verification code.");
  }

  await db.phoneVerification.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  });

  let user = await db.user.findUnique({
    where: { phoneNumber },
    select: { id: true, name: true, email: true, phoneNumber: true, role: true },
  });

  if (!user) {
    user = await db.user.create({
      data: {
        name: input.name?.trim() || `Mobile user ${phoneNumber.slice(-4)}`,
        phoneNumber,
        phoneVerifiedAt: new Date(),
        role: resolveRole(null, phoneNumber),
      },
      select: { id: true, name: true, email: true, phoneNumber: true, role: true },
    });
  } else {
    await db.user.update({ where: { id: user.id }, data: { phoneVerifiedAt: new Date() } });
  }

  await db.authAccount.upsert({
    where: {
      provider_providerAccountId: {
        provider: "PHONE",
        providerAccountId: phoneNumber,
      },
    },
    update: { userId: user.id },
    create: {
      userId: user.id,
      provider: "PHONE",
      providerAccountId: phoneNumber,
    },
  });

  return toAuthenticatedUser(user);
}

export function isGoogleAuthConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim() &&
      process.env.GOOGLE_REDIRECT_URI?.trim(),
  );
}

export async function createGoogleAuthorizationResponse(request: Request) {
  if (!isGoogleAuthConfigured()) {
    return NextResponse.redirect(new URL("/login?error=google_not_configured", request.url));
  }

  const state = randomBytes(24).toString("hex");
  const returnTo = sanitizeReturnTo(new URL(request.url).searchParams.get("returnTo"));
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!.trim());
  authUrl.searchParams.set("redirect_uri", process.env.GOOGLE_REDIRECT_URI!.trim());
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");

  const response = NextResponse.redirect(authUrl);
  response.cookies.set({
    name: GOOGLE_STATE_COOKIE_NAME,
    value: Buffer.from(JSON.stringify({ state, returnTo })).toString("base64url"),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });
  return response;
}

export async function completeGoogleLogin(request: Request) {
  const db = requirePrismaForAuth();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(GOOGLE_STATE_COOKIE_NAME)?.value;

  if (!code || !state || !cookieValue) {
    return NextResponse.redirect(new URL("/login?error=google_failed", request.url));
  }

  const cookiePayload = JSON.parse(Buffer.from(cookieValue, "base64url").toString("utf8")) as {
    state: string;
    returnTo: string;
  };

  if (cookiePayload.state !== state) {
    return NextResponse.redirect(new URL("/login?error=google_state", request.url));
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!.trim(),
      client_secret: process.env.GOOGLE_CLIENT_SECRET!.trim(),
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!.trim(),
      grant_type: "authorization_code",
      code,
    }),
  });

  if (!tokenResponse.ok) {
    return NextResponse.redirect(new URL("/login?error=google_token", request.url));
  }

  const tokenData = (await tokenResponse.json()) as { access_token?: string };
  if (!tokenData.access_token) {
    return NextResponse.redirect(new URL("/login?error=google_profile", request.url));
  }

  const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
    cache: "no-store",
  });

  if (!profileResponse.ok) {
    return NextResponse.redirect(new URL("/login?error=google_profile", request.url));
  }

  const profile = (await profileResponse.json()) as {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
  };

  if (!profile.sub || !profile.email) {
    return NextResponse.redirect(new URL("/login?error=google_profile", request.url));
  }

  const email = normalizeEmail(profile.email);
  let account = await db.authAccount.findUnique({
    where: {
      provider_providerAccountId: {
        provider: "GOOGLE",
        providerAccountId: profile.sub,
      },
    },
    include: {
      user: { select: { id: true, name: true, email: true, phoneNumber: true, role: true } },
    },
  });

  let user = account?.user ?? null;
  if (!user) {
    const existingUser = await db.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true, phoneNumber: true, role: true },
    });

    user =
      existingUser ??
      (await db.user.create({
        data: {
          name: profile.name?.trim() || email.split("@")[0],
          email,
          emailVerifiedAt: profile.email_verified ? new Date() : null,
          role: resolveRole(email, null),
        },
        select: { id: true, name: true, email: true, phoneNumber: true, role: true },
      }));

    account = await db.authAccount.upsert({
      where: {
        provider_providerAccountId: {
          provider: "GOOGLE",
          providerAccountId: profile.sub,
        },
      },
      update: { userId: user.id },
      create: {
        userId: user.id,
        provider: "GOOGLE",
        providerAccountId: profile.sub,
      },
      include: {
        user: { select: { id: true, name: true, email: true, phoneNumber: true, role: true } },
      },
    });
    user = account.user;
  }

  const { token, expiresAt } = await createSession(user.id);
  const response = NextResponse.redirect(new URL(cookiePayload.returnTo || "/", request.url));
  attachSessionCookie(response, token, expiresAt);
  response.cookies.set({
    name: GOOGLE_STATE_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
  return response;
}

export async function listUsersForAdmin(): Promise<AdminUserSummary[]> {
  const db = requirePrismaForAuth();
  const users = (await db.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      accounts: { select: { provider: true } },
      _count: { select: { savedQuotes: true, sessions: true } },
    },
  })) as AdminUserRecord[];

  return users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    phoneNumber: user.phoneNumber,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    providers: Array.from(new Set(user.accounts.map((account) => account.provider))),
    savedConfigurationCount: user._count.savedQuotes,
    activeSessionCount: user._count.sessions,
  }));
}

export function resolveReturnTo(value?: string | null) {
  return sanitizeReturnTo(value);
}

export function buildAbsoluteUrl(pathname: string) {
  return new URL(pathname, getBaseUrl()).toString();
}