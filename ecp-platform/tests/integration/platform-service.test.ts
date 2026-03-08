import { describe, expect, it, vi } from "vitest";
import {
  deleteSavedConfiguration,
  getSavedConfiguration,
  listAllSavedConfigurations,
  listSavedConfigurations,
  listRecentQuotes,
  saveQuote,
  updateSavedConfiguration,
  type SavedQuoteRepository,
} from "@/application/ecp/platform-service";
import { evaluateSelection } from "@/application/ecp/platform-service";
import type { SavedConfigurationDetail, SavedQuoteSummary, SaveQuoteInput } from "@/domain/ecp/types";

const saveInput: SaveQuoteInput = {
  customerName: "Acme Fleet",
  notificationEmail: "fleet@example.com",
  marketCode: "US-NATIONAL",
  dealerCode: "DIRECT",
  pathType: "QUOTE",
  configuration: {
    modelCode: "ATLAS_SUV",
    engineCode: "ELECTRIC_DUAL",
    transmissionCode: "MANUAL",
    trimCode: "LUXURY",
    packageCodes: ["SAFETY"],
  },
};

const summary: SavedQuoteSummary = {
  id: "quote-1",
  ownerId: "user-1",
  customerName: "Acme Fleet",
  notificationEmail: "fleet@example.com",
  modelCode: "ATLAS_SUV",
  marketCode: "US-NATIONAL",
  dealerCode: "DIRECT",
  pathType: "QUOTE",
  currency: "USD",
  totalPriceCents: 6120000,
  complianceStatus: "compliant",
  manufacturingState: "feasible",
  createdAt: "2026-03-08T00:00:00.000Z",
  updatedAt: "2026-03-08T01:00:00.000Z",
};

const detail: SavedConfigurationDetail = {
  ...summary,
  configuration: saveInput.configuration,
  evaluation: evaluateSelection(saveInput),
};

function createRepository(overrides: Partial<SavedQuoteRepository> = {}): SavedQuoteRepository {
  return {
    save: vi.fn(),
    listRecent: vi.fn(),
    listByOwner: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    listAll: vi.fn(),
    ...overrides,
  };
}

describe("platform service", () => {
  it("rejects save requests without a selected model", async () => {
    const repository = createRepository();

    await expect(
      saveQuote(
        {
          customerName: "Acme Fleet",
          notificationEmail: "fleet@example.com",
          marketCode: "US-NATIONAL",
          dealerCode: "DIRECT",
          pathType: "QUOTE",
          configuration: { packageCodes: [] },
        },
        repository,
      ),
    ).rejects.toThrow("A model must be selected before saving a quote.");
  });

  it("passes the evaluated configuration to the repository when saving", async () => {
    const repository = createRepository({
      save: vi.fn().mockResolvedValue(summary),
    });

    const result = await saveQuote(saveInput, repository, "user-1");

    expect(result).toEqual(summary);
    expect(repository.save).toHaveBeenCalledOnce();
    expect(vi.mocked(repository.save).mock.calls[0][0].ownerId).toBe("user-1");
    expect(vi.mocked(repository.save).mock.calls[0][0].evaluation.configuration.transmissionCode).toBe(
      "AUTOMATIC",
    );
  });

  it("delegates recent quote listing to the repository", async () => {
    const repository = createRepository({
      listRecent: vi.fn().mockResolvedValue([summary]),
    });

    await expect(listRecentQuotes(repository)).resolves.toEqual([summary]);
  });

  it("delegates owner-specific saved configuration listing", async () => {
    const repository = createRepository({
      listByOwner: vi.fn().mockResolvedValue([summary]),
    });

    await expect(listSavedConfigurations("user-1", repository)).resolves.toEqual([summary]);
    expect(repository.listByOwner).toHaveBeenCalledWith("user-1");
  });

  it("delegates saved configuration lookup by id", async () => {
    const repository = createRepository({
      getById: vi.fn().mockResolvedValue(detail),
    });

    await expect(getSavedConfiguration("quote-1", repository)).resolves.toEqual(detail);
    expect(repository.getById).toHaveBeenCalledWith("quote-1");
  });

  it("passes evaluated updates to the repository when editing a saved configuration", async () => {
    const repository = createRepository({
      update: vi.fn().mockResolvedValue(summary),
    });

    const result = await updateSavedConfiguration("quote-1", "user-1", saveInput, repository);

    expect(result).toEqual(summary);
    expect(repository.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "quote-1",
        ownerId: "user-1",
        data: expect.objectContaining({ notificationEmail: "fleet@example.com" }),
      }),
    );
    expect(vi.mocked(repository.update).mock.calls[0][0].evaluation.configuration.transmissionCode).toBe(
      "AUTOMATIC",
    );
  });

  it("delegates deletion to the repository with owner scoping", async () => {
    const repository = createRepository({
      remove: vi.fn().mockResolvedValue(undefined),
    });

    await expect(deleteSavedConfiguration("quote-1", repository, "user-1")).resolves.toBeUndefined();
    expect(repository.remove).toHaveBeenCalledWith({ id: "quote-1", ownerId: "user-1" });
  });

  it("delegates admin listing of all saved configurations", async () => {
    const repository = createRepository({
      listAll: vi.fn().mockResolvedValue([summary]),
    });

    await expect(listAllSavedConfigurations(repository)).resolves.toEqual([summary]);
    expect(repository.listAll).toHaveBeenCalledOnce();
  });
});