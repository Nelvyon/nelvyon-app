/**
 * Tests for SaasWhatsAppCloudService — Meta Cloud API (no real HTTP calls).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  SaasWhatsAppCloudService,
  resetSaasWhatsAppCloudServiceForTests,
  SaasWhatsAppCloudError,
  isMetaWaConfigured,
  getMetaVerifyToken,
} from "../SaasWhatsAppCloudService";

const TENANT = "tenant-wa-cloud";
const now = new Date();

function makeDb(rows: Record<string, unknown>[][] = []) {
  let call = 0;
  return { query: vi.fn(async () => rows[call++] ?? []) };
}

function makeFetch(status: number, body: unknown) {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })) as unknown as typeof fetch;
}

describe("isMetaWaConfigured", () => {
  afterEach(() => { vi.unstubAllEnvs(); });

  it("returns false when META_WA_PHONE_NUMBER_ID missing", () => {
    vi.stubEnv("META_WA_PHONE_NUMBER_ID", "");
    vi.stubEnv("META_WA_ACCESS_TOKEN", "tok");
    expect(isMetaWaConfigured()).toBe(false);
  });

  it("returns false when META_WA_ACCESS_TOKEN missing", () => {
    vi.stubEnv("META_WA_PHONE_NUMBER_ID", "123");
    vi.stubEnv("META_WA_ACCESS_TOKEN", "");
    expect(isMetaWaConfigured()).toBe(false);
  });

  it("returns true when both vars set", () => {
    vi.stubEnv("META_WA_PHONE_NUMBER_ID", "123456");
    vi.stubEnv("META_WA_ACCESS_TOKEN", "EAA-token");
    expect(isMetaWaConfigured()).toBe(true);
  });
});

describe("getMetaVerifyToken", () => {
  afterEach(() => { vi.unstubAllEnvs(); });

  it("returns null when not set", () => {
    vi.stubEnv("META_WA_VERIFY_TOKEN", "");
    expect(getMetaVerifyToken()).toBeNull();
  });

  it("returns token when set", () => {
    vi.stubEnv("META_WA_VERIFY_TOKEN", "my-secret-token");
    expect(getMetaVerifyToken()).toBe("my-secret-token");
  });
});

describe("SaasWhatsAppCloudService — not configured", () => {
  beforeEach(() => {
    vi.stubEnv("META_WA_PHONE_NUMBER_ID", "");
    vi.stubEnv("META_WA_ACCESS_TOKEN", "");
    resetSaasWhatsAppCloudServiceForTests();
  });
  afterEach(() => { vi.unstubAllEnvs(); resetSaasWhatsAppCloudServiceForTests(); });

  it("getConfig returns configured=false", () => {
    const db = makeDb();
    const svc = new SaasWhatsAppCloudService(db as never);
    expect(svc.getConfig()).toEqual({ configured: false, phoneNumberId: null, provider: null });
  });

  it("send throws NOT_CONFIGURED", async () => {
    const db = makeDb();
    const svc = new SaasWhatsAppCloudService(db as never);
    await expect(svc.send(TENANT, { to: "+34600000000", body: "test" }))
      .rejects.toMatchObject({ code: "NOT_CONFIGURED" });
  });

  it("send throws VALIDATION when to is empty", async () => {
    const db = makeDb();
    const svc = new SaasWhatsAppCloudService(db as never);
    await expect(svc.send(TENANT, { to: "", body: "test" }))
      .rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("send throws VALIDATION when body is empty and no templateName", async () => {
    const db = makeDb();
    const svc = new SaasWhatsAppCloudService(db as never);
    await expect(svc.send(TENANT, { to: "+34600000000", body: "" }))
      .rejects.toMatchObject({ code: "VALIDATION" });
  });
});

describe("SaasWhatsAppCloudService — configured", () => {
  beforeEach(() => {
    vi.stubEnv("META_WA_PHONE_NUMBER_ID", "123456789");
    vi.stubEnv("META_WA_ACCESS_TOKEN", "EAA-test-token");
    resetSaasWhatsAppCloudServiceForTests();
  });
  afterEach(() => { vi.unstubAllEnvs(); resetSaasWhatsAppCloudServiceForTests(); });

  it("getConfig returns configured=true with provider=meta", () => {
    const db = makeDb();
    const svc = new SaasWhatsAppCloudService(db as never);
    const cfg = svc.getConfig();
    expect(cfg.configured).toBe(true);
    expect(cfg.provider).toBe("meta");
    expect(cfg.phoneNumberId).toBe("123456789");
  });

  it("send calls Meta Graph API and returns message with wamid", async () => {
    const fetchMock = makeFetch(200, { messages: [{ id: "wamid.abc123" }] });
    const convRow = { id: "conv-1" };
    const msgRow = {
      id: "msg-1", tenant_id: TENANT, conversation_id: null,
      to_number: "+34699000111", body: "Hola", twilio_sid: "wamid.abc123",
      status: "sent", contact_id: null, created_at: now,
    };
    // DB calls: SELECT conv (found), INSERT saas_sms_log, UPDATE conv
    const db = makeDb([[convRow], [msgRow], []]);
    const svc = new SaasWhatsAppCloudService(db as never, fetchMock);
    const result = await svc.send(TENANT, { to: "+34699000111", body: "Hola" });
    expect(result.metaWamid).toBe("wamid.abc123");
    expect(result.status).toBe("sent");
    // Verify API was called with correct URL
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("123456789/messages"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("stores failed status when Meta API returns error", async () => {
    const fetchMock = makeFetch(400, { error: { message: "Invalid phone" } });
    const msgRow = {
      id: "msg-err", tenant_id: TENANT, conversation_id: null,
      to_number: "+34600000000", body: "test", twilio_sid: null,
      status: "failed", contact_id: null, created_at: now,
    };
    // DB: SELECT conv (not found), INSERT conv, INSERT sms_log (returns failed), UPDATE conv
    const db = makeDb([[], [{ id: "conv-new" }], [msgRow], []]);
    const svc = new SaasWhatsAppCloudService(db as never, fetchMock);
    await expect(svc.send(TENANT, { to: "+34600000000", body: "test" }))
      .rejects.toMatchObject({ code: "SEND_FAILED" });
  });

  it("processInbound creates conversation and stores message", async () => {
    // DB: SELECT conv (not found), INSERT conv, INSERT saas_messages
    const db = makeDb([[], [{ id: "conv-inbound" }], []]);
    const svc = new SaasWhatsAppCloudService(db as never);
    await expect(svc.processInbound(TENANT, {
      from: "+34612345678",
      waId: "34612345678",
      wamid: "wamid.inbound.1",
      body: "Hola, quiero info",
      timestamp: 1700000000,
    })).resolves.toBeUndefined();
    // Verify INSERT saas_messages was called
    const insertMsgCall = (db.query.mock.calls as Array<[string]>)
      .find(([sql]) => sql.includes("INSERT INTO saas_messages"));
    expect(insertMsgCall).toBeDefined();
  });

  it("processInbound updates existing conversation when found", async () => {
    const db = makeDb([[{ id: "conv-existing" }], [], []]);
    const svc = new SaasWhatsAppCloudService(db as never);
    await svc.processInbound(TENANT, {
      from: "+34699000111", waId: "34699000111",
      wamid: "wamid.2", body: "Respuesta", timestamp: 1700001000,
    });
    const updateCall = (db.query.mock.calls as Array<[string]>)
      .find(([sql]) => sql.includes("UPDATE conversations"));
    expect(updateCall).toBeDefined();
  });
});

describe("SaasWhatsAppCloudService — empty state (no config)", () => {
  it("listMessages returns empty array when no data", async () => {
    vi.stubEnv("META_WA_PHONE_NUMBER_ID", "");
    vi.stubEnv("META_WA_ACCESS_TOKEN", "");
    const db = makeDb([[]]);
    const svc = new SaasWhatsAppCloudService(db as never);
    expect(await svc.listMessages("t", { limit: 10 })).toEqual([]);
    vi.unstubAllEnvs();
  });
});
