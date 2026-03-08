import Link from "next/link";
import { redirect } from "next/navigation";
import { getSavedConfiguration } from "@/application/ecp/platform-service";
import { SavedConfigurationEditor } from "@/components/ecp/saved-configuration-editor";
import { prismaSavedQuoteRepository } from "@/infrastructure/repositories/saved-quote-repository";
import { requireUser } from "@/lib/auth";

export default async function SavedConfigurationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser("/saved-configurations");
  const { id } = await params;
  const detail = await getSavedConfiguration(id, prismaSavedQuoteRepository);

  if (!detail) {
    redirect("/saved-configurations");
  }

  const canManage = detail.ownerId === user.id;
  const canView = canManage || user.role === "ADMIN";

  if (!canView) {
    redirect("/saved-configurations");
  }

  return (
    <main className="px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Saved configuration detail</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">{detail.customerName}</h1>
          </div>
          <Link
            href="/saved-configurations"
            className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:border-sky-300 hover:bg-sky-50"
          >
            Back to saved configurations
          </Link>
        </div>

        <SavedConfigurationEditor detail={detail} canManage={canManage} isAdminPreview={user.role === "ADMIN" && !canManage} />
      </div>
    </main>
  );
}