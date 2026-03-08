import {
  bodyKitMap,
  bodyKits,
  dashboardFinishMap,
  dashboardFinishes,
  dealerMap,
  engineMap,
  engines,
  exteriorColorMap,
  exteriorColors,
  interiorColorMap,
  interiorColors,
  interiorMaterialMap,
  interiorMaterials,
  marketMap,
  modelMap,
  packageMap,
  packages,
  roofMap,
  roofs,
  transmissionMap,
  transmissions,
  trimMap,
  trims,
  wheelMap,
  wheels,
} from "@/domain/ecp/catalog";
import {
  type BaseOptionDefinition,
  type ConfigurationState,
  type EvaluationResult,
  type NotificationMessage,
  type PriceLine,
  type SelectableOptionView,
  type SimpleOptionDefinition,
} from "@/domain/ecp/types";

const blankConfiguration = (): ConfigurationState => ({
  packageCodes: [],
});

const dedupePackages = (codes: string[]) => [...new Set(codes)].filter(Boolean);

const convertToMarketCurrency = (amountCents: number, fxRateBasisPoints: number) =>
  Math.round((amountCents * fxRateBasisPoints) / 10_000);

const priceLabel = (definition: BaseOptionDefinition | undefined, fallback: string) =>
  definition?.label ?? fallback;

const pushNotification = (
  notifications: NotificationMessage[],
  title: string,
  message: string,
  severity: NotificationMessage["severity"] = "warning",
) => {
  notifications.push({ severity, title, message });
};

const toSelectableOptions = (
  definitions: Array<BaseOptionDefinition | SimpleOptionDefinition>,
  allowedCodes: Map<string, string | undefined>,
  selectedValues: string[],
): SelectableOptionView[] =>
  definitions.map((definition) => ({
    code: definition.code,
    label: definition.label,
    description: definition.description,
    priceDeltaCents: definition.priceDeltaCents,
    selected: selectedValues.includes(definition.code),
    disabled: !allowedCodes.has(definition.code),
    reason: allowedCodes.get(definition.code),
    badge: definition.badge,
    tags: definition.tags,
  }));

const listIncludes = (source: string[] | undefined, value: string) => source?.includes(value) ?? false;

