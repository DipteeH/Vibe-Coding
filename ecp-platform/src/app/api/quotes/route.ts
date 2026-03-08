import { NextResponse } from "next/server";
import {
  listRecentQuotes,
  saveQuote,
  saveQuoteSchema,
} from "@/application/ecp/platform-service";
import { prismaSavedQuoteRepository } from "@/infrastructure/repositories/saved-quote-repository";
import { requireRouteUser } from "@/lib/auth";
import { sendConfigurationConfirmationEmail } from "@/lib/notifications";

export async function GET() {
  try {
    return NextResponse.json(await listRecentQuotes(prismaSavedQuoteRepository));
  } catch {
    return NextResponse.json(
      {
        message: "Unable to load recent quotes.",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const user = await requireRouteUser();
  if (!user) {
    return NextResponse.json({ message: "Authentication required.", loginUrl: "/login?returnTo=%2F%3Fresume%3Dsave" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = saveQuoteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Invalid quote payload.",
          issues: parsed.error.flatten(),
        },
        { status: 400 },
      );
    }

    const saved = await saveQuote(parsed.data, prismaSavedQuoteRepository, user.id);
    await sendConfigurationConfirmationEmail({ action: "created", summary: saved });
    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save quote.";
    return NextResponse.json({ message }, { status: 500 });
  }
}