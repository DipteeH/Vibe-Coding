import {
  type BootstrapData,
  type DealerDefinition,
  type EngineDefinition,
  type MarketDefinition,
  type ModelDefinition,
  type PackageDefinition,
  type SimpleOptionDefinition,
  type TransmissionDefinition,
  type TrimDefinition,
} from "@/domain/ecp/types";

export const markets: MarketDefinition[] = [
  {
    code: "US-NATIONAL",
    label: "United States",
    description: "National launch market with broad allocation coverage.",
    currency: "USD",
    fxRateBasisPoints: 10_000,
    dieselRestricted: false,
    evIncentiveCents: 0,
    luxuryTaxThresholdCents: 0,
    luxuryTaxRateBasisPoints: 0,
  },
  {
    code: "US-CA",
    label: "California",
    description: "Zero-emissions focused market with diesel restrictions and EV incentives.",
    currency: "USD",
    fxRateBasisPoints: 10_000,
    dieselRestricted: true,
    evIncentiveCents: 250_000,
    luxuryTaxThresholdCents: 0,
    luxuryTaxRateBasisPoints: 0,
  },
  {
    code: "DE-BY",
    label: "Germany",
    description: "EU homologation market with premium taxation controls.",
    currency: "EUR",
    fxRateBasisPoints: 9_200,
    dieselRestricted: false,
    evIncentiveCents: 0,
    luxuryTaxThresholdCents: 6_800_000,
    luxuryTaxRateBasisPoints: 300,
  },
];

export const dealers: DealerDefinition[] = [
  {
    code: "DIRECT",
    label: "Direct Online",
    description: "Centralized manufacturer channel with digital-first incentives.",
    markupCents: 0,
  },
  {
    code: "BAY-PREMIUM",
    label: "Bay Premium Motors",
    description: "Dealer network with curated allocation and concierge fulfillment.",
    markupCents: 90_000,
    restrictedEngineCodes: ["DIESEL_TD"],
    sportIncentiveCents: 75_000,
    luxuryIncentiveCents: 50_000,
  },
  {
    code: "ALPINE-AUTO",
    label: "Alpine Auto Group",
    description: "Regional retailer optimized for premium SUV and winter-ready stock.",
    markupCents: 35_000,
  },
];

export const engines: EngineDefinition[] = [
  {
    code: "HYBRID_24",
    label: "2.4L Hybrid",
    description: "Efficient hybrid powertrain tuned for high-volume fleet demand.",
    priceDeltaCents: 0,
    tags: ["52 mpg equivalent", "Front-wheel drive"],
    compatibleModelCodes: ["AURORA_SEDAN"],
    powertrain: "hybrid",
    drivetrain: "FWD",
  },
  {
    code: "TURBO_28",
    label: "2.8L Turbo",
    description: "Balanced turbocharged petrol engine for premium performance.",
    priceDeltaCents: 180_000,
    tags: ["355 hp", "All-rounder"],
    compatibleModelCodes: ["ATLAS_SUV", "NOVA_COUPE"],
    powertrain: "gasoline",
    drivetrain: "AWD",
  },
  {
    code: "DIESEL_TD",
    label: "Turbo Diesel",
    description: "Long-range diesel option for non-restricted markets.",
    priceDeltaCents: 120_000,
    tags: ["High torque", "Fleet favorite"],
    compatibleModelCodes: ["ATLAS_SUV"],
    powertrain: "diesel",
    drivetrain: "AWD",
  },
  {
    code: "ELECTRIC_DUAL",
    label: "Dual Motor Electric",
    description: "Performance EV setup with instant torque and OTA-ready control stack.",
    priceDeltaCents: 420_000,
    tags: ["Zero emissions", "AWD"],
    compatibleModelCodes: ["AURORA_SEDAN", "ATLAS_SUV", "NOVA_COUPE"],
    powertrain: "electric",
    drivetrain: "AWD",
    badge: "Auto-selects automatic",
  },
  {
    code: "V8_PERFORMANCE",
    label: "4.0L V8 Performance",
    description: "Track-tuned V8 reserved for halo coupe configurations.",
    priceDeltaCents: 520_000,
    tags: ["502 hp", "Launch edition"],
    compatibleModelCodes: ["NOVA_COUPE"],
    powertrain: "gasoline",
    drivetrain: "RWD",
  },
];

