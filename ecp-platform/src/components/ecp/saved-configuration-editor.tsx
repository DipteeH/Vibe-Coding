"use client";

import Link from "next/link";
import { useState } from "react";
import type { SavedConfigurationDetail, SavedQuoteSummary } from "@/domain/ecp/types";
import { formatCurrency, formatDateTime, formatPriceDelta } from "@/lib/utils";

interface EditorResponse extends Partial<SavedQuoteSummary> {
  message?: string;
}

async function readPayload(response: Response) {
  try {
    return (await response.json()) as EditorResponse;
  } catch {
    return {} as EditorResponse;
  }
}

export function SavedConfigurationEditor({
  detail,
  canManage,
  isAdminPreview,
}: {
  detail: SavedConfigurationDetail;
  canManage: boolean;
  isAdminPreview: boolean;
}) {
  const [summary, setSummary] = useState<SavedQuoteSummary>(detail);
  const [customerName, setCustomerName] = useState(detail.customerName);
  const [notificationEmail, setNotificationEmail] = useState(detail.notificationEmail ?? "");
  const [pathType, setPathType] = useState(detail.pathType);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  async function handleSave() {
    setIsSaving(true);
    setRequestError(null);
    setStatusMessage(null);

    try {
      const response = await fetch(`/api/saved-configurations/${detail.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          notificationEmail,
          marketCode: detail.marketCode,
          dealerCode: detail.dealerCode,
          pathType,
          configuration: detail.configuration,
        }),
      });
      const payload = await readPayload(response);

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to update the saved configuration.");
      }

      setSummary((current) => ({
        ...current,
        ...payload,
        customerName,
        notificationEmail,
        pathType,
      }));
      setStatusMessage("Saved configuration details updated successfully. A confirmation email has been sent.");
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Unable to update the saved configuration.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (typeof window !== "undefined" && !window.confirm("Delete this saved configuration? This cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    setRequestError(null);
    setStatusMessage(null);

    try {
      const response = await fetch(`/api/saved-configurations/${detail.id}`, { method: "DELETE" });
      const payload = await readPayload(response);
      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to delete the saved configuration.");
      }

      window.location.assign("/saved-configurations");
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Unable to delete the saved configuration.");
      setIsDeleting(false);
    }
  }

  return (
    <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-6">
        {isAdminPreview ? <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">Administrator preview mode. Only the owning user can update or delete this saved configuration.</div> : null}
        {requestError ? <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{requestError}</div> : null}
        {statusMessage ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{statusMessage}</div> : null}

        <article className="rounded-4xl border border-slate-200/80 bg-white/85 p-6 shadow-[0_14px_35px_rgba(148,163,184,0.12)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Configuration profile</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-900">{summary.modelCode}</h2>
              <p className="mt-2 text-sm text-slate-600">{summary.marketCode} · {summary.dealerCode} · {summary.id}</p>
            </div>
            <div className="text-right">
              <p className="text-lg font-semibold text-slate-900">{formatCurrency(summary.totalPriceCents, summary.currency)}</p>
              <p className="mt-1 text-xs text-slate-500">Updated {formatDateTime(summary.updatedAt ?? summary.createdAt)}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-700">
              Customer / account name
              <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} disabled={!canManage} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-sky-300 disabled:bg-slate-50 disabled:text-slate-500" />
            </label>
            <label className="space-y-2 text-sm text-slate-700">
              Notification email
              <input value={notificationEmail} onChange={(event) => setNotificationEmail(event.target.value)} type="email" disabled={!canManage} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-sky-300 disabled:bg-slate-50 disabled:text-slate-500" />
            </label>
            <label className="space-y-2 text-sm text-slate-700">
              Lifecycle path
              <select value={pathType} onChange={(event) => setPathType(event.target.value as typeof pathType)} disabled={!canManage} className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-sky-300 disabled:bg-slate-50 disabled:text-slate-500">
                <option value="QUOTE">Quote</option>
                <option value="ORDER">Order</option>
              </select>
            </label>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">
              <p className="font-medium text-slate-900">Owner</p>
              <p className="mt-2">{summary.ownerName ?? "Owned account"}</p>
              <p>{summary.ownerEmail ?? notificationEmail}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link href={`/?savedConfigurationId=${detail.id}`} className="rounded-full bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-700">
              Continue in configurator
            </Link>
            {canManage ? (
              <>
                <button type="button" onClick={handleSave} disabled={isSaving || isDeleting} className="rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400">
                  {isSaving ? "Saving..." : "Update saved details"}
                </button>
                <button type="button" onClick={handleDelete} disabled={isSaving || isDeleting} className="rounded-full border border-rose-200 px-4 py-2 text-sm text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400">
                  {isDeleting ? "Deleting..." : "Delete configuration"}
                </button>
              </>
            ) : null}
          </div>
        </article>

        <article className="rounded-4xl border border-slate-200/80 bg-white/85 p-6 shadow-[0_14px_35px_rgba(148,163,184,0.12)]">
          <h3 className="text-xl font-semibold text-slate-900">Selected build summary</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {detail.evaluation.selectionSummary.map((entry) => (
              <div key={entry.label} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{entry.label}</p>
                <p className="mt-2 text-sm font-medium text-slate-900">{entry.value}</p>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="space-y-6">
        <article className="rounded-4xl border border-slate-200/80 bg-white/85 p-6 shadow-[0_14px_35px_rgba(148,163,184,0.12)]">
          <h3 className="text-xl font-semibold text-slate-900">Pricing breakdown</h3>
          <div className="mt-4 space-y-3">
            {detail.evaluation.pricing.lines.map((line) => (
              <div key={line.code} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-slate-900">{line.label}</p>
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{line.kind}</p>
                </div>
                <span className="font-medium text-slate-700">{formatPriceDelta(line.amountCents, detail.evaluation.pricing.currency)}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-4xl border border-slate-200/80 bg-white/85 p-6 shadow-[0_14px_35px_rgba(148,163,184,0.12)]">
          <h3 className="text-xl font-semibold text-slate-900">Operational guidance</h3>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-700">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Compliance</p>
              <p className="mt-2 font-medium text-slate-900">{detail.evaluation.operationalSummary.complianceStatus}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-700">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Manufacturing</p>
              <p className="mt-2 font-medium text-slate-900">{detail.evaluation.operationalSummary.manufacturingStatus}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-700">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Lead time</p>
              <p className="mt-2 font-medium text-slate-900">{detail.evaluation.operationalSummary.estimatedLeadTimeWeeks} weeks</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-700">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Plant allocation</p>
              <p className="mt-2 font-medium text-slate-900">{detail.evaluation.operationalSummary.plantAllocation}</p>
            </div>
          </div>
          <ul className="mt-4 space-y-2 text-sm text-slate-600">
            {detail.evaluation.operationalSummary.notes.map((note) => (
              <li key={note} className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">{note}</li>
            ))}
          </ul>
        </article>

        <article className="rounded-4xl border border-slate-200/80 bg-white/85 p-6 shadow-[0_14px_35px_rgba(148,163,184,0.12)]">
          <h3 className="text-xl font-semibold text-slate-900">Notifications and audit trail</h3>
          <div className="mt-4 space-y-3">
            {detail.evaluation.notifications.map((notification) => (
              <div key={`${notification.severity}-${notification.title}`} className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3 text-sm text-slate-700">
                <p className="font-medium text-slate-900">{notification.title}</p>
                <p className="mt-1">{notification.message}</p>
              </div>
            ))}
            {detail.evaluation.auditTrail.map((entry) => (
              <div key={entry} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">{entry}</div>
            ))}
          </div>
        </article>
      </div>
    </section>
  );
}