import { NextResponse } from "next/server";
import {
  deleteSavedConfiguration,
  getSavedConfiguration,
  saveQuoteSchema,
  updateSavedConfiguration,
} from "@/application/ecp/platform-service";
import { prismaSavedQuoteRepository } from "@/infrastructure/repositories/saved-quote-repository";
import { requireRouteUser } from "@/lib/auth";
import { sendConfigurationConfirmationEmail } from "@/lib/notifications";

function forbiddenResponse() {
  return NextResponse.json({ message: "Saved configuration not found." }, { status: 404 });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireRouteUser();
  if (!user) {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }

  const { id } = await params;
  const detail = await getSavedConfiguration(id, prismaSavedQuoteRepository);
  if (!detail) {
    return forbiddenResponse();
  }

  if (detail.ownerId !== user.id && user.role !== "ADMIN") {
    return forbiddenResponse();
  }

  return NextResponse.json(detail);
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireRouteUser();
  if (!user) {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = saveQuoteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid quote payload.", issues: parsed.error.flatten() }, { status: 400 });
    }

    const { id } = await params;
    const saved = await updateSavedConfiguration(id, user.id, parsed.data, prismaSavedQuoteRepository);
    await sendConfigurationConfirmationEmail({ action: "updated", summary: saved });
    return NextResponse.json(saved);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to update configuration.";
    const status = message === "Saved configuration not found." ? 404 : 500;
    return NextResponse.json({ message }, { status });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireRouteUser();
  if (!user) {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }

  try {
    const { id } = await params;
    await deleteSavedConfiguration(id, prismaSavedQuoteRepository, user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to delete configuration.";
    const status = message === "Saved configuration not found." ? 404 : 500;
    return NextResponse.json({ message }, { status });
  }
}