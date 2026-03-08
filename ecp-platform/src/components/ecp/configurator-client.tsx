"use client";

import {
  ArrowRight,
  BadgeDollarSign,
  CarFront,
  CircleAlert,
  CircleCheckBig,
  Cog,
  Factory,
  Flag,
  Gauge,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { SessionSummary } from "@/domain/auth/types";
import type {
  BootstrapData,
  ConfigurationState,
  EvaluationResult,
  PathType,
  SavedConfigurationDetail,
  SavedQuoteSummary,
  SelectableOptionView,
} from "@/domain/ecp/types";
import {
  cn,
  formatCurrency,
  formatDateTime,
  formatPriceDelta,
  titleCase,
} from "@/lib/utils";

const createEmptyConfiguration = (): ConfigurationState => ({
  packageCodes: [],
});

const DRAFT_STORAGE_KEY = "ecp_configurator_draft_v1";

type SingleSelectKey = Exclude<keyof ConfigurationState, "packageCodes">;

interface ConfiguratorDraft {
  marketCode: string;
  dealerCode: string;
  pathType: PathType;
  customerName: string;
  notificationEmail: string;
  configuration: ConfigurationState;
  editingSavedConfigurationId: string | null;
}

interface ConfiguratorClientProps {
  bootstrapData: BootstrapData;
  session: SessionSummary;
}

const ANONYMOUS_SESSION: SessionSummary = { user: null };

function readSearchParams() {
  if (typeof window === "undefined") {
    return new URLSearchParams();
  }

  return new URLSearchParams(window.location.search);
}

function readDraft() {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(DRAFT_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as ConfiguratorDraft;
  } catch {
    return null;
  }
}

function writeDraft(draft: ConfiguratorDraft) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
}

function clearDraft() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(DRAFT_STORAGE_KEY);
}

function mergeRecentQuotes(current: SavedQuoteSummary[], saved: SavedQuoteSummary) {
  return [saved, ...current.filter((entry) => entry.id !== saved.id)].slice(0, 8);
}

