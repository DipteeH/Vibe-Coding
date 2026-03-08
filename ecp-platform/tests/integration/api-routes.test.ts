import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@/domain/auth/types";
import type { SavedQuoteSummary } from "@/domain/ecp/types";

const {
  repositoryMock,
  requireRouteUserMock,
  listUsersForAdminMock,
  sendConfigurationConfirmationEmailMock,
} = vi.hoisted(() => ({
  repositoryMock: {
    save: vi.fn(),
    listRecent: vi.fn(),
    listByOwner: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    listAll: vi.fn(),
  },
  requireRouteUserMock: vi.fn(),
  listUsersForAdminMock: vi.fn(),
  sendConfigurationConfirmationEmailMock: vi.fn(),
}));

vi.mock("@/infrastructure/repositories/saved-quote-repository", () => ({
  prismaSavedQuoteRepository: repositoryMock,
}));

vi.mock("@/lib/auth", () => ({
  requireRouteUser: requireRouteUserMock,
  listUsersForAdmin: listUsersForAdminMock,
}));

vi.mock("@/lib/notifications", () => ({
  sendConfigurationConfirmationEmail: sendConfigurationConfirmationEmailMock,
}));

import { POST as postEvaluate } from "@/app/api/evaluate/route";
import { GET as getAdminConfigurations } from "@/app/api/admin/configurations/route";
import { GET as getAdminUsers } from "@/app/api/admin/users/route";
import { GET as getQuotes, POST as postQuote } from "@/app/api/quotes/route";
import { GET as getSavedConfigurations, POST as postSavedConfiguration } from "@/app/api/saved-configurations/route";

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

const user: AuthenticatedUser = {
  id: "user-1",
  name: "Diptee Demo",
  email: "diptee@example.com",
  phoneNumber: null,
  role: "USER",
};

const adminUser: AuthenticatedUser = {
  ...user,
  id: "admin-1",
  email: "admin@example.com",
  role: "ADMIN",
};

const validSavePayload = {
  customerName: "Acme Fleet",
  notificationEmail: "fleet@example.com",
  marketCode: "US-NATIONAL",
  dealerCode: "DIRECT",
  pathType: "QUOTE",
  configuration: { modelCode: "ATLAS_SUV", packageCodes: [] },
};