export const transmissions: TransmissionDefinition[] = [
  {
    code: "AUTOMATIC",
    label: "Automatic",
    description: "Adaptive automatic tuned for comfort and performance.",
    priceDeltaCents: 0,
    compatibleModelCodes: ["AURORA_SEDAN", "ATLAS_SUV", "NOVA_COUPE"],
  },
  {
    code: "MANUAL",
    label: "Manual",
    description: "Driver-focused manual transmission for select performance builds.",
    priceDeltaCents: -40_000,
    compatibleModelCodes: ["ATLAS_SUV", "NOVA_COUPE"],
  },
];

export const trims: TrimDefinition[] = [
  {
    code: "BASE",
    label: "Base",
    description: "Core specification optimized for fleet-scale accessibility.",
    priceDeltaCents: 0,
    compatibleModelCodes: ["AURORA_SEDAN", "ATLAS_SUV"],
    defaultSelections: {
      interiorMaterialCode: "CLOTH",
      interiorColorCode: "GRAPHITE",
      dashboardFinishCode: "MATTE_BLACK",
      wheelCode: "W18_TOURING",
      bodyKitCode: "NONE",
      roofCode: "STANDARD",
    },
    includedFeatureLabels: ["Adaptive cruise", "Digital cockpit"],
  },
  {
    code: "PREMIUM",
    label: "Premium",
    description: "Elevated comfort bundle for executive users and customer demos.",
    priceDeltaCents: 350_000,
    compatibleModelCodes: ["AURORA_SEDAN"],
    defaultSelections: {
      interiorMaterialCode: "VEGAN_LEATHER",
      interiorColorCode: "SANDSTONE",
      dashboardFinishCode: "OPEN_PORE_WOOD",
      wheelCode: "W19_SPORT",
      bodyKitCode: "CHROME_ACCENTS",
      roofCode: "PANORAMIC",
    },
    includedFeatureLabels: ["Ventilated seats", "Acoustic glass"],
  },
  {
    code: "SPORT",
    label: "Sport",
    description: "Dynamic trim with bundled suspension and performance styling.",
    priceDeltaCents: 520_000,
    compatibleModelCodes: ["AURORA_SEDAN", "NOVA_COUPE"],
    defaultSelections: {
      interiorMaterialCode: "VEGAN_LEATHER",
      interiorColorCode: "GRAPHITE",
      dashboardFinishCode: "CARBON_WEAVE",
      wheelCode: "W19_SPORT",
      bodyKitCode: "SPORT_AERO",
      roofCode: "CARBON",
    },
    includedFeatureLabels: ["Sport suspension", "Drive mode telemetry"],
  },
  {
    code: "LUXURY",
    label: "Luxury",
    description: "Top-tier package with handcrafted finish and executive amenities.",
    priceDeltaCents: 690_000,
    compatibleModelCodes: ["ATLAS_SUV", "NOVA_COUPE"],
    defaultSelections: {
      interiorMaterialCode: "NAPPA_LEATHER",
      interiorColorCode: "SANDSTONE",
      dashboardFinishCode: "OPEN_PORE_WOOD",
      wheelCode: "W21_PERFORMANCE",
      bodyKitCode: "CHROME_ACCENTS",
      roofCode: "PANORAMIC",
    },
    includedFeatureLabels: ["Executive seating", "Laminated glass"],
  },
  {
    code: "ADVENTURE",
    label: "Adventure",
    description: "Utility-forward SUV trim prepared for winter and terrain packages.",
    priceDeltaCents: 480_000,
    compatibleModelCodes: ["ATLAS_SUV"],
    defaultSelections: {
      interiorMaterialCode: "VEGAN_LEATHER",
      interiorColorCode: "GRAPHITE",
      dashboardFinishCode: "MATTE_BLACK",
      wheelCode: "W19_OFFROAD",
      bodyKitCode: "ROOF_RAILS",
      roofCode: "STANDARD",
    },
    includedFeatureLabels: ["Raised suspension", "Terrain calibrations"],
  },
];

