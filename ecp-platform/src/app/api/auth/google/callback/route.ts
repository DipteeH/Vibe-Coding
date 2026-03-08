import { completeGoogleLogin } from "@/lib/auth";

export async function GET(request: Request) {
  return completeGoogleLogin(request);
}