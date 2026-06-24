/**
 * Tests for all TriggerType values: matchesTriggerConfig filters + dispatch functions.
 */
import { describe, it, expect, vi, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// matchesTriggerConfig tests
// ---------------------------------------------------------------------------
import { SaasWorkflowService } from "../SaasWorkflowService";

const makeDb = () => ({ query: vi.fn(async () => []) });

function makeSvc() {
  return new SaasWorkflowService(makeDb() as never, {} as never);
}

describe("matchesTriggerConfig — all trigger types", () => {
  const svc = makeSvc();

  it("contact_created: always matches (no config filter)", () => {
    expect(svc.matchesTriggerConfig("contact_created", {}, { contact: { id: "c1" } })).toBe(true);
  });

  it("deal_stage_changed: stage_to filter passes when stage matches", () => {
    expect(svc.matchesTriggerConfig("deal_stage_changed", { stage_to: "won" }, { deal: { stage: "won" } })).toBe(true);
  });

  it("deal_stage_changed: stage_to filter fails when stage differs", () => {
    expect(svc.matchesTriggerConfig("deal_stage_changed", { stage_to: "won" }, { deal: { stage: "lost" } })).toBe(false);
  });

  it("email_opened: matches without campania_id filter", () => {
    expect(svc.matchesTriggerConfig("email_opened", {}, { email: { campaniaId: "c1" } })).toBe(true);
  });

  it("email_opened: campania_id filter passes when matches", () => {
    expect(svc.matchesTriggerConfig("email_opened", { campania_id: "c1" }, { email: { campaniaId: "c1" } })).toBe(true);
  });

  it("email_opened: campania_id filter blocks wrong campania", () => {
    expect(svc.matchesTriggerConfig("email_opened", { campania_id: "c1" }, { email: { campaniaId: "c2" } })).toBe(false);
  });

  it("email_clicked: campania_id filter works", () => {
    expect(svc.matchesTriggerConfig("email_clicked", { campania_id: "camp1" }, { email: { campaniaId: "camp1", url: "https://x.com" } })).toBe(true);
    expect(svc.matchesTriggerConfig("email_clicked", { campania_id: "camp1" }, { email: { campaniaId: "camp2" } })).toBe(false);
  });

  it("webhook_in: no source filter always matches", () => {
    expect(svc.matchesTriggerConfig("webhook_in", {}, { source: "stripe", payload: {} })).toBe(true);
  });

  it("webhook_in: source filter passes when matches", () => {
    expect(svc.matchesTriggerConfig("webhook_in", { source: "stripe" }, { source: "stripe" })).toBe(true);
  });

  it("webhook_in: source filter blocks wrong source", () => {
    expect(svc.matchesTriggerConfig("webhook_in", { source: "stripe" }, { source: "shopify" })).toBe(false);
  });

  it("date_reached: no date config always matches", () => {
    expect(svc.matchesTriggerConfig("date_reached", {}, {})).toBe(true);
  });

  it("date_reached: date filter passes when config date is today", () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(svc.matchesTriggerConfig("date_reached", { date: today }, {})).toBe(true);
  });

  it("date_reached: date filter blocks past date", () => {
    expect(svc.matchesTriggerConfig("date_reached", { date: "2020-01-01" }, {})).toBe(false);
  });

  it("tag_added: no tag config always matches", () => {
    expect(svc.matchesTriggerConfig("tag_added", {}, { tag: "vip" })).toBe(true);
  });

  it("tag_added: tag filter passes on exact match", () => {
    expect(svc.matchesTriggerConfig("tag_added", { tag: "vip" }, { tag: "vip" })).toBe(true);
  });

  it("tag_added: tag filter blocks wrong tag", () => {
    expect(svc.matchesTriggerConfig("tag_added", { tag: "vip" }, { tag: "cold" })).toBe(false);
  });

  it("form_submitted: form_id filter passes on match", () => {
    expect(svc.matchesTriggerConfig("form_submitted", { form_id: "f1" }, { form: { id: "f1" } })).toBe(true);
  });

  it("form_submitted: form_id filter blocks wrong form", () => {
    expect(svc.matchesTriggerConfig("form_submitted", { form_id: "f1" }, { form: { id: "f2" } })).toBe(false);
  });

  it("scheduled: always matches (no config filter)", () => {
    expect(svc.matchesTriggerConfig("scheduled", {}, {})).toBe(true);
  });

  it("manual: always matches", () => {
    expect(svc.matchesTriggerConfig("manual", {}, {})).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Dispatch function tests
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Dispatch function tests — use vi.resetModules() + vi.doMock for each test
// since saasWorkflowDispatch lazy-imports SaasWorkflowService via dynamic import().
// ---------------------------------------------------------------------------

describe("dispatchEmailOpened", () => {
  it("calls dispatchActiveWorkflows with email_opened and correct data", async () => {
    vi.resetModules();
    const mockDispatch = vi.fn().mockResolvedValue(undefined);
    vi.doMock("../SaasWorkflowService", () => ({
      getSaasWorkflowService: () => ({ dispatchActiveWorkflows: mockDispatch }),
    }));
    const { dispatchEmailOpened } = await import("../saasWorkflowDispatch");
    await dispatchEmailOpened("tenant-1", "camp-1", "contact-1");
    expect(mockDispatch).toHaveBeenCalledWith("tenant-1", "email_opened", {
      email: { campaniaId: "camp-1", contactId: "contact-1" },
    });
  });

  it("does not throw if workflow service errors", async () => {
    vi.resetModules();
    vi.doMock("../SaasWorkflowService", () => ({
      getSaasWorkflowService: () => ({ dispatchActiveWorkflows: vi.fn().mockRejectedValue(new Error("DB down")) }),
    }));
    const { dispatchEmailOpened } = await import("../saasWorkflowDispatch");
    await expect(dispatchEmailOpened("t", "c", "r")).resolves.toBeUndefined();
  });
});

describe("dispatchEmailClicked", () => {
  it("calls dispatchActiveWorkflows with email_clicked and url", async () => {
    vi.resetModules();
    const mockDispatch = vi.fn().mockResolvedValue(undefined);
    vi.doMock("../SaasWorkflowService", () => ({
      getSaasWorkflowService: () => ({ dispatchActiveWorkflows: mockDispatch }),
    }));
    const { dispatchEmailClicked } = await import("../saasWorkflowDispatch");
    await dispatchEmailClicked("tenant-1", "camp-1", "contact-1", "https://example.com");
    expect(mockDispatch).toHaveBeenCalledWith("tenant-1", "email_clicked", {
      email: { campaniaId: "camp-1", contactId: "contact-1", url: "https://example.com" },
    });
  });
});

describe("dispatchWebhookIn", () => {
  it("calls dispatchActiveWorkflows with webhook_in, source and payload", async () => {
    vi.resetModules();
    const mockDispatch = vi.fn().mockResolvedValue(undefined);
    vi.doMock("../SaasWorkflowService", () => ({
      getSaasWorkflowService: () => ({ dispatchActiveWorkflows: mockDispatch }),
    }));
    const { dispatchWebhookIn } = await import("../saasWorkflowDispatch");
    await dispatchWebhookIn("tenant-1", "stripe", { event: "payment_intent.succeeded" });
    expect(mockDispatch).toHaveBeenCalledWith("tenant-1", "webhook_in", {
      source: "stripe",
      payload: { event: "payment_intent.succeeded" },
    });
  });

  it("does not throw on service error", async () => {
    vi.resetModules();
    vi.doMock("../SaasWorkflowService", () => ({
      getSaasWorkflowService: () => ({ dispatchActiveWorkflows: vi.fn().mockRejectedValue(new Error("fail")) }),
    }));
    const { dispatchWebhookIn } = await import("../saasWorkflowDispatch");
    await expect(dispatchWebhookIn("t", "src", {})).resolves.toBeUndefined();
  });
});

describe("dispatchDateReached", () => {
  it("calls dispatchActiveWorkflows with date_reached and today's date", async () => {
    vi.resetModules();
    const mockDispatch = vi.fn().mockResolvedValue(undefined);
    vi.doMock("../SaasWorkflowService", () => ({
      getSaasWorkflowService: () => ({ dispatchActiveWorkflows: mockDispatch }),
    }));
    const { dispatchDateReached } = await import("../saasWorkflowDispatch");
    const today = new Date().toISOString().slice(0, 10);
    await dispatchDateReached("tenant-1");
    expect(mockDispatch).toHaveBeenCalledWith("tenant-1", "date_reached", { date: today });
  });

  it("does not throw on service error", async () => {
    vi.resetModules();
    vi.doMock("../SaasWorkflowService", () => ({
      getSaasWorkflowService: () => ({ dispatchActiveWorkflows: vi.fn().mockRejectedValue(new Error("fail")) }),
    }));
    const { dispatchDateReached } = await import("../saasWorkflowDispatch");
    await expect(dispatchDateReached("t")).resolves.toBeUndefined();
  });
});