export const exteriorColors: SimpleOptionDefinition[] = [
  {
    code: "SOLID_WHITE",
    label: "Solid White",
    description: "Clean, launch-ready solid finish.",
    priceDeltaCents: 0,
    compatibleModelCodes: ["AURORA_SEDAN", "ATLAS_SUV", "NOVA_COUPE"],
  },
  {
    code: "MIDNIGHT_METALLIC",
    label: "Midnight Metallic",
    description: "Deep metallic finish with high-gloss flake.",
    priceDeltaCents: 120_000,
    compatibleModelCodes: ["AURORA_SEDAN", "ATLAS_SUV", "NOVA_COUPE"],
    badge: "Metallic",
  },
  {
    code: "GLACIER_BLUE",
    label: "Glacier Blue",
    description: "Premium metallic blue optimized for hero launches.",
    priceDeltaCents: 140_000,
    compatibleModelCodes: ["AURORA_SEDAN", "ATLAS_SUV"],
    badge: "Metallic",
  },
  {
    code: "CRIMSON_RED",
    label: "Crimson Red",
    description: "Signature red performance colorway.",
    priceDeltaCents: 90_000,
    compatibleModelCodes: ["AURORA_SEDAN", "NOVA_COUPE"],
  },
];

export const roofs: SimpleOptionDefinition[] = [
  {
    code: "STANDARD",
    label: "Standard Roof",
    description: "Standard painted roof.",
    priceDeltaCents: 0,
    compatibleModelCodes: ["AURORA_SEDAN", "ATLAS_SUV", "NOVA_COUPE"],
  },
  {
    code: "PANORAMIC",
    label: "Panoramic Roof",
    description: "Large glass roof with intelligent tinting.",
    priceDeltaCents: 180_000,
    compatibleModelCodes: ["AURORA_SEDAN", "ATLAS_SUV"],
  },
  {
    code: "CARBON",
    label: "Carbon Roof",
    description: "Lightweight carbon roof for dynamic trims.",
    priceDeltaCents: 260_000,
    compatibleModelCodes: ["NOVA_COUPE", "AURORA_SEDAN"],
  },
];

export const bodyKits: SimpleOptionDefinition[] = [
  {
    code: "NONE",
    label: "Standard Body",
    description: "Default body treatment for the selected trim.",
    priceDeltaCents: 0,
    compatibleModelCodes: ["AURORA_SEDAN", "ATLAS_SUV", "NOVA_COUPE"],
  },
  {
    code: "SPORT_AERO",
    label: "Sport Aero Kit",
    description: "Performance body kit with aero splitters and diffuser accents.",
    priceDeltaCents: 230_000,
    compatibleModelCodes: ["AURORA_SEDAN", "NOVA_COUPE"],
  },
  {
    code: "ROOF_RAILS",
    label: "Roof Rails",
    description: "Functional roof rails for lifestyle accessories.",
    priceDeltaCents: 70_000,
    compatibleModelCodes: ["ATLAS_SUV"],
  },
  {
    code: "CHROME_ACCENTS",
    label: "Chrome Accents",
    description: "Luxury exterior brightwork package.",
    priceDeltaCents: 90_000,
    compatibleModelCodes: ["AURORA_SEDAN", "ATLAS_SUV", "NOVA_COUPE"],
  },
];

export const interiorMaterials: SimpleOptionDefinition[] = [
  {
    code: "CLOTH",
    label: "Technical Cloth",
    description: "Durable cloth interior for volume trims.",
    priceDeltaCents: 0,
    compatibleModelCodes: ["AURORA_SEDAN", "ATLAS_SUV"],
  },
  {
    code: "VEGAN_LEATHER",
    label: "Vegan Leather",
    description: "Soft-touch synthetic material with fleet durability.",
    priceDeltaCents: 160_000,
    compatibleModelCodes: ["AURORA_SEDAN", "ATLAS_SUV", "NOVA_COUPE"],
  },
  {
    code: "NAPPA_LEATHER",
    label: "Nappa Leather",
    description: "Hand-finished leather reserved for premium cabins.",
    priceDeltaCents: 320_000,
    compatibleModelCodes: ["ATLAS_SUV", "NOVA_COUPE"],
  },
];

