import { NextResponse } from "next/server";
import { createAuthenticatedJsonResponse, phoneVerifySchema, resolveReturnTo, verifyPhoneLogin } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = phoneVerifySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid phone verification payload.", issues: parsed.error.flatten() }, { status: 400 });
    }

    const user = await verifyPhoneLogin(parsed.data);
    return createAuthenticatedJsonResponse({
      userId: user.id,
      body: { user, returnTo: resolveReturnTo(parsed.data.returnTo) },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to verify phone sign-in.";
    return NextResponse.json({ message }, { status: 400 });
  }
}