export function ConfiguratorClient({ bootstrapData, session = ANONYMOUS_SESSION }: ConfiguratorClientProps) {
  const [marketCode, setMarketCode] = useState(bootstrapData.defaultMarketCode);
  const [dealerCode, setDealerCode] = useState(bootstrapData.defaultDealerCode);
  const [pathType, setPathType] = useState<PathType>("QUOTE");
  const [customerName, setCustomerName] = useState(session.user?.name ?? "Diptee Demo");
  const [notificationEmail, setNotificationEmail] = useState(session.user?.email ?? "");
  const [configuration, setConfiguration] = useState<ConfigurationState>(createEmptyConfiguration);
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [recentQuotes, setRecentQuotes] = useState<SavedQuoteSummary[]>([]);
  const [activeStep, setActiveStep] = useState(0);
  const [editingSavedConfigurationId, setEditingSavedConfigurationId] = useState<string | null>(null);
  const [isHydratingConfiguration, setIsHydratingConfiguration] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const configurationKey = useMemo(() => JSON.stringify(configuration), [configuration]);
  const selectedMarket = useMemo(
    () => bootstrapData.markets.find((market) => market.code === marketCode),
    [bootstrapData.markets, marketCode],
  );
  const selectedModel = useMemo(
    () => bootstrapData.models.find((model) => model.code === configuration.modelCode),
    [bootstrapData.models, configuration.modelCode],
  );

  useEffect(() => {
    if (session.user?.email && !notificationEmail) {
      setNotificationEmail(session.user.email);
    }

    if (session.user?.name && customerName === "Diptee Demo") {
      setCustomerName(session.user.name);
    }
  }, [customerName, notificationEmail, session.user]);

  useEffect(() => {
    let cancelled = false;

    const loadRecentQuotes = async () => {
      try {
        const response = await fetch("/api/quotes", { cache: "no-store" });
        if (!response.ok) throw new Error("Unable to load recent quotes.");
        const data = (await response.json()) as SavedQuoteSummary[];
        if (!cancelled) {
          setRecentQuotes(data);
        }
      } catch {
        if (!cancelled) {
          setRecentQuotes([]);
        }
      }
    };

    void loadRecentQuotes();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const hydrateExistingConfiguration = async (savedConfigurationId: string) => {
      if (!session.user) {
        window.location.assign(`/login?returnTo=${encodeURIComponent(`/?savedConfigurationId=${savedConfigurationId}`)}`);
        return;
      }

      setIsHydratingConfiguration(true);
      setRequestError(null);

      try {
        const response = await fetch(`/api/saved-configurations/${savedConfigurationId}`, { cache: "no-store" });
        const payload = (await response.json()) as SavedConfigurationDetail & {
          message?: string;
          loginUrl?: string;
        };

        if (response.status === 401 && payload.loginUrl) {
          window.location.assign(payload.loginUrl);
          return;
        }

        if (!response.ok) {
          throw new Error(payload.message ?? "Unable to load the saved configuration.");
        }

        if (cancelled) {
          return;
        }

        setMarketCode(payload.marketCode);
        setDealerCode(payload.dealerCode);
        setPathType(payload.pathType);
        setCustomerName(payload.customerName);
        setNotificationEmail(payload.notificationEmail ?? session.user.email ?? "");
        setConfiguration(payload.configuration);
        setEvaluation(payload.evaluation);
        setEditingSavedConfigurationId(payload.id);
        setActiveStep(8);
        setStatusMessage(`Loaded ${payload.customerName}. You can continue editing and update the saved configuration.`);
      } catch (error) {
        if (!cancelled) {
          setRequestError(error instanceof Error ? error.message : "Unable to load the saved configuration.");
        }
      } finally {
        if (!cancelled) {
          setIsHydratingConfiguration(false);
        }
      }
    };

    const searchParams = readSearchParams();
    const savedConfigurationId = searchParams.get("savedConfigurationId");
    const resume = searchParams.get("resume");

    if (savedConfigurationId) {
      void hydrateExistingConfiguration(savedConfigurationId);
      return () => {
        cancelled = true;
      };
    }

    if (resume === "save") {
      const draft = readDraft();
      if (draft) {
        setMarketCode(draft.marketCode);
        setDealerCode(draft.dealerCode);
        setPathType(draft.pathType);
        setCustomerName(draft.customerName);
        setNotificationEmail(draft.notificationEmail || session.user?.email || "");
        setConfiguration(draft.configuration);
        setEditingSavedConfigurationId(draft.editingSavedConfigurationId);
        setActiveStep(8);
        setStatusMessage(
          session.user
            ? "Your draft has been restored after sign-in. Review and save when ready."
            : "Your draft has been restored.",
        );
      }
    }

    return () => {
      cancelled = true;
    };
  }, [session.user]);

  useEffect(() => {
    let cancelled = false;
    const requestConfiguration = JSON.parse(configurationKey) as ConfigurationState;

    const evaluate = async () => {
      setIsEvaluating(true);
      setRequestError(null);

      try {
        const response = await fetch("/api/evaluate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            marketCode,
            dealerCode,
            configuration: requestConfiguration,
          }),
        });

        if (!response.ok) {
          const errorPayload = (await response.json()) as { message?: string };
          throw new Error(errorPayload.message ?? "Evaluation failed.");
        }

        const data = (await response.json()) as EvaluationResult;
        if (!cancelled) {
          setEvaluation(data);
          setConfiguration(data.configuration);
        }
      } catch (error) {
        if (!cancelled) {
          setRequestError(error instanceof Error ? error.message : "Evaluation failed.");
        }
      } finally {
        if (!cancelled) {
          setIsEvaluating(false);
        }
      }
    };

    void evaluate();
    return () => {
      cancelled = true;
    };
  }, [configurationKey, dealerCode, marketCode]);

  const setSingleSelection = (key: SingleSelectKey, value: string) => {
    setStatusMessage(null);
    setRequestError(null);
    setConfiguration((current) => ({
      ...current,
      [key]: value,
    }));
  };

  const handleModelSelect = (modelCode: string) => {
    setStatusMessage(null);
    setRequestError(null);
    setConfiguration({ modelCode, packageCodes: [] });
    setActiveStep(1);
  };

  const togglePackage = (packageCode: string) => {
    setStatusMessage(null);
    setRequestError(null);
    setConfiguration((current) => ({
      ...current,
      packageCodes: current.packageCodes.includes(packageCode)
        ? current.packageCodes.filter((code) => code !== packageCode)
        : [...current.packageCodes, packageCode],
    }));
  };

  const handleSave = async () => {
    if (!session.user) {
      writeDraft({
        marketCode,
        dealerCode,
        pathType,
        customerName,
        notificationEmail,
        configuration,
        editingSavedConfigurationId,
      });
      window.location.assign(`/login?returnTo=${encodeURIComponent("/?resume=save")}`);
      return;
    }

    if (!customerName.trim()) {
      setRequestError("Enter a customer or account name before saving.");
      setActiveStep(8);
      return;
    }

    if (!notificationEmail.trim()) {
      setRequestError("Enter a notification email before saving.");
      setActiveStep(8);
      return;
    }

    setIsSaving(true);
    setRequestError(null);
    setStatusMessage(null);

    try {
      const isEditing = Boolean(editingSavedConfigurationId);
      const response = await fetch(editingSavedConfigurationId ? `/api/saved-configurations/${editingSavedConfigurationId}` : "/api/saved-configurations", {
        method: editingSavedConfigurationId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customerName,
          notificationEmail,
          marketCode,
          dealerCode,
          pathType,
          configuration,
        }),
      });

      const payload = (await response.json()) as SavedQuoteSummary & { message?: string; loginUrl?: string };
      if (response.status === 401 && payload.loginUrl) {
        writeDraft({
          marketCode,
          dealerCode,
          pathType,
          customerName,
          notificationEmail,
          configuration,
          editingSavedConfigurationId,
        });
        window.location.assign(payload.loginUrl);
        return;
      }

      if (!response.ok) {
        throw new Error(payload.message ?? "Unable to save quote.");
      }

      clearDraft();
      setEditingSavedConfigurationId(payload.id);
      setRecentQuotes((current) => mergeRecentQuotes(current, payload));
      setStatusMessage(
        `${pathType === "ORDER" ? "Order" : "Quote"} ${isEditing ? "updated" : "saved"} successfully for ${payload.customerName}.`,
      );
      if (typeof window !== "undefined") {
        window.history.replaceState({}, "", `/?savedConfigurationId=${payload.id}`);
      }
      setActiveStep(8);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Unable to save quote.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetConfiguration = () => {
    setStatusMessage(null);
    setRequestError(null);
    setPathType("QUOTE");
    setEvaluation(null);
    setEditingSavedConfigurationId(null);
    setConfiguration(createEmptyConfiguration());
    setCustomerName(session.user?.name ?? "Diptee Demo");
    setNotificationEmail(session.user?.email ?? "");
    clearDraft();
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", "/");
    }
    setActiveStep(0);
  };

  const canAdvance = activeStep === 0 ? Boolean(configuration.modelCode) : true;

  const renderCurrentStep = () => {
    switch (activeStep) {
      case 0:
        return (
          <section className="grid gap-4 md:grid-cols-3">
            {bootstrapData.models.map((model) => {
              const selected = configuration.modelCode === model.code;
              return (
                <button
                  key={model.code}
                  type="button"
                  onClick={() => handleModelSelect(model.code)}
                  className={cn(
                    "group overflow-hidden rounded-[2rem] border p-5 text-left transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_55px_rgba(148,163,184,0.28)]",
                    selected
                      ? "border-sky-300 bg-white shadow-[0_18px_50px_rgba(59,130,246,0.16)]"
                      : "border-slate-200/80 bg-white/85 hover:border-sky-200 hover:bg-white",
                  )}
                >
                  <div className="mb-5 rounded-[1.6rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(239,246,255,0.9))] p-4 shadow-inner shadow-slate-200/70">
                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-slate-500">
                        {model.bodyStyle}
                      </span>
                      <span className="rounded-full border border-sky-200 bg-sky-50 p-2 text-sky-700">
                        <CarFront className="h-4 w-4" />
                      </span>
                    </div>
                    <div className="mt-4 overflow-hidden rounded-[1.3rem] border border-slate-200 bg-[radial-gradient(circle_at_20%_15%,rgba(191,219,254,0.6),transparent_30%),radial-gradient(circle_at_80%_20%,rgba(167,243,208,0.5),transparent_35%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(226,232,240,0.9))]">
                      <div
                        role="img"
                        aria-label={`${model.label} vehicle artwork`}
                        className="aspect-[16/9] w-full bg-cover bg-center bg-no-repeat transition duration-500 group-hover:scale-[1.03]"
                        style={{ backgroundImage: `url(${model.imagePath})` }}
                      />
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900">{model.label}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{model.description}</p>
                  <div className="mt-4 space-y-3 text-sm text-slate-600">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs text-sky-700">
                        {model.heroStat}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                        {model.plantAllocation}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-900">
                      Starting at {formatCurrency(model.basePriceCents, selectedMarket?.currency ?? "USD")}
                    </p>
                  </div>
                </button>
              );
            })}
          </section>
        );
      case 1:
        return (
          <OptionGrid
            title="Powertrain selection"
            description="Model, market, and dealer constraints are applied in real time."
            currency={evaluation?.pricing.currency ?? "USD"}
            options={evaluation?.availability.engines ?? []}
            onSelect={(option) => setSingleSelection("engineCode", option.code)}
          />
        );
      case 2:
        return (
          <OptionGrid
            title="Transmission"
            description="Electric builds auto-lock to compatible transmission logic."
            currency={evaluation?.pricing.currency ?? "USD"}
            options={evaluation?.availability.transmissions ?? []}
            onSelect={(option) => setSingleSelection("transmissionCode", option.code)}
          />
        );
      case 3:
        return (
          <OptionGrid
            title="Trim strategy"
            description="Trim defaults can automatically seed dependent selections."
            currency={evaluation?.pricing.currency ?? "USD"}
            options={evaluation?.availability.trims ?? []}
            onSelect={(option) => setSingleSelection("trimCode", option.code)}
          />
        );
      case 4:
        return (
          <div className="space-y-6">
            <OptionGrid
              title="Exterior color"
              description="Metallic paint and market constraints are enforced live."
              currency={evaluation?.pricing.currency ?? "USD"}
              options={evaluation?.availability.exteriorColors ?? []}
              onSelect={(option) => setSingleSelection("exteriorColorCode", option.code)}
            />
            <OptionGrid
              title="Roof"
              description="Panoramic and carbon roof availability is model-aware."
              currency={evaluation?.pricing.currency ?? "USD"}
              options={evaluation?.availability.roofs ?? []}
              onSelect={(option) => setSingleSelection("roofCode", option.code)}
            />
            <OptionGrid
              title="Body package"
              description="Functional and premium exterior packages adapt to selected roof and trim."
              currency={evaluation?.pricing.currency ?? "USD"}
              options={evaluation?.availability.bodyKits ?? []}
              onSelect={(option) => setSingleSelection("bodyKitCode", option.code)}
            />
          </div>
        );
      case 5:
        return (
          <div className="space-y-6">
            <OptionGrid
              title="Interior material"
              description="Seat materials are filtered by trim and regional offering."
              currency={evaluation?.pricing.currency ?? "USD"}
              options={evaluation?.availability.interiorMaterials ?? []}
              onSelect={(option) => setSingleSelection("interiorMaterialCode", option.code)}
            />
            <OptionGrid
              title="Interior color"
              description="Premium interior tones and performance palettes validate automatically."
              currency={evaluation?.pricing.currency ?? "USD"}
              options={evaluation?.availability.interiorColors ?? []}
              onSelect={(option) => setSingleSelection("interiorColorCode", option.code)}
            />
            <OptionGrid
              title="Dashboard finish"
              description="Tech, sport, and executive cabin finishes map to trim intent."
              currency={evaluation?.pricing.currency ?? "USD"}
              options={evaluation?.availability.dashboardFinishes ?? []}
              onSelect={(option) => setSingleSelection("dashboardFinishCode", option.code)}
            />
          </div>
        );
      case 6:
        return (
          <OptionGrid
            title="Wheel package"
            description="Drivetrain and compliance rules shape wheel feasibility."
            currency={evaluation?.pricing.currency ?? "USD"}
            options={evaluation?.availability.wheels ?? []}
            onSelect={(option) => setSingleSelection("wheelCode", option.code)}
          />
        );
      case 7:
        return (
          <OptionGrid
            title="Optional packages"
            description="Bundle dependencies are validated by engine, trim, region, and wheel choice."
            currency={evaluation?.pricing.currency ?? "USD"}
            options={evaluation?.availability.packages ?? []}
            onSelect={(option) => togglePackage(option.code)}
          />
        );
      case 8:
        return (
          <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-[0_14px_40px_rgba(148,163,184,0.16)]">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">Review and save</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Capture this configuration as a quote for exploration or promote it to an order for production commitment.
                </p>
                  {editingSavedConfigurationId ? (
                    <p className="mt-3 inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs uppercase tracking-[0.2em] text-sky-700">
                      Editing saved configuration
                    </p>
                  ) : null}
              </div>
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                Total: {formatCurrency(evaluation?.pricing.totalCents ?? 0, evaluation?.pricing.currency ?? "USD")}
              </div>
            </div>

              <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">
                {session.user ? (
                  <p>
                    Signed in as <span className="font-medium text-slate-900">{session.user.name}</span>. This save will be attached to your account and available in the saved configurations workspace.
                  </p>
                ) : (
                  <p>
                    Save requires sign-in. If you continue, your draft will be preserved and you&apos;ll return here after authentication.
                  </p>
                )}
              </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {(evaluation?.selectionSummary ?? []).map((entry) => (
                <div key={entry.label} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{entry.label}</p>
                  <p className="mt-2 text-sm font-medium text-slate-800">{entry.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-[1.2fr_1fr_1fr]">
              <label className="space-y-2 text-sm text-slate-700">
                Customer / account name
                <input
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none ring-0 transition placeholder:text-slate-400 focus:border-sky-300"
                  placeholder="Fleet account, dealer lead, or executive customer"
                />
              </label>
              <label className="space-y-2 text-sm text-slate-700">
                Notification email
                <input
                  type="email"
                  value={notificationEmail}
                  onChange={(event) => setNotificationEmail(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none ring-0 transition placeholder:text-slate-400 focus:border-sky-300"
                  placeholder="notifications@customer.example"
                />
              </label>
              <label className="space-y-2 text-sm text-slate-700">
                Lifecycle path
                <select
                  value={pathType}
                  onChange={(event) => setPathType(event.target.value as PathType)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-sky-300"
                >
                  <option value="QUOTE">Quote path</option>
                  <option value="ORDER">Order path</option>
                </select>
              </label>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleSave}
                disabled={!configuration.modelCode || isSaving}
                className="rounded-full bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
              >
                {isSaving
                  ? "Saving..."
                  : editingSavedConfigurationId
                    ? "Update saved configuration"
                    : pathType === "ORDER"
                      ? "Promote to order"
                      : "Save quote"}
              </button>
              <button
                type="button"
                onClick={handleResetConfiguration}
                className="rounded-full border border-slate-300 px-5 py-3 text-sm text-slate-700 transition hover:border-sky-300 hover:bg-sky-50"
              >
                Start a new configuration
              </button>
            </div>
          </section>
        );
      default:
        return null;
    }
  };

  return (
    <main className="min-h-screen bg-transparent px-4 py-8 text-slate-800 md:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-4xl border border-slate-200/80 bg-white/80 p-6 shadow-[0_24px_70px_rgba(148,163,184,0.18)] backdrop-blur-xl lg:p-8">
          <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm text-sky-700 shadow-lg shadow-sky-100/80">
                <Sparkles className="h-4 w-4" />
                Enterprise Car Configuration Platform
              </div>
              <div>
                <h1 className="text-4xl font-semibold tracking-tight text-slate-900 lg:text-5xl">
                  Production-aware vehicle configuration for quote and order workflows.
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 lg:text-lg">
                  Configure model, powertrain, trim, finishes, wheels, and packages with live pricing,
                  dealer and market constraints, regulatory rules, and manufacturing feasibility checks.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <HeroStat icon={Gauge} label="Rules engine" value={evaluation?.metadata.rulesetVersion ?? "Ready"} />
                <HeroStat
                  icon={BadgeDollarSign}
                  label="Current total"
                  value={formatCurrency(evaluation?.pricing.totalCents ?? 0, evaluation?.pricing.currency ?? "USD")}
                />
                <HeroStat icon={Factory} label="Plant allocation" value={selectedModel?.plantAllocation ?? "Awaiting model"} />
              </div>
            </div>

            <section className="rounded-[1.75rem] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(248,250,252,0.9),rgba(255,255,255,0.96))] p-5 shadow-inner shadow-slate-100">
              <h2 className="text-lg font-semibold text-slate-900">Commercial context</h2>
              <div className="mt-4 grid gap-4">
                <label className="space-y-2 text-sm text-slate-700">
                  Market
                  <select
                    value={marketCode}
                    onChange={(event) => setMarketCode(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-sky-300"
                  >
                    {bootstrapData.markets.map((market) => (
                      <option key={market.code} value={market.code}>
                        {market.label} · {market.currency}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-sm text-slate-700">
                  Dealer channel
                  <select
                    value={dealerCode}
                    onChange={(event) => setDealerCode(event.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-sky-300"
                  >
                    {bootstrapData.dealers.map((dealer) => (
                      <option key={dealer.code} value={dealer.code}>
                        {dealer.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-sm text-slate-700">
                  Lifecycle path
                  <select
                    value={pathType}
                    onChange={(event) => setPathType(event.target.value as PathType)}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-800 outline-none transition focus:border-sky-300"
                  >
                    <option value="QUOTE">Quote path</option>
                    <option value="ORDER">Order path</option>
                  </select>
                </label>
              </div>
            </section>
          </div>
        </section>

        <section className="grid gap-8 xl:grid-cols-[1.35fr_0.65fr]">
          <div className="space-y-6">
            <div className="rounded-4xl border border-slate-200/80 bg-white/80 p-5 backdrop-blur-xl shadow-[0_12px_32px_rgba(148,163,184,0.14)]">
              <div className="flex flex-wrap items-center gap-2">
                {bootstrapData.stepLabels.map((label, index) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => {
                      if (index === 0 || configuration.modelCode) {
                        setActiveStep(index);
                      }
                    }}
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm transition duration-200",
                      index === activeStep
                        ? "border-sky-300 bg-sky-50 text-sky-700 shadow-lg shadow-sky-100/80"
                        : "border-slate-200 bg-slate-50/80 text-slate-600 hover:border-sky-200 hover:text-slate-900",
                      index > 0 && !configuration.modelCode && "cursor-not-allowed opacity-50",
                    )}
                  >
                    {index + 1}. {label}
                  </button>
                ))}
              </div>
            </div>

            {requestError ? <InlineAlert tone="error" message={requestError} /> : null}
            {statusMessage ? <InlineAlert tone="success" message={statusMessage} /> : null}
            {isHydratingConfiguration ? (
              <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
                Loading saved configuration into the configurator...
              </div>
            ) : null}

            <section className="rounded-4xl border border-slate-200/80 bg-white/85 p-6 backdrop-blur-xl shadow-[0_16px_40px_rgba(148,163,184,0.16)]">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Step {activeStep + 1}</p>
                  <h2 className="mt-1 text-2xl font-semibold text-slate-900">
                    {bootstrapData.stepLabels[activeStep]}
                  </h2>
                </div>
                {isEvaluating ? (
                  <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
                    Re-evaluating rules and pricing...
                  </div>
                ) : null}
              </div>
              {renderCurrentStep()}
            </section>

            <div className="flex items-center justify-between gap-3 rounded-4xl border border-slate-200/80 bg-white/85 p-5 backdrop-blur-xl shadow-[0_12px_28px_rgba(148,163,184,0.14)]">
              <button
                type="button"
                onClick={() => setActiveStep((current) => Math.max(0, current - 1))}
                disabled={activeStep === 0}
                className="rounded-full border border-slate-300 px-5 py-3 text-sm text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setActiveStep((current) => Math.min(8, current + 1))}
                disabled={activeStep === 8 || !canAdvance}
                className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
              >
                Continue
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <aside className="space-y-6">
            <SidebarCard title="Pricing overview" icon={BadgeDollarSign}>
              <div className="space-y-3">
                {(evaluation?.pricing.lines ?? []).map((line) => (
                  <div key={line.code} className="flex items-start justify-between gap-3 text-sm">
                    <span className="text-slate-600">{line.label}</span>
                    <span className="font-medium text-slate-900">
                      {formatCurrency(line.amountCents, evaluation?.pricing.currency ?? "USD")}
                    </span>
                  </div>
                ))}
                <div className="border-t border-slate-200 pt-3">
                  <div className="flex items-center justify-between text-base font-semibold text-slate-900">
                    <span>Total</span>
                    <span>{formatCurrency(evaluation?.pricing.totalCents ?? 0, evaluation?.pricing.currency ?? "USD")}</span>
                  </div>
                </div>
              </div>
            </SidebarCard>

            <SidebarCard title="Operational summary" icon={Factory}>
              <StatusRow label="Compliance" value={titleCase(evaluation?.operationalSummary.complianceStatus ?? "compliant")} />
              <StatusRow label="Manufacturing" value={titleCase(evaluation?.operationalSummary.manufacturingStatus ?? "feasible")} />
              <StatusRow
                label="Lead time"
                value={`${evaluation?.operationalSummary.estimatedLeadTimeWeeks ?? 0} weeks`}
              />
              <StatusRow label="Plant" value={evaluation?.operationalSummary.plantAllocation ?? "Awaiting model"} />
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                {(evaluation?.operationalSummary.notes ?? []).map((note) => (
                  <p key={note} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
                    {note}
                  </p>
                ))}
              </div>
            </SidebarCard>

            <SidebarCard title="Notifications and audit" icon={ShieldCheck}>
              <div className="space-y-3">
                {(evaluation?.notifications ?? []).map((note) => (
                  <div key={`${note.title}-${note.message}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-sm font-medium text-slate-900">{note.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{note.message}</p>
                  </div>
                ))}
                {(evaluation?.auditTrail ?? []).map((item) => (
                  <p key={item} className="text-sm text-slate-500">
                    • {item}
                  </p>
                ))}
              </div>
            </SidebarCard>

            <SidebarCard title="Recent quotes" icon={Flag}>
              <div className="space-y-3">
                {recentQuotes.length === 0 ? (
                  <p className="text-sm text-slate-500">Saved quotes and orders will appear here after the first persistence action.</p>
                ) : (
                  recentQuotes.map((quote) => (
                    <div key={quote.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{quote.customerName}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {quote.modelCode} · {quote.pathType}
                          </p>
                        </div>
                        <p className="text-sm font-semibold text-slate-900">
                          {formatCurrency(quote.totalPriceCents, quote.currency)}
                        </p>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">{formatDateTime(quote.createdAt)}</p>
                    </div>
                  ))
                )}
              </div>
            </SidebarCard>
          </aside>
        </section>
      </div>
    </main>
  );
}

function HeroStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Gauge;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(241,245,249,0.92))] p-4 shadow-inner shadow-slate-100">
      <Icon className="h-5 w-5 text-sky-600" />
      <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-slate-900">{value}</p>
    </div>
  );
}

function OptionGrid({
  title,
  description,
  options,
  currency,
  onSelect,
}: {
  title: string;
  description: string;
  options: SelectableOptionView[];
  currency: string;
  onSelect: (option: SelectableOptionView) => void;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </div>
      {options.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-sm text-slate-500">
          Select the preceding required steps to unlock this configuration area.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {options.map((option) => (
            <button
              key={option.code}
              type="button"
              disabled={option.disabled}
              onClick={() => onSelect(option)}
              className={cn(
                "rounded-3xl border p-4 text-left transition duration-200",
                option.selected
                  ? "border-sky-300 bg-sky-50 shadow-[0_14px_35px_rgba(59,130,246,0.12)]"
                  : "border-slate-200 bg-white/85 hover:border-sky-200 hover:bg-white",
                option.disabled && "cursor-not-allowed border-slate-200 bg-slate-100 opacity-50",
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-slate-900">{option.label}</p>
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                  {formatPriceDelta(option.priceDeltaCents, currency)}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-600">{option.description}</p>
              {option.badge ? (
                <p className="mt-3 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
                  {option.badge}
                </p>
              ) : null}
              {option.tags?.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {option.tags.map((tag) => (
                    <span key={tag} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function SidebarCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Cog;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-4xl border border-slate-200/80 bg-white/85 p-5 backdrop-blur-xl shadow-[0_16px_40px_rgba(148,163,184,0.16)]">
      <div className="mb-4 flex items-center gap-3">
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-2">
          <Icon className="h-5 w-5 text-sky-700" />
        </div>
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}

function InlineAlert({ tone, message }: { tone: "error" | "success"; message: string }) {
  const Icon = tone === "error" ? CircleAlert : CircleCheckBig;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm",
        tone === "error"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700",
      )}
    >
      <Icon className="h-5 w-5" />
      <span>{message}</span>
    </div>
  );
}