export function evaluateConfiguration(input: {
  marketCode: string;
  dealerCode: string;
  configuration: ConfigurationState;
}): EvaluationResult {
  const startedAt = performance.now();
  const notifications: NotificationMessage[] = [];
  const auditTrail: string[] = [];
  const configuration = {
    ...blankConfiguration(),
    ...input.configuration,
    packageCodes: dedupePackages(input.configuration.packageCodes ?? []),
  };

  const market = marketMap.get(input.marketCode) ?? marketMap.values().next().value;
  const dealer = dealerMap.get(input.dealerCode) ?? dealerMap.values().next().value;

  if (!market || !dealer) {
    throw new Error("ECP catalog bootstrap is missing required market or dealer definitions.");
  }

  const model = configuration.modelCode ? modelMap.get(configuration.modelCode) : undefined;

  if (!model) {
    return {
      configuration,
      availability: {
        engines: [],
        transmissions: [],
        trims: [],
        exteriorColors: [],
        roofs: [],
        bodyKits: [],
        interiorMaterials: [],
        interiorColors: [],
        dashboardFinishes: [],
        wheels: [],
        packages: [],
      },
      pricing: {
        currency: market.currency,
        subtotalCents: 0,
        adjustmentsCents: 0,
        incentivesCents: 0,
        totalCents: 0,
        lines: [],
      },
      notifications: [
        {
          severity: "info",
          title: "Select a model",
          message: "Choose a vehicle model to load the applicable option catalog, ruleset, and pricing version.",
        },
      ],
      auditTrail: [],
      metadata: {
        evaluationLatencyMs: Math.round(performance.now() - startedAt),
      },
      operationalSummary: {
        complianceStatus: "compliant",
        manufacturingStatus: "feasible",
        estimatedLeadTimeWeeks: 0,
        plantAllocation: "Awaiting model selection",
        notes: ["Model selection initializes the product catalog and validation scope."],
      },
      selectionSummary: [],
    };
  }

  const allowedEngineCodes = new Map<string, string | undefined>();
  for (const code of model.engineCodes) {
    const definition = engineMap.get(code);
    if (!definition) continue;
    if (market.dieselRestricted && definition.powertrain === "diesel") continue;
    if (listIncludes(dealer.restrictedEngineCodes, code)) continue;
    allowedEngineCodes.set(code, undefined);
  }

  if (configuration.engineCode && !allowedEngineCodes.has(configuration.engineCode)) {
    const previous = priceLabel(engineMap.get(configuration.engineCode), configuration.engineCode);
    configuration.engineCode = undefined;
    pushNotification(
      notifications,
      "Engine revalidated",
      `${previous} was removed because it is not permitted for ${market.label} via ${dealer.label}.`,
    );
    auditTrail.push(`Removed engine ${previous} due to market/dealer restrictions.`);
  }

  const selectedEngine = configuration.engineCode ? engineMap.get(configuration.engineCode) : undefined;

  const allowedTransmissionCodes = new Map<string, string | undefined>();
  for (const code of model.transmissionCodes) {
    const definition = transmissionMap.get(code);
    if (!definition) continue;
    if (selectedEngine?.powertrain === "electric" && code !== "AUTOMATIC") continue;
    if (selectedEngine?.code === "V8_PERFORMANCE" && code !== "AUTOMATIC") continue;
    allowedTransmissionCodes.set(code, undefined);
  }

  if (selectedEngine?.powertrain === "electric" && configuration.transmissionCode !== "AUTOMATIC") {
    configuration.transmissionCode = "AUTOMATIC";
    pushNotification(
      notifications,
      "Transmission auto-selected",
      "Electric powertrains automatically use the Automatic transmission.",
      "info",
    );
    auditTrail.push("Transmission auto-selected to Automatic for electric powertrain.");
  }

  if (configuration.transmissionCode && !allowedTransmissionCodes.has(configuration.transmissionCode)) {
    configuration.transmissionCode = undefined;
    pushNotification(
      notifications,
      "Transmission removed",
      "The previously selected transmission is incompatible with the current engine choice.",
    );
  }

  const allowedTrimCodes = new Map<string, string | undefined>();
  for (const code of model.trimCodes) {
    allowedTrimCodes.set(code, undefined);
  }

  if (configuration.trimCode && !allowedTrimCodes.has(configuration.trimCode)) {
    configuration.trimCode = undefined;
    pushNotification(
      notifications,
      "Trim removed",
      "The selected trim is not available for the chosen model.",
    );
  }

  const selectedTrim = configuration.trimCode ? trimMap.get(configuration.trimCode) : undefined;
  if (selectedTrim) {
    for (const [key, value] of Object.entries(selectedTrim.defaultSelections)) {
      const typedKey = key as keyof ConfigurationState;
      if (!configuration[typedKey]) {
        configuration[typedKey] = value as never;
      }
    }
  }

  const allowedExteriorColorCodes = new Map<string, string | undefined>();
  for (const code of model.exteriorColorCodes) {
    const definition = exteriorColorMap.get(code);
    if (!definition) continue;
    const isMetallic = definition.badge === "Metallic";
    if (selectedTrim?.code === "BASE" && isMetallic) continue;
    allowedExteriorColorCodes.set(code, undefined);
  }

  if (configuration.exteriorColorCode && !allowedExteriorColorCodes.has(configuration.exteriorColorCode)) {
    configuration.exteriorColorCode = "SOLID_WHITE";
    pushNotification(
      notifications,
      "Exterior adjusted",
      "Base trim excludes metallic paint, so the color was reset to Solid White.",
    );
    auditTrail.push("Replaced metallic exterior with Solid White on Base trim.");
  }

  const allowedRoofCodes = new Map<string, string | undefined>();
  for (const code of model.roofCodes) {
    allowedRoofCodes.set(code, undefined);
  }

  if (configuration.roofCode && !allowedRoofCodes.has(configuration.roofCode)) {
    configuration.roofCode = selectedTrim?.defaultSelections.roofCode ?? "STANDARD";
  }

  const allowedBodyKitCodes = new Map<string, string | undefined>();
  for (const code of model.bodyKitCodes) {
    if (configuration.roofCode === "PANORAMIC" && code === "ROOF_RAILS") continue;
    allowedBodyKitCodes.set(code, undefined);
  }

  if (configuration.bodyKitCode && !allowedBodyKitCodes.has(configuration.bodyKitCode)) {
    configuration.bodyKitCode = selectedTrim?.defaultSelections.bodyKitCode ?? "NONE";
    pushNotification(
      notifications,
      "Exterior package adjusted",
      "Panoramic roof excludes roof rails, so the body kit selection was corrected.",
    );
    auditTrail.push("Removed roof rails because panoramic roof was selected.");
  }

  const allowedInteriorMaterialCodes = new Map<string, string | undefined>();
  for (const code of model.interiorMaterialCodes) {
    allowedInteriorMaterialCodes.set(code, undefined);
  }

  if (configuration.interiorMaterialCode && !allowedInteriorMaterialCodes.has(configuration.interiorMaterialCode)) {
    configuration.interiorMaterialCode = selectedTrim?.defaultSelections.interiorMaterialCode;
  }

  const allowedInteriorColorCodes = new Map<string, string | undefined>();
  for (const code of model.interiorColorCodes) {
    if (selectedTrim?.code === "BASE" && code === "CRIMSON") continue;
    allowedInteriorColorCodes.set(code, undefined);
  }

  if (configuration.interiorColorCode && !allowedInteriorColorCodes.has(configuration.interiorColorCode)) {
    configuration.interiorColorCode = selectedTrim?.defaultSelections.interiorColorCode ?? "GRAPHITE";
    pushNotification(
      notifications,
      "Interior adjusted",
      "Crimson interior is not available on Base trim and was replaced with the trim default.",
    );
    auditTrail.push("Interior color auto-corrected for Base trim compatibility.");
  }

  const allowedDashboardFinishCodes = new Map<string, string | undefined>();
  for (const code of model.dashboardFinishCodes) {
    allowedDashboardFinishCodes.set(code, undefined);
  }

  if (configuration.dashboardFinishCode && !allowedDashboardFinishCodes.has(configuration.dashboardFinishCode)) {
    configuration.dashboardFinishCode = selectedTrim?.defaultSelections.dashboardFinishCode;
  }

  const allowedWheelCodes = new Map<string, string | undefined>();
  for (const code of model.wheelCodes) {
    if (code === "W19_OFFROAD" && selectedEngine?.drivetrain !== "AWD") continue;
    allowedWheelCodes.set(code, undefined);
  }

  if (configuration.wheelCode && !allowedWheelCodes.has(configuration.wheelCode)) {
    configuration.wheelCode = selectedTrim?.defaultSelections.wheelCode;
    pushNotification(
      notifications,
      "Wheel package adjusted",
      "The selected wheels were incompatible with the current drivetrain and were reset to the trim default.",
    );
    auditTrail.push("Wheel choice auto-adjusted for drivetrain compatibility.");
  }

  const allowedPackageCodes = new Map<string, string | undefined>();
  for (const code of model.packageCodes) {
    if (code === "TOW" && selectedEngine?.powertrain === "electric") continue;
    if (code === "TECH" && selectedTrim?.code === "BASE") continue;
    if (code === "EXECUTIVE" && !["PREMIUM", "LUXURY"].includes(selectedTrim?.code ?? "")) continue;
    if (code === "TRACK" && selectedTrim?.code !== "SPORT") continue;
    if (code === "TRACK" && !["V8_PERFORMANCE", "ELECTRIC_DUAL"].includes(selectedEngine?.code ?? "")) continue;
    if (code === "WINTER" && configuration.wheelCode === "W21_PERFORMANCE") continue;
    allowedPackageCodes.set(code, undefined);
  }

  const filteredPackages = configuration.packageCodes.filter((code) => allowedPackageCodes.has(code));
  if (filteredPackages.length !== configuration.packageCodes.length) {
    configuration.packageCodes = filteredPackages;
    pushNotification(
      notifications,
      "Packages revalidated",
      "One or more packages were removed because they no longer satisfy the active configuration constraints.",
    );
    auditTrail.push("Package bundle revalidated after trim/engine/wheel changes.");
  }

  if (
    model.code === "NOVA_COUPE" &&
    configuration.roofCode === "CARBON" &&
    configuration.wheelCode === "W21_PERFORMANCE"
  ) {
    configuration.roofCode = "STANDARD";
    pushNotification(
      notifications,
      "Factory feasibility adjustment",
      "Carbon roof with 21\" Performance wheels is unavailable for the current coupe allocation, so the roof was reset to Standard.",
    );
    auditTrail.push("Manufacturing rule prevented carbon roof + 21 inch wheels on Nova Coupe.");
  }

  const lines: PriceLine[] = [
    {
      code: model.code,
      label: `${model.label} base price`,
      amountCents: convertToMarketCurrency(model.basePriceCents, market.fxRateBasisPoints),
      kind: "base",
    },
  ];

  const collectPriceLine = (code: string | undefined, label: string, map: Map<string, BaseOptionDefinition>) => {
    if (!code) return;
    const definition = map.get(code);
    if (!definition) return;
    lines.push({
      code,
      label: `${definition.label} (${label})`,
      amountCents: convertToMarketCurrency(definition.priceDeltaCents, market.fxRateBasisPoints),
      kind: "option",
    });
  };

  collectPriceLine(configuration.engineCode, "engine", engineMap);
  collectPriceLine(configuration.transmissionCode, "transmission", transmissionMap);
  collectPriceLine(configuration.trimCode, "trim", trimMap);
  collectPriceLine(configuration.exteriorColorCode, "exterior", exteriorColorMap);
  collectPriceLine(configuration.roofCode, "roof", roofMap);
  collectPriceLine(configuration.bodyKitCode, "body kit", bodyKitMap);
  collectPriceLine(configuration.interiorMaterialCode, "interior material", interiorMaterialMap);
  collectPriceLine(configuration.interiorColorCode, "interior color", interiorColorMap);
  collectPriceLine(configuration.dashboardFinishCode, "dashboard", dashboardFinishMap);
  collectPriceLine(configuration.wheelCode, "wheels", wheelMap);
  for (const packageCode of configuration.packageCodes) {
    collectPriceLine(packageCode, "package", packageMap);
  }

  const dealerMarkupCents = convertToMarketCurrency(dealer.markupCents, market.fxRateBasisPoints);
  if (dealerMarkupCents > 0) {
    lines.push({
      code: `${dealer.code}-MARKUP`,
      label: `${dealer.label} fulfillment markup`,
      amountCents: dealerMarkupCents,
      kind: "adjustment",
    });
  }

  if (selectedEngine?.powertrain === "electric" && market.evIncentiveCents > 0) {
    lines.push({
      code: `${market.code}-EV`,
      label: `${market.label} EV incentive`,
      amountCents: -convertToMarketCurrency(market.evIncentiveCents, market.fxRateBasisPoints),
      kind: "incentive",
    });
  }

  if (selectedTrim?.code === "SPORT" && dealer.sportIncentiveCents) {
    lines.push({
      code: `${dealer.code}-SPORT`,
      label: `${dealer.label} sport incentive`,
      amountCents: -convertToMarketCurrency(dealer.sportIncentiveCents, market.fxRateBasisPoints),
      kind: "incentive",
    });
  }

  if (selectedTrim?.code === "LUXURY" && dealer.luxuryIncentiveCents) {
    lines.push({
      code: `${dealer.code}-LUXURY`,
      label: `${dealer.label} luxury incentive`,
      amountCents: -convertToMarketCurrency(dealer.luxuryIncentiveCents, market.fxRateBasisPoints),
      kind: "incentive",
    });
  }

  const subtotalCents = lines.filter((line) => line.kind !== "incentive" && line.kind !== "adjustment").reduce((sum, line) => sum + line.amountCents, 0);
  let adjustmentsCents = lines.filter((line) => line.kind === "adjustment").reduce((sum, line) => sum + line.amountCents, 0);
  const incentivesCents = Math.abs(lines.filter((line) => line.kind === "incentive").reduce((sum, line) => sum + line.amountCents, 0));

  if (market.luxuryTaxRateBasisPoints > 0 && subtotalCents > convertToMarketCurrency(market.luxuryTaxThresholdCents, market.fxRateBasisPoints)) {
    const luxuryTax = Math.round((subtotalCents * market.luxuryTaxRateBasisPoints) / 10_000);
    adjustmentsCents += luxuryTax;
    lines.push({
      code: `${market.code}-LUXURY-TAX`,
      label: `${market.label} luxury tax`,
      amountCents: luxuryTax,
      kind: "adjustment",
    });
  }

  const totalCents = lines.reduce((sum, line) => sum + line.amountCents, 0);
  const operationalNotes: string[] = [];
  let estimatedLeadTimeWeeks = 6;
  if (selectedEngine?.powertrain === "electric") estimatedLeadTimeWeeks += 2;
  if (configuration.packageCodes.includes("EXECUTIVE")) estimatedLeadTimeWeeks += 1;
  if (configuration.roofCode === "PANORAMIC") estimatedLeadTimeWeeks += 1;
  if (configuration.wheelCode === "W21_PERFORMANCE") operationalNotes.push('21" Performance wheels require snow-chain deletion compliance.');
  if (configuration.packageCodes.includes("WINTER")) operationalNotes.push("Winter package includes Heated Seats and Heated Steering by rule.");
  if (selectedTrim?.code === "SPORT") operationalNotes.push("Sport trim includes Sport Suspension automatically.");

  const manufacturingStatus = estimatedLeadTimeWeeks > 8 ? "capacity-constrained" : "feasible";
  const complianceStatus = configuration.engineCode === "DIESEL_TD" && market.dieselRestricted ? "review-required" : "compliant";
  if (manufacturingStatus === "capacity-constrained") {
    operationalNotes.push("Current plant load exceeds the standard SLA window for this configuration.");
  }

  const selectionSummary = [
    { label: "Model", value: model.label },
    { label: "Engine", value: priceLabel(selectedEngine, "Not selected") },
    { label: "Transmission", value: priceLabel(configuration.transmissionCode ? transmissionMap.get(configuration.transmissionCode) : undefined, "Not selected") },
    { label: "Trim", value: priceLabel(selectedTrim, "Not selected") },
    { label: "Exterior", value: priceLabel(configuration.exteriorColorCode ? exteriorColorMap.get(configuration.exteriorColorCode) : undefined, "Not selected") },
    { label: "Interior", value: priceLabel(configuration.interiorColorCode ? interiorColorMap.get(configuration.interiorColorCode) : undefined, "Not selected") },
    { label: "Wheels", value: priceLabel(configuration.wheelCode ? wheelMap.get(configuration.wheelCode) : undefined, "Not selected") },
    {
      label: "Packages",
      value: configuration.packageCodes.length
        ? configuration.packageCodes.map((code) => packageMap.get(code)?.label ?? code).join(", ")
        : "No optional packages",
    },
  ];

  return {
    configuration,
    availability: {
      engines: toSelectableOptions(
        engines.filter((item) => model.engineCodes.includes(item.code)),
        allowedEngineCodes,
        configuration.engineCode ? [configuration.engineCode] : [],
      ),
      transmissions: toSelectableOptions(
        transmissions.filter((item) => model.transmissionCodes.includes(item.code)),
        allowedTransmissionCodes,
        configuration.transmissionCode ? [configuration.transmissionCode] : [],
      ),
      trims: toSelectableOptions(
        trims.filter((item) => model.trimCodes.includes(item.code)),
        allowedTrimCodes,
        configuration.trimCode ? [configuration.trimCode] : [],
      ),
      exteriorColors: toSelectableOptions(
        exteriorColors.filter((item) => model.exteriorColorCodes.includes(item.code)),
        allowedExteriorColorCodes,
        configuration.exteriorColorCode ? [configuration.exteriorColorCode] : [],
      ),
      roofs: toSelectableOptions(
        roofs.filter((item) => model.roofCodes.includes(item.code)),
        allowedRoofCodes,
        configuration.roofCode ? [configuration.roofCode] : [],
      ),
      bodyKits: toSelectableOptions(
        bodyKits.filter((item) => model.bodyKitCodes.includes(item.code)),
        allowedBodyKitCodes,
        configuration.bodyKitCode ? [configuration.bodyKitCode] : [],
      ),
      interiorMaterials: toSelectableOptions(
        interiorMaterials.filter((item) => model.interiorMaterialCodes.includes(item.code)),
        allowedInteriorMaterialCodes,
        configuration.interiorMaterialCode ? [configuration.interiorMaterialCode] : [],
      ),
      interiorColors: toSelectableOptions(
        interiorColors.filter((item) => model.interiorColorCodes.includes(item.code)),
        allowedInteriorColorCodes,
        configuration.interiorColorCode ? [configuration.interiorColorCode] : [],
      ),
      dashboardFinishes: toSelectableOptions(
        dashboardFinishes.filter((item) => model.dashboardFinishCodes.includes(item.code)),
        allowedDashboardFinishCodes,
        configuration.dashboardFinishCode ? [configuration.dashboardFinishCode] : [],
      ),
      wheels: toSelectableOptions(
        wheels.filter((item) => model.wheelCodes.includes(item.code)),
        allowedWheelCodes,
        configuration.wheelCode ? [configuration.wheelCode] : [],
      ),
      packages: toSelectableOptions(
        packages.filter((item) => model.packageCodes.includes(item.code)),
        allowedPackageCodes,
        configuration.packageCodes,
      ),
    },
    pricing: {
      currency: market.currency,
      subtotalCents,
      adjustmentsCents,
      incentivesCents,
      totalCents,
      lines,
    },
    notifications,
    auditTrail,
    metadata: {
      modelVersion: model.modelVersion,
      rulesetVersion: model.rulesetVersion,
      pricingVersion: model.pricingVersion,
      evaluationLatencyMs: Math.max(1, Math.round(performance.now() - startedAt)),
    },
    operationalSummary: {
      complianceStatus,
      manufacturingStatus,
      estimatedLeadTimeWeeks,
      plantAllocation: model.plantAllocation,
      notes: operationalNotes,
    },
    selectionSummary,
  };
}