export const interiorColors: SimpleOptionDefinition[] = [
  {
    code: "GRAPHITE",
    label: "Graphite",
    description: "Dark neutral cabin palette.",
    priceDeltaCents: 0,
    compatibleModelCodes: ["AURORA_SEDAN", "ATLAS_SUV", "NOVA_COUPE"],
  },
  {
    code: "SANDSTONE",
    label: "Sandstone",
    description: "Warm premium interior tone.",
    priceDeltaCents: 60_000,
    compatibleModelCodes: ["AURORA_SEDAN", "ATLAS_SUV", "NOVA_COUPE"],
  },
  {
    code: "CRIMSON",
    label: "Crimson",
    description: "Bold red interior accent package.",
    priceDeltaCents: 80_000,
    compatibleModelCodes: ["AURORA_SEDAN", "NOVA_COUPE"],
    badge: "Performance",
  },
];

export const dashboardFinishes: SimpleOptionDefinition[] = [
  {
    code: "MATTE_BLACK",
    label: "Matte Black",
    description: "Standard matte dashboard finish.",
    priceDeltaCents: 0,
    compatibleModelCodes: ["AURORA_SEDAN", "ATLAS_SUV", "NOVA_COUPE"],
  },
  {
    code: "OPEN_PORE_WOOD",
    label: "Open Pore Wood",
    description: "Executive wood trim with low-gloss finish.",
    priceDeltaCents: 150_000,
    compatibleModelCodes: ["AURORA_SEDAN", "ATLAS_SUV", "NOVA_COUPE"],
  },
  {
    code: "CARBON_WEAVE",
    label: "Carbon Weave",
    description: "Technical carbon dashboard trim for dynamic cabins.",
    priceDeltaCents: 190_000,
    compatibleModelCodes: ["AURORA_SEDAN", "NOVA_COUPE"],
  },
];

export const wheels: SimpleOptionDefinition[] = [
  {
    code: "W18_TOURING",
    label: '18" Touring',
    description: "Balanced touring wheel for efficiency and comfort.",
    priceDeltaCents: 0,
    compatibleModelCodes: ["AURORA_SEDAN", "ATLAS_SUV"],
  },
  {
    code: "W19_SPORT",
    label: '19" Sport',
    description: "Sport wheel tuned for dynamic handling.",
    priceDeltaCents: 130_000,
    compatibleModelCodes: ["AURORA_SEDAN", "ATLAS_SUV", "NOVA_COUPE"],
  },
  {
    code: "W21_PERFORMANCE",
    label: '21" Performance',
    description: "Large forged wheel for flagship trims.",
    priceDeltaCents: 260_000,
    compatibleModelCodes: ["ATLAS_SUV", "NOVA_COUPE"],
    badge: "No snow chains",
  },
  {
    code: "W19_OFFROAD",
    label: '19" Off-road',
    description: "All-terrain wheel with reinforced sidewall package.",
    priceDeltaCents: 170_000,
    compatibleModelCodes: ["ATLAS_SUV"],
  },
];

