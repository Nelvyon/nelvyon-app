import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  DatabaseImportCleanerAgent,
  DatabaseImportEnricherAgent,
  DatabaseImportMappingAgent,
  DatabaseImportParserAgent,
  DatabaseImportReportAgent,
  DatabaseImportScoringAgent,
  DatabaseImportSegmentAgent,
  DatabaseImportValidatorAgent,
  resetAllDatabaseImportAgentsForTests,
} from "../sectors/databaseimport";

const DI_JSON = JSON.stringify({
  content: "DatabaseImport: 1M <60s, 100% validation, >99% dedupe, >85% enrich, <10s segment, CSV Excel JSON XML Sheets.",
  score: 91,
  highlights: ["1M <60s", "100% validation", ">99% dedupe"],
  metrics: ["Import throughput"],
});

const databaseImportInput = {
  userId: "00000000-0000-0000-0000-00000000di01",
  sector: "b2b",
  brand: "B2B demo",
  importBrief: "CSV leads · 500k rows",
  metricsBrief: "Dedup rate · enrichment rate",
};

type DatabaseImportOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("DatabaseImport agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(DI_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllDatabaseImportAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as DatabaseImportOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("DatabaseImportParserAgent", async () => {
    await assertOutput("databaseimport-parser", () => DatabaseImportParserAgent.instance.run(databaseImportInput));
  });

  it("DatabaseImportValidatorAgent", async () => {
    await assertOutput("databaseimport-validator", () => DatabaseImportValidatorAgent.instance.run(databaseImportInput));
  });

  it("DatabaseImportCleanerAgent", async () => {
    await assertOutput("databaseimport-cleaner", () => DatabaseImportCleanerAgent.instance.run(databaseImportInput));
  });

  it("DatabaseImportSegmentAgent", async () => {
    await assertOutput("databaseimport-segment", () => DatabaseImportSegmentAgent.instance.run(databaseImportInput));
  });

  it("DatabaseImportEnricherAgent", async () => {
    await assertOutput("databaseimport-enricher", () => DatabaseImportEnricherAgent.instance.run(databaseImportInput));
  });

  it("DatabaseImportScoringAgent", async () => {
    await assertOutput("databaseimport-scoring", () => DatabaseImportScoringAgent.instance.run(databaseImportInput));
  });

  it("DatabaseImportMappingAgent", async () => {
    await assertOutput("databaseimport-mapping", () => DatabaseImportMappingAgent.instance.run(databaseImportInput));
  });

  it("DatabaseImportReportAgent", async () => {
    await assertOutput("databaseimport-report", () => DatabaseImportReportAgent.instance.run(databaseImportInput));
  });
});
