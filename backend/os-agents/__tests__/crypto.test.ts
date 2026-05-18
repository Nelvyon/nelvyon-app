// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

const queryMock = vi.fn();

vi.mock("../../db/DbClient", () => ({
  DbClient: {
    getInstance: () => ({ query: queryMock }),
  },
}));

const completeMock = vi.fn();

vi.mock("../LlmClient", () => ({
  LlmClient: {
    getInstance: () => ({
      complete: completeMock,
    }),
  },
  LLM_DEFAULT_MAX_TOKENS: 4000,
  LLM_DEFAULT_MODEL: "gpt-4o",
}));

import {
  CryptoAnalyticsAgent,
  CryptoComunidadAgent,
  CryptoEmailAgent,
  CryptoLaunchAgent,
  CryptoPreciosAgent,
  CryptoReviewsAgent,
  CryptoSEOAgent,
  CryptoSocialAgent,
  resetAllCryptoAgentsForTests,
} from "../sectors/crypto";

const CR_JSON = JSON.stringify({
  result: "Web3: comunidad, launch y métricas on-chain agregadas.",
  score: 93,
  recommendations: ["Discord roles", "TGE checklist", "Dashboard TVL"],
});

const cryptoInput = {
  userId: "00000000-0000-0000-0000-00000000cr01",
  businessName: "Protocolo demo",
  services: ["DeFi", "DAO"],
  targets: ["holders"],
};

describe("Crypto agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(CR_JSON);
    resetAllCryptoAgentsForTests();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as { agentId: string; result: string; score: number; recommendations: string[] };
    expect(out.agentId).toBe(agentId);
    expect(out.result.length).toBeGreaterThan(0);
    expect(out.recommendations.length).toBeGreaterThanOrEqual(1);
  }

  it("CryptoComunidadAgent", async () => {
    await assertOutput("crypto-comunidad", () => CryptoComunidadAgent.instance().run(cryptoInput));
  });

  it("CryptoLaunchAgent", async () => {
    await assertOutput("crypto-launch", () => CryptoLaunchAgent.instance().run(cryptoInput));
  });

  it("CryptoPreciosAgent", async () => {
    await assertOutput("crypto-precios", () => CryptoPreciosAgent.instance().run(cryptoInput));
  });

  it("CryptoSEOAgent", async () => {
    await assertOutput("crypto-seo", () => CryptoSEOAgent.instance().run(cryptoInput));
  });

  it("CryptoSocialAgent", async () => {
    await assertOutput("crypto-social", () => CryptoSocialAgent.instance().run(cryptoInput));
  });

  it("CryptoEmailAgent", async () => {
    await assertOutput("crypto-email", () => CryptoEmailAgent.instance().run(cryptoInput));
  });

  it("CryptoReviewsAgent", async () => {
    await assertOutput("crypto-reviews", () => CryptoReviewsAgent.instance().run(cryptoInput));
  });

  it("CryptoAnalyticsAgent", async () => {
    await assertOutput("crypto-analytics", () => CryptoAnalyticsAgent.instance().run(cryptoInput));
  });
});
