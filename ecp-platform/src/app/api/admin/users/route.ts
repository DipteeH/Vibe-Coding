import { NextResponse } from "next/server";
import { listUsersForAdmin, requireRouteUser } from "@/lib/auth";

export async function GET() {
  const user = await requireRouteUser();
  if (!user) {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }

  if (user.role !== "ADMIN") {
    return NextResponse.json({ message: "Administrator access required." }, { status: 403 });
  }

  return NextResponse.json(await listUsersForAdmin());
}