export const packages: PackageDefinition[] = [
  {
    code: "TECH",
    label: "Technology Package",
    description: "AR HUD, upgraded autonomy compute, and remote diagnostics.",
    priceDeltaCents: 290_000,
    compatibleModelCodes: ["AURORA_SEDAN", "ATLAS_SUV", "NOVA_COUPE"],
    includedFeatureLabels: ["AR head-up display", "Remote diagnostics"],
  },
  {
    code: "WINTER",
    label: "Winter Package",
    description: "Cold-weather bundle with heated seats and steering.",
    priceDeltaCents: 180_000,
    compatibleModelCodes: ["AURORA_SEDAN", "ATLAS_SUV"],
    includedFeatureLabels: ["Heated seats", "Heated steering wheel"],
  },
  {
    code: "SAFETY",
    label: "Safety Package",
    description: "Enhanced sensor suite with surround view and collision automation.",
    priceDeltaCents: 240_000,
    compatibleModelCodes: ["AURORA_SEDAN", "ATLAS_SUV", "NOVA_COUPE"],
    includedFeatureLabels: ["360 camera", "Enhanced collision mitigation"],
  },
  {
    code: "TOW",
    label: "Tow Package",
    description: "Tow hitch, thermal management, and trailer software profile.",
    priceDeltaCents: 210_000,
    compatibleModelCodes: ["ATLAS_SUV"],
    includedFeatureLabels: ["Tow hitch", "Trailer stability"],
  },
  {
    code: "EXECUTIVE",
    label: "Executive Package",
    description: "Premium comfort package for VIP and dealer showcase vehicles.",
    priceDeltaCents: 380_000,
    compatibleModelCodes: ["AURORA_SEDAN", "ATLAS_SUV", "NOVA_COUPE"],
    includedFeatureLabels: ["Massage seats", "Rear comfort console"],
  },
  {
    code: "TRACK",
    label: "Track Package",
    description: "Performance telemetry, brake cooling, and circuit calibration.",
    priceDeltaCents: 320_000,
    compatibleModelCodes: ["NOVA_COUPE"],
    includedFeatureLabels: ["Lap telemetry", "Track brake cooling"],
  },
];

export const models: ModelDefinition[] = [
  {
    code: "AURORA_SEDAN",
    label: "Aurora Sedan",
    bodyStyle: "Sedan",
    description: "Executive sedan blending fleet-scale efficiency with premium digital experiences.",
    heroStat: "42 combinations pre-validated per request",
    basePriceCents: 4_700_000,
    imagePath: "/vehicles/aurora-sedan.svg",
    modelVersion: "AURORA-2026.3",
    rulesetVersion: "RULES-US-2026.03",
    pricingVersion: "PRICEBOOK-Q1-2026",
    plantAllocation: "Berlin eMobility Hub",
    engineCodes: ["HYBRID_24", "ELECTRIC_DUAL"],
    transmissionCodes: ["AUTOMATIC"],
    trimCodes: ["BASE", "PREMIUM", "SPORT"],
    exteriorColorCodes: ["SOLID_WHITE", "MIDNIGHT_METALLIC", "GLACIER_BLUE", "CRIMSON_RED"],
    roofCodes: ["STANDARD", "PANORAMIC", "CARBON"],
    bodyKitCodes: ["NONE", "SPORT_AERO", "CHROME_ACCENTS"],
    interiorMaterialCodes: ["CLOTH", "VEGAN_LEATHER"],
    interiorColorCodes: ["GRAPHITE", "SANDSTONE", "CRIMSON"],
    dashboardFinishCodes: ["MATTE_BLACK", "OPEN_PORE_WOOD", "CARBON_WEAVE"],
    wheelCodes: ["W18_TOURING", "W19_SPORT"],
    packageCodes: ["TECH", "WINTER", "SAFETY", "EXECUTIVE"],
  },
  {
    code: "ATLAS_SUV",
    label: "Atlas SUV",
    bodyStyle: "SUV",
    description: "Enterprise-ready SUV supporting dealer-specific incentives and utility packages.",
    heroStat: "Factory-aware utility rules enabled",
    basePriceCents: 5_600_000,
    imagePath: "/vehicles/atlas-suv.svg",
    modelVersion: "ATLAS-2026.1",
    rulesetVersion: "RULES-GLOBAL-2026.02",
    pricingVersion: "PRICEBOOK-Q1-2026",
    plantAllocation: "Leipzig Utility Plant",
    engineCodes: ["TURBO_28", "DIESEL_TD", "ELECTRIC_DUAL"],
    transmissionCodes: ["AUTOMATIC", "MANUAL"],
    trimCodes: ["BASE", "LUXURY", "ADVENTURE"],
    exteriorColorCodes: ["SOLID_WHITE", "MIDNIGHT_METALLIC", "GLACIER_BLUE"],
    roofCodes: ["STANDARD", "PANORAMIC"],
    bodyKitCodes: ["NONE", "ROOF_RAILS", "CHROME_ACCENTS"],
    interiorMaterialCodes: ["CLOTH", "VEGAN_LEATHER", "NAPPA_LEATHER"],
    interiorColorCodes: ["GRAPHITE", "SANDSTONE"],
    dashboardFinishCodes: ["MATTE_BLACK", "OPEN_PORE_WOOD"],
    wheelCodes: ["W18_TOURING", "W19_SPORT", "W19_OFFROAD", "W21_PERFORMANCE"],
    packageCodes: ["TECH", "WINTER", "SAFETY", "TOW", "EXECUTIVE"],
  },
  {
    code: "NOVA_COUPE",
    label: "Nova Coupe",
    bodyStyle: "Coupe",
    description: "Flagship coupe for performance-oriented launches and dealer halo inventory.",
    heroStat: "High-performance rule orchestration",
    basePriceCents: 6_200_000,
    imagePath: "/vehicles/nova-coupe.svg",
    modelVersion: "NOVA-2026.4",
    rulesetVersion: "RULES-HALO-2026.03",
    pricingVersion: "PRICEBOOK-HALO-2026",
    plantAllocation: "Modena Performance Cell",
    engineCodes: ["TURBO_28", "V8_PERFORMANCE", "ELECTRIC_DUAL"],
    transmissionCodes: ["AUTOMATIC", "MANUAL"],
    trimCodes: ["SPORT", "LUXURY"],
    exteriorColorCodes: ["SOLID_WHITE", "MIDNIGHT_METALLIC", "CRIMSON_RED"],
    roofCodes: ["STANDARD", "CARBON"],
    bodyKitCodes: ["NONE", "SPORT_AERO", "CHROME_ACCENTS"],
    interiorMaterialCodes: ["VEGAN_LEATHER", "NAPPA_LEATHER"],
    interiorColorCodes: ["GRAPHITE", "SANDSTONE", "CRIMSON"],
    dashboardFinishCodes: ["MATTE_BLACK", "OPEN_PORE_WOOD", "CARBON_WEAVE"],
    wheelCodes: ["W19_SPORT", "W21_PERFORMANCE"],
    packageCodes: ["TECH", "SAFETY", "EXECUTIVE", "TRACK"],
  },
];

