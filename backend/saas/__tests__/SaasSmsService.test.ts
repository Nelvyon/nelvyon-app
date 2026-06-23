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

  it("sendBulk aggregates results", async () => {
    process.env.TWILIO_ACCOUNT_SID = "AC123";
    process.env.TWILIO_AUTH_TOKEN = "token";
    process.env.TWILIO_FROM_NUMBER = "+15005550006";
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
});