describe("API routes", () => {
  beforeEach(() => {
    repositoryMock.save.mockReset();
    repositoryMock.listRecent.mockReset();
    repositoryMock.listByOwner.mockReset();
    repositoryMock.getById.mockReset();
    repositoryMock.update.mockReset();
    repositoryMock.remove.mockReset();
    repositoryMock.listAll.mockReset();
    requireRouteUserMock.mockReset();
    listUsersForAdminMock.mockReset();
    sendConfigurationConfirmationEmailMock.mockReset();

    requireRouteUserMock.mockResolvedValue(null);
    listUsersForAdminMock.mockResolvedValue([]);
    sendConfigurationConfirmationEmailMock.mockResolvedValue(undefined);
  });

  it("returns 400 for invalid evaluation payloads", async () => {
    const response = await postEvaluate(
      new Request("http://localhost/api/evaluate", {
        method: "POST",
        body: JSON.stringify({ configuration: {} }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      message: "Invalid evaluation request.",
    });
  });

  it("evaluates valid configurations through the route", async () => {
    const response = await postEvaluate(
      new Request("http://localhost/api/evaluate", {
        method: "POST",
        body: JSON.stringify({
          marketCode: "US-NATIONAL",
          dealerCode: "DIRECT",
          configuration: {
            modelCode: "ATLAS_SUV",
            engineCode: "ELECTRIC_DUAL",
            transmissionCode: "MANUAL",
            trimCode: "LUXURY",
            packageCodes: [],
          },
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      configuration: expect.objectContaining({ transmissionCode: "AUTOMATIC" }),
    });
  });

  it("lists recent quotes through the quotes route", async () => {
    repositoryMock.listRecent.mockResolvedValue([summary]);

    const response = await getQuotes();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([summary]);
  });

  it("returns 401 and a login URL when an unauthenticated user tries to save a quote", async () => {
    const response = await postQuote(
      new Request("http://localhost/api/quotes", {
        method: "POST",
        body: JSON.stringify(validSavePayload),
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      message: "Authentication required.",
      loginUrl: "/login?returnTo=%2F%3Fresume%3Dsave",
    });
  });

  it("saves valid quote payloads through the quotes route for authenticated users", async () => {
    requireRouteUserMock.mockResolvedValue(user);
    repositoryMock.save.mockResolvedValue(summary);

    const response = await postQuote(
      new Request("http://localhost/api/quotes", {
        method: "POST",
        body: JSON.stringify(validSavePayload),
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual(summary);
    expect(repositoryMock.save).toHaveBeenCalledOnce();
    expect(repositoryMock.save).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId: user.id,
        data: expect.objectContaining({ notificationEmail: "fleet@example.com" }),
      }),
    );
    expect(sendConfigurationConfirmationEmailMock).toHaveBeenCalledWith({ action: "created", summary });
  });

  it("requires authentication to list saved configurations", async () => {
    const response = await getSavedConfigurations();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      message: "Authentication required.",
      loginUrl: "/login?returnTo=%2Fsaved-configurations",
    });
  });

  it("lists saved configurations for the authenticated owner", async () => {
    requireRouteUserMock.mockResolvedValue(user);
    repositoryMock.listByOwner.mockResolvedValue([summary]);

    const response = await getSavedConfigurations();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([summary]);
    expect(repositoryMock.listByOwner).toHaveBeenCalledWith(user.id);
  });

  it("saves authenticated configurations through the saved-configurations route", async () => {
    requireRouteUserMock.mockResolvedValue(user);
    repositoryMock.save.mockResolvedValue(summary);

    const response = await postSavedConfiguration(
      new Request("http://localhost/api/saved-configurations", {
        method: "POST",
        body: JSON.stringify(validSavePayload),
      }),
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual(summary);
    expect(repositoryMock.save).toHaveBeenCalledWith(
      expect.objectContaining({
        ownerId: user.id,
        data: expect.objectContaining({ notificationEmail: "fleet@example.com" }),
      }),
    );
    expect(sendConfigurationConfirmationEmailMock).toHaveBeenCalledWith({ action: "created", summary });
  });

  it("blocks the admin users route for unauthenticated and non-admin users", async () => {
    const unauthenticatedResponse = await getAdminUsers();
    expect(unauthenticatedResponse.status).toBe(401);

    requireRouteUserMock.mockResolvedValue(user);
    const forbiddenResponse = await getAdminUsers();
    expect(forbiddenResponse.status).toBe(403);
  });

  it("returns admin user data for administrators", async () => {
    requireRouteUserMock.mockResolvedValue(adminUser);
    listUsersForAdminMock.mockResolvedValue([
      {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        phoneNumber: null,
        role: adminUser.role,
        providers: ["EMAIL", "GOOGLE"],
        createdAt: "2026-03-08T00:00:00.000Z",
        savedConfigurationCount: 3,
        activeSessionCount: 1,
      },
    ]);

    const response = await getAdminUsers();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject([
      expect.objectContaining({
        id: adminUser.id,
        role: "ADMIN",
        providers: ["EMAIL", "GOOGLE"],
      }),
    ]);
  });

  it("blocks configuration admin listing for non-admin users", async () => {
    requireRouteUserMock.mockResolvedValue(user);

    const response = await getAdminConfigurations();

    expect(response.status).toBe(403);
  });

  it("returns all saved configurations for administrators", async () => {
    requireRouteUserMock.mockResolvedValue(adminUser);
    repositoryMock.listAll.mockResolvedValue([summary]);

    const response = await getAdminConfigurations();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([summary]);
    expect(repositoryMock.listAll).toHaveBeenCalledOnce();
  });
});