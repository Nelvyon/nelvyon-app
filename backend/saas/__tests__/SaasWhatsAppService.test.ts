import { describe, it, expect, vi, beforeEach } from "vitest";
import { SaasWhatsAppService, SaasWhatsAppError, resetSaasWhatsAppServiceForTests } from "../SaasWhatsAppService";

beforeEach(() => { resetSaasWhatsAppServiceForTests(); vi.unstubAllEnvs(); });

function makeDb(rows: Record<string, unknown[]> = {}) {
  return {
    query: vi.fn().mockImplementation(async (sql: string) => {
      if (sql.includes("conversations") && sql.includes("SELECT")) return rows.conversations ?? [];
      if (sql.includes("INSERT INTO conversations")) return [{ id: "conv-1" }];
      if (sql.includes("saas_sms_log") && sql.includes("INSERT")) {
        return [{ id: "msg-1", tenant_id: "t1", conversation_id: null, to_number: "+34612345678",
          body: "Hola", twilio_sid: "SM123", status: "sent", contact_id: null, created_at: new Date() }];
      }
      if (sql.includes("UPDATE conversations")) return [];
      if (sql.includes("saas_sms_log") && sql.includes("SELECT")) return [];
      return rows.default ?? [];
    }),
  };
}

function mockFetch(ok: boolean, json: unknown) {
  return vi.fn().mockResolvedValue({ ok, json: () => Promise.resolve(json) });
}

describe("SaasWhatsAppService.getConfig", () => {
  it("returns configured=false when env vars missing", () => {
    const svc = new SaasWhatsAppService(makeDb() as never);
    const cfg = svc.getConfig();
    expect(cfg.configured).toBe(false);
    expect(cfg.fromNumber).toBeNull();
  });

  it("returns configured=true when all env vars set", () => {
    vi.stubEnv("TWILIO_ACCOUNT_SID", "AC123");
    vi.stubEnv("TWILIO_AUTH_TOKEN", "tok");
    vi.stubEnv("TWILIO_FROM_WHATSAPP", "+14155238886");
    const svc = new SaasWhatsAppService(makeDb() as never);
    const cfg = svc.getConfig();
    expect(cfg.configured).toBe(true);
    expect(cfg.fromNumber).toBe("whatsapp:+14155238886");
  });
});

describe("SaasWhatsAppService.send", () => {
  it("throws NOT_CONFIGURED when creds missing", async () => {
    const svc = new SaasWhatsAppService(makeDb() as never);
    await expect(svc.send("t1", { to: "+34612345678", body: "Hola" }))
      .rejects.toThrow(expect.objectContaining({ code: "NOT_CONFIGURED" }));
  });

  it("throws VALIDATION for empty to", async () => {
    vi.stubEnv("TWILIO_ACCOUNT_SID", "AC123");
    vi.stubEnv("TWILIO_AUTH_TOKEN", "tok");
    vi.stubEnv("TWILIO_FROM_WHATSAPP", "+14155238886");
    const svc = new SaasWhatsAppService(makeDb() as never);
    await expect(svc.send("t1", { to: "  ", body: "Hola" }))
      .rejects.toThrow(expect.objectContaining({ code: "VALIDATION" }));
  });

  it("sends successfully and returns message", async () => {
    vi.stubEnv("TWILIO_ACCOUNT_SID", "AC123");
    vi.stubEnv("TWILIO_AUTH_TOKEN", "tok");
    vi.stubEnv("TWILIO_FROM_WHATSAPP", "+14155238886");
    const fetchFn = mockFetch(true, { sid: "SM123" });
    const svc = new SaasWhatsAppService(makeDb() as never, fetchFn as never);
    const msg = await svc.send("t1", { to: "+34612345678", body: "Hola" });
    expect(msg.status).toBe("sent");
    expect(msg.twilioSid).toBe("SM123");
    expect(fetchFn).toHaveBeenCalledOnce();
  });

  it("marks message as failed when Twilio errors", async () => {
    vi.stubEnv("TWILIO_ACCOUNT_SID", "AC123");
    vi.stubEnv("TWILIO_AUTH_TOKEN", "tok");
    vi.stubEnv("TWILIO_FROM_WHATSAPP", "+14155238886");
    const fetchFn = mockFetch(false, { message: "Invalid number", code: 21211 });
    const svc = new SaasWhatsAppService(makeDb() as never, fetchFn as never);
    await expect(svc.send("t1", { to: "+34000000000", body: "Test" }))
      .rejects.toThrow(SaasWhatsAppError);
  });
});

describe("SaasWhatsAppService.listMessages", () => {
  it("returns empty array when no messages", async () => {
    const svc = new SaasWhatsAppService(makeDb() as never);
    const msgs = await svc.listMessages("t1");
    expect(msgs).toEqual([]);
  });
});
