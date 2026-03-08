import { createGoogleAuthorizationResponse } from "@/lib/auth";

export async function GET(request: Request) {
  return createGoogleAuthorizationResponse(request);
}