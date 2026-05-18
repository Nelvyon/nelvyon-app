// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();
const dbMock = { query: queryMock };

vi.mock("../../db/DbClient", () => ({
  DbClient: {
    getInstance: () => dbMock,
  },
}));

const llmMock = vi.fn();

vi.mock("../LlmClient", () => ({
  LlmClient: {
    getInstance: () => ({ complete: llmMock }),
  },
}));

import {
  PwaAuditoriaAgent,
  PwaInstalacionAgent,
  PwaNotificacionesAgent,
  PwaOfflineAgent,
  PwaPerformanceAgent,
  PwaResponsiveAgent,
  PwaServiceWorkerAgent,
  PwaSincronizacionAgent,
  resetAllPwaAgentsForTests,
} from "../sectors/pwa";

const PWA_JSON = JSON.stringify({
  result: "PWA OS: manifest, SW y CWV con roadmap medible y sin app store.",
  insights: ["Precache del shell mejora TTFB percibido", "Push con soft ask sube opt-in"],
  recommendedActions: ["Lighthouse CI en main", "Workbox + revisionado SW", "RUM para INP real"],
});

const pwaInput = {
  userId: "00000000-0000-0000-0000-00000000pwa1",
  businessContext: "B2C fintech: dashboard en Next.js, necesidad offline de consulta de saldo y avisos push transaccionales.",
  agentId: "pwa-auditoria",
};

describe("Pwa agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    llmMock.mockReset();
    llmMock.mockResolvedValue(PWA_JSON);
    resetAllPwaAgentsForTests();
  });

  async function assertOutput(runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { result: string; insights: string[]; recommendedActions: string[] };
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.insights.length).toBeGreaterThanOrEqual(1);
    expect(out.recommendedActions.length).toBeGreaterThanOrEqual(1);
  }

  it("PwaAuditoriaAgent", async () => {
    await assertOutput(() => PwaAuditoriaAgent.instance().execute(pwaInput));
  });
  it("PwaServiceWorkerAgent", async () => {
    await assertOutput(() => PwaServiceWorkerAgent.instance().execute(pwaInput));
  });
  it("PwaOfflineAgent", async () => {
    await assertOutput(() => PwaOfflineAgent.instance().execute(pwaInput));
  });
  it("PwaNotificacionesAgent", async () => {
    await assertOutput(() => PwaNotificacionesAgent.instance().execute(pwaInput));
  });
  it("PwaInstalacionAgent", async () => {
    await assertOutput(() => PwaInstalacionAgent.instance().execute(pwaInput));
  });
  it("PwaPerformanceAgent", async () => {
    await assertOutput(() => PwaPerformanceAgent.instance().execute(pwaInput));
  });
  it("PwaSincronizacionAgent", async () => {
    await assertOutput(() => PwaSincronizacionAgent.instance().execute(pwaInput));
  });
  it("PwaResponsiveAgent", async () => {
    await assertOutput(() => PwaResponsiveAgent.instance().execute(pwaInput));
  });
});
