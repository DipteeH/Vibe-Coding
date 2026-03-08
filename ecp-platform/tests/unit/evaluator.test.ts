import { describe, expect, it } from "vitest";
import { evaluateConfiguration } from "@/domain/ecp/evaluator";

describe("evaluateConfiguration", () => {
  it("auto-selects automatic transmission for electric powertrains", () => {
    const result = evaluateConfiguration({
      marketCode: "US-NATIONAL",
      dealerCode: "DIRECT",
      configuration: {
        modelCode: "ATLAS_SUV",
        engineCode: "ELECTRIC_DUAL",
        transmissionCode: "MANUAL",
        trimCode: "LUXURY",
        packageCodes: [],
      },
    });

    expect(result.configuration.transmissionCode).toBe("AUTOMATIC");
    expect(result.notifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Transmission auto-selected",
        }),
      ]),
    );
  });

  it("removes diesel selections in California and marks the engine unavailable", () => {
    const result = evaluateConfiguration({
      marketCode: "US-CA",
      dealerCode: "DIRECT",
      configuration: {
        modelCode: "ATLAS_SUV",
        engineCode: "DIESEL_TD",
        trimCode: "ADVENTURE",
        packageCodes: [],
      },
    });

    expect(result.configuration.engineCode).toBeUndefined();
    expect(result.availability.engines).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "DIESEL_TD",
          disabled: true,
        }),
      ]),
    );
  });

  it("filters tow package from electric SUV configurations", () => {
    const result = evaluateConfiguration({
      marketCode: "US-NATIONAL",
      dealerCode: "DIRECT",
      configuration: {
        modelCode: "ATLAS_SUV",
        engineCode: "ELECTRIC_DUAL",
        transmissionCode: "AUTOMATIC",
        trimCode: "LUXURY",
        packageCodes: ["TOW", "SAFETY"],
      },
    });

    expect(result.configuration.packageCodes).toEqual(["SAFETY"]);
    expect(result.auditTrail).toEqual(
      expect.arrayContaining([expect.stringContaining("Package bundle revalidated")]),
    );
  });
});