import { NextResponse } from "next/server";
import { getSessionSummary, isGoogleAuthConfigured } from "@/lib/auth";

export async function GET() {
  return NextResponse.json({
    ...(await getSessionSummary()),
    providers: {
      emailPassword: true,
      google: isGoogleAuthConfigured(),
      phone: true,
    },
  });
}