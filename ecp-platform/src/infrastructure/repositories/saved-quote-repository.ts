import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { SavedQuoteRepository } from "@/application/ecp/platform-service";
import type {
  EvaluationResult,
  SavedConfigurationDetail,
  SavedQuoteSummary,
  SaveQuoteInput,
} from "@/domain/ecp/types";
import { prisma } from "@/infrastructure/db/prisma";

type FileStoredQuote = SavedConfigurationDetail;

interface PersistedQuoteRecord {
  id: string;
  ownerId: string | null;
  customerName: string;
  notificationEmail: string;
  modelCode: string;
  marketCode: string;
  dealerCode: string;
  pathType: SavedQuoteSummary["pathType"];
  currency: string;
  totalPriceCents: number;
  complianceStatus: string;
  manufacturingState: string;
  configurationJson: string;
  evaluationJson: string;
  createdAt: Date;
  updatedAt: Date;
  owner?: { id: string; name: string; email: string | null } | null;
}

const fileStorePath = path.join(process.cwd(), "data", "saved-quotes.json");

let useFileFallback = false;

async function readFileStore(): Promise<FileStoredQuote[]> {
  try {
    const contents = await readFile(fileStorePath, "utf8");
    return JSON.parse(contents) as FileStoredQuote[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }

    throw error;
  }
}

async function writeFileStore(records: FileStoredQuote[]) {
  await mkdir(path.dirname(fileStorePath), { recursive: true });
  await writeFile(fileStorePath, JSON.stringify(records, null, 2), "utf8");
}

function toSummary(record: FileStoredQuote | PersistedQuoteRecord): SavedQuoteSummary {
  const ownerName = "owner" in record ? record.owner?.name ?? null : ("ownerName" in record ? record.ownerName ?? null : null);
  const ownerEmail = "owner" in record ? record.owner?.email ?? null : ("ownerEmail" in record ? record.ownerEmail ?? null : null);

  return {
    id: record.id,
    ownerId: record.ownerId ?? null,
    ownerName,
    ownerEmail,
    customerName: record.customerName,
    notificationEmail: record.notificationEmail,
    modelCode: record.modelCode,
    marketCode: record.marketCode,
    dealerCode: record.dealerCode,
    pathType: record.pathType,
    currency: record.currency,
    totalPriceCents: record.totalPriceCents,
    complianceStatus: record.complianceStatus,
    manufacturingState: record.manufacturingState,
    createdAt: record.createdAt instanceof Date ? record.createdAt.toISOString() : record.createdAt,
    updatedAt: record.updatedAt instanceof Date ? record.updatedAt.toISOString() : record.updatedAt,
  };
}

function toDetail(record: FileStoredQuote | PersistedQuoteRecord): SavedConfigurationDetail {
  const summary = toSummary(record);
  return {
    ...summary,
    configuration:
      "configuration" in record
        ? record.configuration
        : (JSON.parse(record.configurationJson) as SavedConfigurationDetail["configuration"]),
    evaluation:
      "evaluation" in record
        ? record.evaluation
        : (JSON.parse(record.evaluationJson) as SavedConfigurationDetail["evaluation"]),
  };
}

async function saveToFile(input: {
  data: SaveQuoteInput;
  evaluation: EvaluationResult;
  ownerId?: string;
}): Promise<SavedQuoteSummary> {
  const records = await readFileStore();
  const timestamp = new Date().toISOString();
  const record: FileStoredQuote = {
    id: randomUUID(),
    ownerId: input.ownerId ?? null,
    ownerName: null,
    ownerEmail: null,
    customerName: input.data.customerName,
    notificationEmail: input.data.notificationEmail,
    modelCode: input.evaluation.configuration.modelCode ?? "UNKNOWN",
    marketCode: input.data.marketCode,
    dealerCode: input.data.dealerCode,
    pathType: input.data.pathType,
    currency: input.evaluation.pricing.currency,
    totalPriceCents: input.evaluation.pricing.totalCents,
    complianceStatus: input.evaluation.operationalSummary.complianceStatus,
    manufacturingState: input.evaluation.operationalSummary.manufacturingStatus,
    createdAt: timestamp,
    updatedAt: timestamp,
    configuration: input.evaluation.configuration,
    evaluation: input.evaluation,
  };

  await writeFileStore([record, ...records].slice(0, 100));
  return toSummary(record);
}

