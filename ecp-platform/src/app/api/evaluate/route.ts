import { NextResponse } from "next/server";
import { evaluateRequestSchema, evaluateSelection } from "@/application/ecp/platform-service";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = evaluateRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Invalid evaluation request.",
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    return NextResponse.json(evaluateSelection(parsed.data));
  } catch {
    return NextResponse.json(
      {
        message: "Unable to evaluate configuration.",
      },
      { status: 500 },
    );
  }
}