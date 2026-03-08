import Link from "next/link";
import { listAllSavedConfigurations } from "@/application/ecp/platform-service";
import { prismaSavedQuoteRepository } from "@/infrastructure/repositories/saved-quote-repository";
import { listUsersForAdmin, requireAdmin } from "@/lib/auth";
import { formatCurrency, formatDateTime } from "@/lib/utils";

type AdminUser = Awaited<ReturnType<typeof listUsersForAdmin>>[number];
type AdminConfiguration = Awaited<ReturnType<typeof listAllSavedConfigurations>>[number];

export default async function AdminPage() {
  await requireAdmin("/admin");
  const [users, configurations] = await Promise.all([
    listUsersForAdmin(),
    listAllSavedConfigurations(prismaSavedQuoteRepository),
  ]);

  return (
    <main className="px-4 py-8 md:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-4xl border border-slate-200/80 bg-white/85 p-6 shadow-[0_20px_55px_rgba(148,163,184,0.18)]">
          <p className="text-xs uppercase tracking-[0.3em] text-sky-600">Administrator workspace</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Users and saved configurations</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Review account adoption, provider coverage, active sessions, and saved configuration volume across the ECP workspace.
          </p>
        </section>

        <section className="rounded-4xl border border-slate-200/80 bg-white/85 p-6 shadow-[0_14px_35px_rgba(148,163,184,0.12)]">
          <h2 className="text-xl font-semibold text-slate-900">Users</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-3 pr-4 font-medium">User</th>
                  <th className="pb-3 pr-4 font-medium">Role</th>
                  <th className="pb-3 pr-4 font-medium">Providers</th>
                  <th className="pb-3 pr-4 font-medium">Saved</th>
                  <th className="pb-3 pr-4 font-medium">Sessions</th>
                  <th className="pb-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user: AdminUser) => (
                  <tr key={user.id} className="border-t border-slate-100 text-slate-700">
                    <td className="py-3 pr-4">
                      <p className="font-medium text-slate-900">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.email ?? user.phoneNumber ?? "No primary contact"}</p>
                    </td>
                    <td className="py-3 pr-4">{user.role}</td>
                    <td className="py-3 pr-4">{user.providers.join(", ") || "—"}</td>
                    <td className="py-3 pr-4">{user.savedConfigurationCount}</td>
                    <td className="py-3 pr-4">{user.activeSessionCount}</td>
                    <td className="py-3">{formatDateTime(user.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-4xl border border-slate-200/80 bg-white/85 p-6 shadow-[0_14px_35px_rgba(148,163,184,0.12)]">
          <h2 className="text-xl font-semibold text-slate-900">Saved configurations</h2>
          <div className="mt-4 grid gap-4">
            {configurations.map((configuration: AdminConfiguration) => (
              <article key={configuration.id} className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{configuration.pathType}</p>
                    <h3 className="mt-2 text-lg font-semibold text-slate-900">{configuration.customerName}</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      Owner: {configuration.ownerName ?? "Unassigned"} · {configuration.ownerEmail ?? configuration.notificationEmail}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {configuration.modelCode} · {configuration.marketCode} · {configuration.dealerCode}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-900">
                      {formatCurrency(configuration.totalPriceCents, configuration.currency)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Updated {formatDateTime(configuration.updatedAt ?? configuration.createdAt)}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <Link
                    href={`/saved-configurations/${configuration.id}`}
                    className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:border-sky-300 hover:bg-white"
                  >
                    Open detail
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}