import { NextResponse } from "next/server";
import { createAuthenticatedJsonResponse, loginWithPassword, passwordLoginSchema, resolveReturnTo } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = passwordLoginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid login payload.", issues: parsed.error.flatten() }, { status: 400 });
    }

    const user = await loginWithPassword(parsed.data);
    return createAuthenticatedJsonResponse({
      userId: user.id,
      body: { user, returnTo: resolveReturnTo(parsed.data.returnTo) },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to sign in.";
    return NextResponse.json({ message }, { status: 400 });
  }
}