async function listFromFile(): Promise<SavedQuoteSummary[]> {
  const records = await readFileStore();
  return records
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .slice(0, 8)
    .map(toSummary);
}

async function listByOwnerFromFile(ownerId: string): Promise<SavedQuoteSummary[]> {
  const records = await readFileStore();
  return records
    .filter((record) => record.ownerId === ownerId)
    .sort((left, right) => (right.updatedAt ?? right.createdAt).localeCompare(left.updatedAt ?? left.createdAt))
    .map(toSummary);
}

async function getByIdFromFile(id: string): Promise<SavedConfigurationDetail | null> {
  const records = await readFileStore();
  const record = records.find((item) => item.id === id);
  return record ? toDetail(record) : null;
}

async function updateInFile(input: {
  id: string;
  ownerId: string;
  data: SaveQuoteInput;
  evaluation: EvaluationResult;
}): Promise<SavedQuoteSummary> {
  const records = await readFileStore();
  const index = records.findIndex((record) => record.id === input.id && record.ownerId === input.ownerId);

  if (index === -1) {
    throw new Error("Saved configuration not found.");
  }

  const existing = records[index];
  const updated: FileStoredQuote = {
    ...existing,
    customerName: input.data.customerName,
    notificationEmail: input.data.notificationEmail,
    modelCode: input.evaluation.configuration.modelCode ?? "UNKNOWN",
    marketCode: input.data.marketCode,
    dealerCode: input.data.dealerCode,
    pathType: input.data.pathType,
    currency: input.evaluation.pricing.currency,
    totalPriceCents: input.evaluation.pricing.totalCents,
    complianceStatus: input.evaluation.operationalSummary.complianceStatus,
    manufacturingState: input.evaluation.operationalSummary.manufacturingStatus,
    updatedAt: new Date().toISOString(),
    configuration: input.evaluation.configuration,
    evaluation: input.evaluation,
  };

  records[index] = updated;
  await writeFileStore(records);
  return toSummary(updated);
}

async function listAllFromFile(): Promise<SavedQuoteSummary[]> {
  const records = await readFileStore();
  return records
    .sort((left, right) => (right.updatedAt ?? right.createdAt).localeCompare(left.updatedAt ?? left.createdAt))
    .map(toSummary);
}

async function removeFromFile(input: { id: string; ownerId?: string }) {
  const records = await readFileStore();
  const nextRecords = records.filter((record) => {
    if (record.id !== input.id) {
      return true;
    }

    if (input.ownerId && record.ownerId !== input.ownerId) {
      return true;
    }

    return false;
  });

  if (nextRecords.length === records.length) {
    throw new Error("Saved configuration not found.");
  }

  await writeFileStore(nextRecords);
}

