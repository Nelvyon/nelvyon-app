import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SaasSmsService } from "../SaasSmsService";

const TENANT = "tenant-sms";

function makeDb() {
  return { query: vi.fn(async () => []) };
}

describe("SaasSmsService", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    Object.assign(process.env, originalEnv);
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TWILIO_FROM_NUMBER;
    delete process.env.NELVYON_SMS_BULK_ENABLED;
  });

  it("getStatus returns not configured when env missing", () => {
    delete process.env.TWILIO_ACCOUNT_SID;
    const svc = new SaasSmsService(makeDb());
    expect(svc.getStatus()).toEqual({ configured: false, fromNumber: null });
  });

  it("getStatus returns configured when all env set", () => {
    process.env.TWILIO_ACCOUNT_SID = "AC123";
    process.env.TWILIO_AUTH_TOKEN = "token123";
    process.env.TWILIO_FROM_NUMBER = "+15005550006";
    const svc = new SaasSmsService(makeDb());
    const st = svc.getStatus();
    expect(st.configured).toBe(true);
    expect(st.fromNumber).toBe("+15005550006");
  });

  it("send throws NOT_CONFIGURED when Twilio env missing", async () => {
    delete process.env.TWILIO_ACCOUNT_SID;
    const svc = new SaasSmsService(makeDb());
    await expect(svc.send(TENANT, "+34600000001", "Hello")).rejects.toMatchObject({ code: "NOT_CONFIGURED" });
  });

  it("send validates empty to", async () => {
    const svc = new SaasSmsService(makeDb());
    await expect(svc.send(TENANT, "", "Hello")).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("send validates empty body", async () => {
    const svc = new SaasSmsService(makeDb());
    await expect(svc.send(TENANT, "+34600000001", "")).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("send calls Twilio and returns ok when configured", async () => {
    process.env.TWILIO_ACCOUNT_SID = "AC123";
    process.env.TWILIO_AUTH_TOKEN = "token123";
    process.env.TWILIO_FROM_NUMBER = "+15005550006";
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ sid: "SM123abc", status: "queued" }),
    });
    const svc = new SaasSmsService(makeDb(), mockFetch as unknown as typeof fetch);
    const result = await svc.send(TENANT, "+34600000001", "Test message");
    expect(result.ok).toBe(true);
    expect(result.messageSid).toBe("SM123abc");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("send returns ok:false on Twilio error without throwing", async () => {
    process.env.TWILIO_ACCOUNT_SID = "AC123";
    process.env.TWILIO_AUTH_TOKEN = "bad";
    process.env.TWILIO_FROM_NUMBER = "+15005550006";
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ message: "Invalid credentials" }),
    });
    const svc = new SaasSmsService(makeDb(), mockFetch as unknown as typeof fetch);
    const result = await svc.send(TENANT, "+34600000001", "Test");
    expect(result.ok).toBe(false);
    expect(result.error).toContain("Twilio");
  });

  it("sendBulk aggregates results when NELVYON_SMS_BULK_ENABLED=1", async () => {
    process.env.TWILIO_ACCOUNT_SID = "AC123";
    process.env.TWILIO_AUTH_TOKEN = "token";
    process.env.TWILIO_FROM_NUMBER = "+15005550006";
    process.env.NELVYON_SMS_BULK_ENABLED = "1";
    let call = 0;
    const mockFetch = vi.fn().mockImplementation(async () => {
      call++;
      if (call === 1) return { ok: true, json: async () => ({ sid: "SM1", status: "queued" }) };
      return { ok: false, json: async () => ({ message: "Bad number" }) };
    });
    const svc = new SaasSmsService(makeDb(), mockFetch as unknown as typeof fetch);
    const r = await svc.sendBulk(TENANT, ["+34600000001", "+34600000002"], "Hello");
    expect(r.sent).toBe(1);
    expect(r.failed).toBe(1);
    expect(r.results).toHaveLength(2);
  });

  it("sendBulk blocked by default (mass-send fail-closed)", async () => {
    process.env.TWILIO_ACCOUNT_SID = "AC123";
    process.env.TWILIO_AUTH_TOKEN = "token";
    process.env.TWILIO_FROM_NUMBER = "+15005550006";
    delete process.env.NELVYON_SMS_BULK_ENABLED;
    const svc = new SaasSmsService(makeDb(), vi.fn() as unknown as typeof fetch);
    await expect(svc.sendBulk(TENANT, ["+34600000001"], "Hello")).rejects.toMatchObject({
      code: "VALIDATION",
    });
  });

  it("listRecent maps log rows to camelCase entries ordered by the DB query", async () => {
    const db = {
      query: vi.fn(async () => [
        { id: "log-2", to_number: "+34600000002", body: "Hi", twilio_sid: "SM2", status: "sent", created_at: "2026-07-01T10:00:00Z" },
        { id: "log-1", to_number: "+34600000001", body: "Hello", twilio_sid: null, status: "failed", created_at: "2026-06-30T10:00:00Z" },
      ]),
    };
    const svc = new SaasSmsService(db);
    const rows = await svc.listRecent(TENANT, 10);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining("FROM saas_sms_log"), [TENANT, 10]);
    expect(rows).toEqual([
      { id: "log-2", to: "+34600000002", body: "Hi", twilioSid: "SM2", status: "sent", createdAt: "2026-07-01T10:00:00.000Z" },
      { id: "log-1", to: "+34600000001", body: "Hello", twilioSid: null, status: "failed", createdAt: "2026-06-30T10:00:00.000Z" },
    ]);
  });

  it("listRecent clamps limit to the [1, 200] range", async () => {
    const db = makeDb();
    const svc = new SaasSmsService(db);
    await svc.listRecent(TENANT, 999);
    expect(db.query).toHaveBeenCalledWith(expect.any(String), [TENANT, 200]);
    await svc.listRecent(TENANT, -5);
    expect(db.query).toHaveBeenCalledWith(expect.any(String), [TENANT, 1]);
  });
});
