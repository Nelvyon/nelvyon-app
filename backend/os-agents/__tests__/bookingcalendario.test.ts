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
  BookingCalendarioAnalyticsAgent,
  BookingCalendarioBookingAgent,
  BookingCalendarioOptimizationAgent,
  BookingCalendarioPaymentAgent,
  BookingCalendarioReminderAgent,
  BookingCalendarioReportAgent,
  BookingCalendarioSchedulerAgent,
  BookingCalendarioSyncAgent,
  resetAllBookingCalendarioAgentsForTests,
} from "../sectors/bookingcalendario";

const BC_JSON = JSON.stringify({
  content:
    "BookingCalendario: reserva <60s, no-shows >60%, sync <30s, pagos instantáneos, 24/7, multi-timezone.",
  score: 94,
  highlights: ["<60s", ">60% no-show", "<30s sync"],
  metrics: ["No-show rate"],
});

const bookingCalendarioInput = {
  userId: "00000000-0000-0000-0000-00000000bc01",
  sector: "saas",
  brand: "SaaS demo",
  bookingBrief: "Reservas 24/7 · sync · pagos",
  metricsBrief: "No-show · ocupación",
};

type BookingCalendarioOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("BookingCalendario agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(BC_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllBookingCalendarioAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as BookingCalendarioOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("BookingCalendarioSchedulerAgent", async () => {
    await assertOutput("bookingcalendario-scheduler", () => BookingCalendarioSchedulerAgent.instance.run(bookingCalendarioInput));
  });

  it("BookingCalendarioBookingAgent", async () => {
    await assertOutput("bookingcalendario-booking", () => BookingCalendarioBookingAgent.instance.run(bookingCalendarioInput));
  });

  it("BookingCalendarioReminderAgent", async () => {
    await assertOutput("bookingcalendario-reminder", () => BookingCalendarioReminderAgent.instance.run(bookingCalendarioInput));
  });

  it("BookingCalendarioPaymentAgent", async () => {
    await assertOutput("bookingcalendario-payment", () => BookingCalendarioPaymentAgent.instance.run(bookingCalendarioInput));
  });

  it("BookingCalendarioSyncAgent", async () => {
    await assertOutput("bookingcalendario-sync", () => BookingCalendarioSyncAgent.instance.run(bookingCalendarioInput));
  });

  it("BookingCalendarioAnalyticsAgent", async () => {
    await assertOutput("bookingcalendario-analytics", () => BookingCalendarioAnalyticsAgent.instance.run(bookingCalendarioInput));
  });

  it("BookingCalendarioOptimizationAgent", async () => {
    await assertOutput("bookingcalendario-optimization", () =>
      BookingCalendarioOptimizationAgent.instance.run(bookingCalendarioInput),
    );
  });

  it("BookingCalendarioReportAgent", async () => {
    await assertOutput("bookingcalendario-report", () => BookingCalendarioReportAgent.instance.run(bookingCalendarioInput));
  });
});
