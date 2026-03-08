import Link from "next/link";
import { listSavedConfigurations } from "@/application/ecp/platform-service";
import { prismaSavedQuoteRepository } from "@/infrastructure/repositories/saved-quote-repository";
import { requireUser } from "@/lib/auth";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default async function SavedConfigurationsPage() {
  const user = await requireUser("/saved-configurations");
  const configurations = await listSavedConfigurations(user.id, prismaSavedQuoteRepository);

  return (
    <main className="px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-4xl border border-slate-200/80 bg-white/85 p-6 shadow-[0_20px_55px_rgba(148,163,184,0.18)]">
          <p className="text-xs uppercase tracking-[0.3em] text-sky-600">Saved workspace</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Your saved configurations</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Review, resume, and manage your quotes and orders. Open any saved configuration to update its saved metadata,
            continue editing in the configurator, or remove it.
          </p>
        </section>

        <section className="grid gap-4">
          {configurations.length === 0 ? (
            <div className="rounded-4xl border border-dashed border-slate-300 bg-white/70 p-8 text-center text-slate-500">
              No saved configurations yet. <Link href="/" className="font-medium text-sky-700">Create one from the configurator</Link>.
            </div>
          ) : (
            configurations.map((configuration) => (
              <article
                key={configuration.id}
                className="rounded-4xl border border-slate-200/80 bg-white/85 p-6 shadow-[0_14px_35px_rgba(148,163,184,0.12)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{configuration.pathType}</p>
                    <h2 className="mt-2 text-xl font-semibold text-slate-900">{configuration.customerName}</h2>
                    <p className="mt-2 text-sm text-slate-600">
                      {configuration.modelCode} · {configuration.marketCode} · {configuration.dealerCode}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">Notification email: {configuration.notificationEmail}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-slate-900">
                      {formatCurrency(configuration.totalPriceCents, configuration.currency)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Updated {formatDateTime(configuration.updatedAt ?? configuration.createdAt)}</p>
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link
                    href={`/saved-configurations/${configuration.id}`}
                    className="rounded-full bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-700"
                  >
                    Open details
                  </Link>
                  <Link
                    href={`/?savedConfigurationId=${configuration.id}`}
                    className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:border-sky-300 hover:bg-sky-50"
                  >
                    Continue in configurator
                  </Link>
                </div>
              </article>
            ))
          )}
        </section>
      </div>
    </main>
  );
}