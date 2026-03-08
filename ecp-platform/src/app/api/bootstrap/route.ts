import { NextResponse } from "next/server";
import { getBootstrapData } from "@/application/ecp/platform-service";

export function GET() {
  return NextResponse.json(getBootstrapData());
}