export const bootstrapData: BootstrapData = {
  markets: markets.map(({ code, label, description, currency }) => ({
    code,
    label,
    description,
    currency,
  })),
  dealers: dealers.map(({ code, label, description }) => ({
    code,
    label,
    description,
  })),
  models: models.map((model) => ({
    code: model.code,
    label: model.label,
    bodyStyle: model.bodyStyle,
    description: model.description,
    heroStat: model.heroStat,
    plantAllocation: model.plantAllocation,
    basePriceCents: model.basePriceCents,
    imagePath: model.imagePath,
  })),
  defaultMarketCode: "US-NATIONAL",
  defaultDealerCode: "DIRECT",
  stepLabels: [
    "Select Model",
    "Select Engine",
    "Select Transmission",
    "Select Trim",
    "Select Exterior",
    "Select Interior",
    "Select Wheels",
    "Add Packages",
    "Review & Save",
  ],
};

export const engineMap = new Map(engines.map((item) => [item.code, item]));
export const transmissionMap = new Map(transmissions.map((item) => [item.code, item]));
export const trimMap = new Map(trims.map((item) => [item.code, item]));
export const exteriorColorMap = new Map(exteriorColors.map((item) => [item.code, item]));
export const roofMap = new Map(roofs.map((item) => [item.code, item]));
export const bodyKitMap = new Map(bodyKits.map((item) => [item.code, item]));
export const interiorMaterialMap = new Map(interiorMaterials.map((item) => [item.code, item]));
export const interiorColorMap = new Map(interiorColors.map((item) => [item.code, item]));
export const dashboardFinishMap = new Map(dashboardFinishes.map((item) => [item.code, item]));
export const wheelMap = new Map(wheels.map((item) => [item.code, item]));
export const packageMap = new Map(packages.map((item) => [item.code, item]));
export const modelMap = new Map(models.map((item) => [item.code, item]));
export const marketMap = new Map(markets.map((item) => [item.code, item]));
export const dealerMap = new Map(dealers.map((item) => [item.code, item]));