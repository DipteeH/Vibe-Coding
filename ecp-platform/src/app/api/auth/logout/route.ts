import { createLogoutResponse } from "@/lib/auth";

export async function POST(request: Request) {
  return createLogoutResponse(request);
}