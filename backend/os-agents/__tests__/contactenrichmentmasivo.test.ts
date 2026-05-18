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
  ContactEnrichmentMasivoCompanyAgent,
  ContactEnrichmentMasivoDedupeAgent,
  ContactEnrichmentMasivoEmailAgent,
  ContactEnrichmentMasivoICPAgent,
  ContactEnrichmentMasivoLinkedInAgent,
  ContactEnrichmentMasivoPhoneAgent,
  ContactEnrichmentMasivoReportAgent,
  ContactEnrichmentMasivoSocialAgent,
  resetAllContactEnrichmentMasivoAgentsForTests,
} from "../sectors/contactenrichmentmasivo";

const CEM_JSON = JSON.stringify({
  content:
    "ContactEnrichmentMasivo: 100K <5min, >90% email, >75% LinkedIn, 100% ICP, >99% dedupe, refresh 30d.",
  score: 91,
  highlights: ["100K <5min", ">90% email", ">75% LinkedIn"],
  metrics: ["Enrichment throughput"],
});

const contactEnrichmentMasivoInput = {
  userId: "00000000-0000-0000-0000-00000000cem1",
  sector: "b2b",
  brand: "B2B demo",
  contactBrief: "100K contactos · CRM export",
  metricsBrief: "Email coverage · LinkedIn match",
};

type ContactEnrichmentMasivoOutputShape = {
  agentId: string;
  content: string;
  score: number;
  highlights: string[];
  metrics: string[];
};

describe("ContactEnrichmentMasivo agents", () => {
  beforeEach(() => {
    queryMock.mockReset();
    queryMock.mockResolvedValue([]);
    completeMock.mockReset();
    completeMock.mockResolvedValue(CEM_JSON);
    vi.stubGlobal("fetch", vi.fn(async () => new Response()));
    resetAllContactEnrichmentMasivoAgentsForTests();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function assertOutput(agentId: string, runFn: () => Promise<unknown>): Promise<void> {
    const out = (await runFn()) as ContactEnrichmentMasivoOutputShape;
    expect(out.agentId).toBe(agentId);
    expect(out.content.length).toBeGreaterThan(0);
    expect(out.highlights.length).toBeGreaterThanOrEqual(1);
    expect(out.metrics.length).toBeGreaterThanOrEqual(1);
  }

  it("ContactEnrichmentMasivoEmailAgent", async () => {
    await assertOutput("contactenrichmentmasivo-email", () =>
      ContactEnrichmentMasivoEmailAgent.instance.run(contactEnrichmentMasivoInput),
    );
  });

  it("ContactEnrichmentMasivoPhoneAgent", async () => {
    await assertOutput("contactenrichmentmasivo-phone", () =>
      ContactEnrichmentMasivoPhoneAgent.instance.run(contactEnrichmentMasivoInput),
    );
  });

  it("ContactEnrichmentMasivoLinkedInAgent", async () => {
    await assertOutput("contactenrichmentmasivo-linkedin", () =>
      ContactEnrichmentMasivoLinkedInAgent.instance.run(contactEnrichmentMasivoInput),
    );
  });

  it("ContactEnrichmentMasivoCompanyAgent", async () => {
    await assertOutput("contactenrichmentmasivo-company", () =>
      ContactEnrichmentMasivoCompanyAgent.instance.run(contactEnrichmentMasivoInput),
    );
  });

  it("ContactEnrichmentMasivoSocialAgent", async () => {
    await assertOutput("contactenrichmentmasivo-social", () =>
      ContactEnrichmentMasivoSocialAgent.instance.run(contactEnrichmentMasivoInput),
    );
  });

  it("ContactEnrichmentMasivoICPAgent", async () => {
    await assertOutput("contactenrichmentmasivo-icp", () =>
      ContactEnrichmentMasivoICPAgent.instance.run(contactEnrichmentMasivoInput),
    );
  });

  it("ContactEnrichmentMasivoDedupeAgent", async () => {
    await assertOutput("contactenrichmentmasivo-dedupe", () =>
      ContactEnrichmentMasivoDedupeAgent.instance.run(contactEnrichmentMasivoInput),
    );
  });

  it("ContactEnrichmentMasivoReportAgent", async () => {
    await assertOutput("contactenrichmentmasivo-report", () =>
      ContactEnrichmentMasivoReportAgent.instance.run(contactEnrichmentMasivoInput),
    );
  });
});
