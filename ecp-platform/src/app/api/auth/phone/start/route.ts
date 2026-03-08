import { NextResponse } from "next/server";
import { phoneStartSchema, startPhoneLogin } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = phoneStartSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid phone sign-in payload.", issues: parsed.error.flatten() }, { status: 400 });
    }

    return NextResponse.json(await startPhoneLogin(parsed.data));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to start phone sign-in.";
    return NextResponse.json({ message }, { status: 400 });
  }
}