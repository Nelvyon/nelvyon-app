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
  TimezoneAuditAgent,
  TimezoneCalendarAgent,
  TimezoneConverterAgent,
  TimezoneDetectorAgent,
  TimezoneNotifierAgent,
  TimezoneOptimalAgent,
  TimezoneReportAgent,
  TimezoneSchedulerAgent,
  resetAllTimezoneAgentsForTests,
} from "../sectors/timezone";

const TZ_JSON = JSON.stringify({
  content:
    "Europe/Madrid; silencio 22–08 local; ecommerce ventana 20h; UTC + vista local en informes.",
  score: 92,
  highlights: ["IANA Madrid", "No molestar", "Reporting dual"],
  metrics: ["Slot óptimo"],
});

const timezoneInput = {
  userId: "00000000-0000-0000-0000-00000000tz01",
  sector: "ecommerce",
  brand: "ShopDemo",
  countryCode: "ES",
  preferredTimezone: "Europe/Madrid" as const,
  referenceTimestamp: "2026-05-09T15:00:00Z",
  metricsBrief: "Push campaign EU",
};

type TimezoneOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("Timezone agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(TZ_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllTimezoneAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as TimezoneOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("TimezoneDetectorAgent", async () => {
    await assertOutput("timezone-detector", () => TimezoneDetectorAgent.instance.run(timezoneInput));
  });

  it("TimezoneSchedulerAgent", async () => {
    await assertOutput("timezone-scheduler", () => TimezoneSchedulerAgent.instance.run(timezoneInput));
  });

  it("TimezoneConverterAgent", async () => {
    await assertOutput("timezone-converter", () => TimezoneConverterAgent.instance.run(timezoneInput));
  });

  it("TimezoneOptimalAgent", async () => {
    await assertOutput("timezone-optimal", () => TimezoneOptimalAgent.instance.run(timezoneInput));
  });

  it("TimezoneNotifierAgent", async () => {
    await assertOutput("timezone-notifier", () => TimezoneNotifierAgent.instance.run(timezoneInput));
  });

  it("TimezoneReportAgent", async () => {
    await assertOutput("timezone-report", () => TimezoneReportAgent.instance.run(timezoneInput));
  });

  it("TimezoneCalendarAgent", async () => {
    await assertOutput("timezone-calendar", () => TimezoneCalendarAgent.instance.run(timezoneInput));
  });

  it("TimezoneAuditAgent", async () => {
    await assertOutput("timezone-audit", () => TimezoneAuditAgent.instance.run(timezoneInput));
  });
});