export const prismaSavedQuoteRepository: SavedQuoteRepository = {
  async save({ data, evaluation, ownerId }) {
    if (useFileFallback || !prisma) {
      return saveToFile({ data, evaluation, ownerId });
    }

    try {
      const record = (await prisma.savedQuote.create({
        data: {
          ownerId,
          customerName: data.customerName,
          notificationEmail: data.notificationEmail,
          marketCode: data.marketCode,
          dealerCode: data.dealerCode,
          modelCode: evaluation.configuration.modelCode ?? "UNKNOWN",
          pathType: data.pathType,
          currency: evaluation.pricing.currency,
          totalPriceCents: evaluation.pricing.totalCents,
          complianceStatus: evaluation.operationalSummary.complianceStatus,
          manufacturingState: evaluation.operationalSummary.manufacturingStatus,
          configurationJson: JSON.stringify(evaluation.configuration),
          evaluationJson: JSON.stringify(evaluation),
        },
        include: {
          owner: { select: { id: true, name: true, email: true } },
        },
      })) as PersistedQuoteRecord;

      return toSummary(record);
    } catch {
      useFileFallback = true;
      return saveToFile({ data, evaluation, ownerId });
    }
  },

  async listRecent() {
    if (useFileFallback || !prisma) {
      return listFromFile();
    }

    try {
      const records = (await prisma.savedQuote.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        include: {
          owner: { select: { id: true, name: true, email: true } },
        },
      })) as PersistedQuoteRecord[];

      return records.map(toSummary);
    } catch {
      useFileFallback = true;
      return listFromFile();
    }
  },

  async listByOwner(ownerId) {
    if (useFileFallback || !prisma) {
      return listByOwnerFromFile(ownerId);
    }

    try {
      const records = (await prisma.savedQuote.findMany({
        where: { ownerId },
        orderBy: { updatedAt: "desc" },
        include: {
          owner: { select: { id: true, name: true, email: true } },
        },
      })) as PersistedQuoteRecord[];

      return records.map(toSummary);
    } catch {
      useFileFallback = true;
      return listByOwnerFromFile(ownerId);
    }
  },

  async getById(id) {
    if (useFileFallback || !prisma) {
      return getByIdFromFile(id);
    }

    try {
      const record = (await prisma.savedQuote.findUnique({
        where: { id },
        include: {
          owner: { select: { id: true, name: true, email: true } },
        },
      })) as PersistedQuoteRecord | null;

      return record ? toDetail(record) : null;
    } catch {
      useFileFallback = true;
      return getByIdFromFile(id);
    }
  },

  async update({ id, ownerId, data, evaluation }) {
    if (useFileFallback || !prisma) {
      return updateInFile({ id, ownerId, data, evaluation });
    }

    try {
      const existing = await prisma.savedQuote.findFirst({ where: { id, ownerId } });
      if (!existing) {
        throw new Error("Saved configuration not found.");
      }

      const record = (await prisma.savedQuote.update({
        where: { id },
        data: {
          customerName: data.customerName,
          notificationEmail: data.notificationEmail,
          marketCode: data.marketCode,
          dealerCode: data.dealerCode,
          modelCode: evaluation.configuration.modelCode ?? "UNKNOWN",
          pathType: data.pathType,
          currency: evaluation.pricing.currency,
          totalPriceCents: evaluation.pricing.totalCents,
          complianceStatus: evaluation.operationalSummary.complianceStatus,
          manufacturingState: evaluation.operationalSummary.manufacturingStatus,
          configurationJson: JSON.stringify(evaluation.configuration),
          evaluationJson: JSON.stringify(evaluation),
        },
        include: {
          owner: { select: { id: true, name: true, email: true } },
        },
      })) as PersistedQuoteRecord;

      return toSummary(record);
    } catch (error) {
      if (error instanceof Error && error.message === "Saved configuration not found.") {
        throw error;
      }

      useFileFallback = true;
      return updateInFile({ id, ownerId, data, evaluation });
    }
  },

  async remove({ id, ownerId }) {
    if (useFileFallback || !prisma) {
      return removeFromFile({ id, ownerId });
    }

    try {
      const existing = ownerId
        ? await prisma.savedQuote.findFirst({ where: { id, ownerId } })
        : await prisma.savedQuote.findUnique({ where: { id } });

      if (!existing) {
        throw new Error("Saved configuration not found.");
      }

      await prisma.savedQuote.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Error && error.message === "Saved configuration not found.") {
        throw error;
      }

      useFileFallback = true;
      return removeFromFile({ id, ownerId });
    }
  },

  async listAll() {
    if (useFileFallback || !prisma) {
      return listAllFromFile();
    }

    try {
      const records = (await prisma.savedQuote.findMany({
        orderBy: { updatedAt: "desc" },
        include: {
          owner: { select: { id: true, name: true, email: true } },
        },
      })) as PersistedQuoteRecord[];

      return records.map(toSummary);
    } catch {
      useFileFallback = true;
      return listAllFromFile();
    }
  },
};