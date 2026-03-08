// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { getBootstrapData, evaluateSelection } from "@/application/ecp/platform-service";
import { ConfiguratorClient } from "@/components/ecp/configurator-client";

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("ConfiguratorClient", () => {
  beforeEach(() => {
    window.localStorage.clear();

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url === "/api/quotes" && (!init?.method || init.method === "GET")) {
        return jsonResponse([]);
      }

      if (url === "/api/evaluate" && init?.method === "POST") {
        const body = JSON.parse(String(init.body));
        return jsonResponse(evaluateSelection(body));
      }

      throw new Error(`Unhandled fetch request: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    window.localStorage.clear();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("renders the configurator and advances to engine selection after choosing a model", async () => {
    const user = userEvent.setup();
    render(<ConfiguratorClient bootstrapData={getBootstrapData()} session={{ user: null }} />);

    expect(await screen.findByText(/Enterprise Car Configuration Platform/i)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Atlas SUV vehicle artwork/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Atlas SUV/i }));

    expect(await screen.findByText("Powertrain selection")).toBeInTheDocument();
    expect(await screen.findByText(/Dual Motor Electric/i)).toBeInTheDocument();

    const fetchMock = vi.mocked(global.fetch);
    await waitFor(() => {
      const evaluateCalls = fetchMock.mock.calls.filter(
        ([url, init]) => url === "/api/evaluate" && init?.method === "POST",
      );
      expect(evaluateCalls.length).toBeGreaterThan(1);

      const latestBody = JSON.parse(String(evaluateCalls.at(-1)?.[1]?.body));
      expect(latestBody.configuration.modelCode).toBe("ATLAS_SUV");
    });
  });

  it("preserves the draft and redirects unauthenticated users to login when saving", async () => {
    const user = userEvent.setup();
    const assignSpy = vi.spyOn(window.location, "assign").mockImplementation(() => {});

    render(<ConfiguratorClient bootstrapData={getBootstrapData()} session={{ user: null }} />);

    await user.click(await screen.findByRole("button", { name: /Atlas SUV/i }));
    await user.click(screen.getByRole("button", { name: /9\. Review & Save/i }));
    await user.click(screen.getByRole("button", { name: /Save quote/i }));

    await waitFor(() => {
      expect(assignSpy).toHaveBeenCalledWith("/login?returnTo=%2F%3Fresume%3Dsave");
    });

    const draft = JSON.parse(window.localStorage.getItem("ecp_configurator_draft_v1") ?? "null");
    expect(draft).toMatchObject({
      customerName: "Diptee Demo",
      configuration: { modelCode: "ATLAS_SUV" },
    });
  });
});