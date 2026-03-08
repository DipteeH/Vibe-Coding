export type NotificationSeverity = "info" | "warning" | "error";
export type PathType = "QUOTE" | "ORDER";
export type ComplianceStatus = "compliant" | "review-required";
export type ManufacturingStatus = "feasible" | "capacity-constrained";
export type PriceLineKind = "base" | "option" | "adjustment" | "incentive";

export interface ConfigurationState {
  modelCode?: string;
  engineCode?: string;
  transmissionCode?: string;
  trimCode?: string;
  exteriorColorCode?: string;
  roofCode?: string;
  bodyKitCode?: string;
  interiorMaterialCode?: string;
  interiorColorCode?: string;
  dashboardFinishCode?: string;
  wheelCode?: string;
  packageCodes: string[];
}

export interface SelectableOptionView {
  code: string;
  label: string;
  description: string;
  priceDeltaCents: number;
  selected: boolean;
  disabled: boolean;
  reason?: string;
  badge?: string;
  tags?: string[];
}

export interface NotificationMessage {
  severity: NotificationSeverity;
  title: string;
  message: string;
}

export interface PriceLine {
  code: string;
  label: string;
  amountCents: number;
  kind: PriceLineKind;
}

export interface PriceBreakdown {
  currency: string;
  subtotalCents: number;
  adjustmentsCents: number;
  incentivesCents: number;
  totalCents: number;
  lines: PriceLine[];
}

export interface EvaluationMetadata {
  modelVersion?: string;
  rulesetVersion?: string;
  pricingVersion?: string;
  evaluationLatencyMs: number;
}

export interface SelectionSummaryEntry {
  label: string;
  value: string;
}

export interface OperationalSummary {
  complianceStatus: ComplianceStatus;
  manufacturingStatus: ManufacturingStatus;
  estimatedLeadTimeWeeks: number;
  plantAllocation: string;
  notes: string[];
}

export interface EvaluationResult {
  configuration: ConfigurationState;
  availability: {
    engines: SelectableOptionView[];
    transmissions: SelectableOptionView[];
    trims: SelectableOptionView[];
    exteriorColors: SelectableOptionView[];
    roofs: SelectableOptionView[];
    bodyKits: SelectableOptionView[];
    interiorMaterials: SelectableOptionView[];
    interiorColors: SelectableOptionView[];
    dashboardFinishes: SelectableOptionView[];
    wheels: SelectableOptionView[];
    packages: SelectableOptionView[];
  };
  pricing: PriceBreakdown;
  notifications: NotificationMessage[];
  auditTrail: string[];
  metadata: EvaluationMetadata;
  operationalSummary: OperationalSummary;
  selectionSummary: SelectionSummaryEntry[];
}

export interface MarketDefinition {
  code: string;
  label: string;
  description: string;
  currency: string;
  fxRateBasisPoints: number;
  dieselRestricted: boolean;
  evIncentiveCents: number;
  luxuryTaxThresholdCents: number;
  luxuryTaxRateBasisPoints: number;
}

export interface DealerDefinition {
  code: string;
  label: string;
  description: string;
  markupCents: number;
  restrictedEngineCodes?: string[];
  sportIncentiveCents?: number;
  luxuryIncentiveCents?: number;
}

export interface BaseOptionDefinition {
  code: string;
  label: string;
  description: string;
  priceDeltaCents: number;
  tags?: string[];
  badge?: string;
}

export interface EngineDefinition extends BaseOptionDefinition {
  compatibleModelCodes: string[];
  powertrain: "gasoline" | "diesel" | "hybrid" | "electric";
  drivetrain: "FWD" | "RWD" | "AWD";
}

export interface TransmissionDefinition extends BaseOptionDefinition {
  compatibleModelCodes: string[];
}

export interface TrimDefinition extends BaseOptionDefinition {
  compatibleModelCodes: string[];
  defaultSelections: Partial<ConfigurationState>;
  includedFeatureLabels: string[];
}

export interface SimpleOptionDefinition extends BaseOptionDefinition {
  compatibleModelCodes: string[];
}

export interface PackageDefinition extends BaseOptionDefinition {
  compatibleModelCodes: string[];
  includedFeatureLabels: string[];
}

export interface ModelDefinition {
  code: string;
  label: string;
  bodyStyle: string;
  description: string;
  heroStat: string;
  basePriceCents: number;
  imagePath: string;
  modelVersion: string;
  rulesetVersion: string;
  pricingVersion: string;
  plantAllocation: string;
  engineCodes: string[];
  transmissionCodes: string[];
  trimCodes: string[];
  exteriorColorCodes: string[];
  roofCodes: string[];
  bodyKitCodes: string[];
  interiorMaterialCodes: string[];
  interiorColorCodes: string[];
  dashboardFinishCodes: string[];
  wheelCodes: string[];
  packageCodes: string[];
}

export interface BootstrapData {
  markets: Pick<MarketDefinition, "code" | "label" | "description" | "currency">[];
  dealers: Pick<DealerDefinition, "code" | "label" | "description">[];
  models: Array<
    Pick<ModelDefinition, "code" | "label" | "bodyStyle" | "description" | "heroStat" | "plantAllocation" | "imagePath"> & {
      basePriceCents: number;
    }
  >;
  defaultMarketCode: string;
  defaultDealerCode: string;
  stepLabels: string[];
}

export interface SavedQuoteSummary {
  id: string;
  ownerId?: string | null;
  ownerName?: string | null;
  ownerEmail?: string | null;
  customerName: string;
  notificationEmail?: string;
  modelCode: string;
  marketCode: string;
  dealerCode: string;
  pathType: PathType;
  currency: string;
  totalPriceCents: number;
  complianceStatus: string;
  manufacturingState: string;
  createdAt: string;
  updatedAt?: string;
}

export interface SavedConfigurationDetail extends SavedQuoteSummary {
  configuration: ConfigurationState;
  evaluation: EvaluationResult;
}

export interface SaveQuoteInput {
  customerName: string;
  notificationEmail: string;
  marketCode: string;
  dealerCode: string;
  pathType: PathType;
  configuration: ConfigurationState;
}