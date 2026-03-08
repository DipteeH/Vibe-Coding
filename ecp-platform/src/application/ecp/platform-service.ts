import { z } from "zod";
import { bootstrapData } from "@/domain/ecp/catalog";
import { evaluateConfiguration } from "@/domain/ecp/evaluator";
import type {
  ConfigurationState,
  EvaluationResult,
  SaveQuoteInput,
  SavedQuoteSummary,
} from "@/domain/ecp/types";

export const configurationSchema = z.object({
  modelCode: z.string().optional(),
  engineCode: z.string().optional(),
  transmissionCode: z.string().optional(),
  trimCode: z.string().optional(),
  exteriorColorCode: z.string().optional(),
  roofCode: z.string().optional(),
  bodyKitCode: z.string().optional(),
  interiorMaterialCode: z.string().optional(),
  interiorColorCode: z.string().optional(),
  dashboardFinishCode: z.string().optional(),
  wheelCode: z.string().optional(),
  packageCodes: z.array(z.string()).default([]),
});

export const evaluateRequestSchema = z.object({
  marketCode: z.string(),
  dealerCode: z.string(),
  configuration: configurationSchema,
});

export const saveQuoteSchema = z.object({
  customerName: z.string().min(2).max(80),
  notificationEmail: z.string().trim().email().max(120),
  marketCode: z.string(),
  dealerCode: z.string(),
  pathType: z.enum(["QUOTE", "ORDER"]),
  configuration: configurationSchema,
});

export interface SavedQuoteRepository {
  save(input: {
    data: SaveQuoteInput;
    evaluation: EvaluationResult;
    ownerId?: string;
  }): Promise<SavedQuoteSummary>;
  listRecent(): Promise<SavedQuoteSummary[]>;
  listByOwner(ownerId: string): Promise<SavedQuoteSummary[]>;
  getById(id: string): Promise<import("@/domain/ecp/types").SavedConfigurationDetail | null>;
  update(input: {
    id: string;
    ownerId: string;
    data: SaveQuoteInput;
    evaluation: EvaluationResult;
  }): Promise<SavedQuoteSummary>;
  remove(input: { id: string; ownerId?: string }): Promise<void>;
  listAll(): Promise<SavedQuoteSummary[]>;
}

export function getBootstrapData() {
  return bootstrapData;
}

export function evaluateSelection(input: {
  marketCode: string;
  dealerCode: string;
  configuration: ConfigurationState;
}) {
  return evaluateConfiguration(input);
}

export async function saveQuote(
  input: SaveQuoteInput,
  repository: SavedQuoteRepository,
  ownerId?: string,
) {
  const evaluation = evaluateSelection(input);
  if (!evaluation.configuration.modelCode) {
    throw new Error("A model must be selected before saving a quote.");
  }

  return repository.save({
    data: input,
    evaluation,
    ownerId,
  });
}

export async function listRecentQuotes(repository: SavedQuoteRepository) {
  return repository.listRecent();
}

export async function listSavedConfigurations(ownerId: string, repository: SavedQuoteRepository) {
  return repository.listByOwner(ownerId);
}

export async function getSavedConfiguration(id: string, repository: SavedQuoteRepository) {
  return repository.getById(id);
}

export async function updateSavedConfiguration(
  id: string,
  ownerId: string,
  input: SaveQuoteInput,
  repository: SavedQuoteRepository,
) {
  const evaluation = evaluateSelection(input);
  if (!evaluation.configuration.modelCode) {
    throw new Error("A model must be selected before saving a quote.");
  }

  return repository.update({
    id,
    ownerId,
    data: input,
    evaluation,
  });
}

export async function listAllSavedConfigurations(repository: SavedQuoteRepository) {
  return repository.listAll();
}

export async function deleteSavedConfiguration(
  id: string,
  repository: SavedQuoteRepository,
  ownerId?: string,
) {
  return repository.remove({ id, ownerId });
}