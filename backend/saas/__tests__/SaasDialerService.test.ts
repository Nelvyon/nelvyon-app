import { describe, it, expect, beforeEach, vi } from "vitest";
import { SaasDialerService, resetSaasDialerServiceForTests, SaasDialerError } from "../SaasDialerService";

const mockDb = {
  query: vi.fn(),
};

function makeService(fetchFn?: typeof fetch) {
  return new SaasDialerService(mockDb as never, fetchFn ?? vi.fn());
}

const TENANT = "tenant-dialer-test";

beforeEach(() => {
  vi.resetAllMocks();
  resetSaasDialerServiceForTests();
  delete process.env.TWILIO_ACCOUNT_SID;
  delete process.env.TWILIO_AUTH_TOKEN;
  delete process.env.TWILIO_FROM_NUMBER;
  delete process.env.TWILIO_TWIML_URL;
});

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
describe("getConfig", () => {
  it("returns configured:false when env vars absent", () => {
    expect(makeService().getConfig()).toEqual({ configured: false, fromNumber: null });
  });

  it("returns configured:true when all vars set", () => {
    process.env.TWILIO_ACCOUNT_SID = "ACtest";
    process.env.TWILIO_AUTH_TOKEN  = "authtest";
    process.env.TWILIO_FROM_NUMBER = "+34900000000";
    const cfg = makeService().getConfig();
    expect(cfg.configured).toBe(true);
    expect(cfg.fromNumber).toBe("+34900000000");
  });
});

// ---------------------------------------------------------------------------
// not configured
// ---------------------------------------------------------------------------
describe("initiateCall — not configured", () => {
  it("throws SaasDialerError NOT_CONFIGURED", async () => {
    const svc = makeService();
    await expect(svc.initiateCall(TENANT, { to: "+34612345678" }))
      .rejects.toThrow(SaasDialerError);
  });

  it("error code is NOT_CONFIGURED", async () => {
    const svc = makeService();
    try {
      await svc.initiateCall(TENANT, { to: "+34612345678" });
    } catch (e) {
      expect(e instanceof SaasDialerError && e.code).toBe("NOT_CONFIGURED");
    }
  });
});

// ---------------------------------------------------------------------------
// Configured — happy path
// ---------------------------------------------------------------------------
describe("initiateCall — configured", () => {
  beforeEach(() => {
    process.env.TWILIO_ACCOUNT_SID = "ACtest";
    process.env.TWILIO_AUTH_TOKEN  = "authtest";
    process.env.TWILIO_FROM_NUMBER = "+34900000000";
  });

  it("calls Twilio and logs activity", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ sid: "CAabc123" }),
    } as Response);

    const now = new Date();
    mockDb.query.mockResolvedValue([{
      id: "act-1",
      contact_id: null,
      tenant_id: TENANT,
      description: JSON.stringify({ to: "+34612345678", message: "Hola", callSid: "CAabc123", status: "initiated" }),
      created_at: now,
    }]);

    const svc = makeService(mockFetch);
    const result = await svc.initiateCall(TENANT, { to: "+34612345678", message: "Hola" });

    expect(result.status).toBe("initiated");
    expect(result.callSid).toBe("CAabc123");
    expect(result.to).toBe("+34612345678");
    expect(mockFetch).toHaveBeenCalledOnce();
    const fetchUrl = (mockFetch.mock.calls[0] as [string])[0];
    expect(fetchUrl).toContain("/Calls.json");
  });

  it("logs failed status when Twilio returns error", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ message: "Invalid phone number" }),
    } as Response);

    // The service logs the failed call then throws
    mockDb.query.mockResolvedValue([{
      id: "act-2",
      contact_id: null,
      tenant_id: TENANT,
      description: JSON.stringify({ to: "+34000000000", message: "", callSid: null, status: "failed" }),
      created_at: new Date(),
    }]);

    const svc = makeService(mockFetch);
    await expect(svc.initiateCall(TENANT, { to: "+34000000000" }))
      .rejects.toThrow(SaasDialerError);
  });

  it("uses inline Twiml when TWILIO_TWIML_URL not set", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ sid: "CAinline" }),
    } as Response);
    mockDb.query.mockResolvedValue([{
      id: "act-3",
      contact_id: null,
      tenant_id: TENANT,
      description: JSON.stringify({ to: "+34611111111", message: "Test", callSid: "CAinline", status: "initiated" }),
      created_at: new Date(),
    }]);

    const svc = makeService(mockFetch);
    await svc.initiateCall(TENANT, { to: "+34611111111", message: "Test" });

    const body = (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string;
    expect(body).toContain("Twiml=");
    expect(body).not.toContain("Url=");
  });

  it("uses Url when TWILIO_TWIML_URL is set", async () => {
    process.env.TWILIO_TWIML_URL = "https://example.com/twiml";
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ sid: "CAurl" }),
    } as Response);
    mockDb.query.mockResolvedValue([{
      id: "act-4",
      contact_id: null,
      tenant_id: TENANT,
      description: JSON.stringify({ to: "+34622222222", message: "", callSid: "CAurl", status: "initiated" }),
      created_at: new Date(),
    }]);

    const svc = makeService(mockFetch);
    await svc.initiateCall(TENANT, { to: "+34622222222" });

    const body = (mockFetch.mock.calls[0] as [string, RequestInit])[1].body as string;
    expect(body).toContain("Url=https");
  });
});

// ---------------------------------------------------------------------------
// listCalls
// ---------------------------------------------------------------------------
describe("listCalls", () => {
  beforeEach(() => {
    process.env.TWILIO_ACCOUNT_SID = "ACtest";
    process.env.TWILIO_AUTH_TOKEN  = "authtest";
    process.env.TWILIO_FROM_NUMBER = "+34900000000";
  });

  it("returns parsed call records", async () => {
    const now = new Date();
    mockDb.query.mockResolvedValue([
      { id: "c1", contact_id: null, tenant_id: TENANT,
        description: JSON.stringify({ to: "+34611111111", message: "Hola", callSid: "CA111", status: "initiated" }),
        created_at: now },
      { id: "c2", contact_id: "cnt-1", tenant_id: TENANT,
        description: JSON.stringify({ to: "+34622222222", message: "", callSid: null, status: "failed" }),
        created_at: now },
    ]);
    const svc = makeService();
    const calls = await svc.listCalls(TENANT, { limit: 10 });
    expect(calls).toHaveLength(2);
    expect(calls[0]!.status).toBe("initiated");
    expect(calls[1]!.status).toBe("failed");
    expect(calls[1]!.contactId).toBe("cnt-1");
  });

  it("queries by contactId when provided", async () => {
    mockDb.query.mockResolvedValue([]);
    const svc = makeService();
    await svc.listCalls(TENANT, { contactId: "cnt-abc" });
    const sql = (mockDb.query.mock.calls[0] as [string, unknown[]])[0];
    expect(sql).toContain("contact_id=$2");
  });
});

// ---------------------------------------------------------------------------
// VALIDATION
// ---------------------------------------------------------------------------
describe("initiateCall — validation", () => {
  beforeEach(() => {
    process.env.TWILIO_ACCOUNT_SID = "ACtest";
    process.env.TWILIO_AUTH_TOKEN  = "authtest";
    process.env.TWILIO_FROM_NUMBER = "+34900000000";
  });

  it("throws VALIDATION when to is empty", async () => {
    const svc = makeService();
    await expect(svc.initiateCall(TENANT, { to: "   " }))
      .rejects.toMatchObject({ code: "VALIDATION" });
  });
});
