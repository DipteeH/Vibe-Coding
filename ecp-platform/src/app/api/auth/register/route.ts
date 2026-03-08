import { NextResponse } from "next/server";
import { createAuthenticatedJsonResponse, registrationSchema, registerUser, resolveReturnTo } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registrationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid registration payload.", issues: parsed.error.flatten() }, { status: 400 });
    }

    const user = await registerUser(parsed.data);
    return createAuthenticatedJsonResponse({
      userId: user.id,
      body: { user, returnTo: resolveReturnTo(parsed.data.returnTo) },
      status: 201,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to register user.";
    return NextResponse.json({ message }, { status: 400 });
  }
}