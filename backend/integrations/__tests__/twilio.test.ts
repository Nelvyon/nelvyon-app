// @ts-nocheck
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetTwilioServiceForTests, TwilioService } from "../TwilioService";

const UID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

function credRow() {
  return [
    {
      user_id: UID,
      account_sid: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      auth_token: "auth_secret",
      from_number: "+15551234567",
      is_active: true,
    },
  ];
}

function jsonResponse(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
}

function buildFetchMock() {
  let smsCount = 0;
  return vi.fn().mockImplementation((input: string | URL, init?: RequestInit) => {
    const u = String(input);
    if (u.includes("/Messages.json")) {
      smsCount += 1;
      return jsonResponse({ sid: `SMtest${smsCount}`, status: "queued" });
    }
    if (u.includes("/Calls.json")) {
      return jsonResponse({ sid: "CAtestcall", status: "queued" });
    }
    if (u.includes("/Balance.json")) {
      return jsonResponse({ balance: "12.34", currency: "USD" });
    }
    return jsonResponse({});
  });
}

describe("TwilioService", () => {
  beforeEach(() => {
    resetTwilioServiceForTests();
    vi.stubGlobal("fetch", buildFetchMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetTwilioServiceForTests();
  });

  it("saveCredentials", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new TwilioService({ db: { query } });
    await svc.saveCredentials(UID, "ACaaa", "tok", "+1000");
    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO integration_twilio"), [
      UID,
      "ACaaa",
      "tok",
      "+1000",
    ]);
  });

  it("getCredentials", async () => {
    const query = vi.fn().mockResolvedValue(credRow());
    const svc = new TwilioService({ db: { query } });
    const c = await svc.getCredentials(UID);
    expect(c?.accountSid).toBe("ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");
    expect(c?.fromNumber).toBe("+15551234567");
    expect(query).toHaveBeenCalledWith(expect.stringContaining("WHERE user_id = $1::uuid"), [UID]);
  });

  it("getCredentials null", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new TwilioService({ db: { query } });
    expect(await svc.getCredentials(UID)).toBeNull();
  });

  it("sendSms", async () => {
    const query = vi.fn((sql: string) => {
      if (sql.includes("integration_twilio") && sql.includes("SELECT")) return Promise.resolve(credRow());
      if (sql.includes("INSERT INTO twilio_messages")) return Promise.resolve([]);
      return Promise.resolve([]);
    });
    const fetchMock = vi.fn().mockImplementation(() => jsonResponse({ sid: "SMsingle", status: "sent" }));
    vi.stubGlobal("fetch", fetchMock);
    const svc = new TwilioService({ db: { query }, fetchFn: fetchMock });
    const out = await svc.sendSms(UID, "+15557654321", "Hola");
    expect(out.messageSid).toBe("SMsingle");
    expect(fetchMock).toHaveBeenCalled();
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(init.headers?.["Content-Type"]).toBe("application/x-www-form-urlencoded");
    const auth = init.headers?.Authorization as string;
    expect(auth.startsWith("Basic ")).toBe(true);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO twilio_messages"), expect.any(Array));
  });

  it("sendBulkSms", async () => {
    const query = vi.fn((sql: string) => {
      if (sql.includes("integration_twilio") && sql.includes("SELECT")) return Promise.resolve(credRow());
      if (sql.includes("INSERT INTO twilio_messages")) return Promise.resolve([]);
      return Promise.resolve([]);
    });
    const fetchMock = buildFetchMock();
    vi.stubGlobal("fetch", fetchMock);
    const svc = new TwilioService({ db: { query }, fetchFn: fetchMock });
    const out = await svc.sendBulkSms(UID, ["+100", "+200"], "Bulk body");
    expect(out.sent).toBe(2);
    expect(out.failed).toBe(0);
    expect(out.results.every((r) => r.ok)).toBe(true);
  });

  it("makeCall", async () => {
    const query = vi.fn((sql: string) => {
      if (sql.includes("integration_twilio") && sql.includes("SELECT")) return Promise.resolve(credRow());
      if (sql.includes("INSERT INTO twilio_messages")) return Promise.resolve([]);
      return Promise.resolve([]);
    });
    const fetchMock = vi.fn().mockImplementation(() => jsonResponse({ sid: "CAabc", status: "ringing" }));
    vi.stubGlobal("fetch", fetchMock);
    const svc = new TwilioService({ db: { query }, fetchFn: fetchMock });
    const out = await svc.makeCall(UID, "+18885550100", "https://example.com/twiml.xml");
    expect(out.callSid).toBe("CAabc");
    expect(fetchMock.mock.calls[0][0]).toContain("/Calls.json");
  });

  it("getMessageHistory", async () => {
    const query = vi.fn().mockResolvedValue([
      {
        id: "msg-1",
        user_id: UID,
        to_number: "+1",
        message_type: "sms",
        content: "x",
        twilio_sid: "SMx",
        status: "sent",
        sent_at: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);
    const svc = new TwilioService({ db: { query } });
    const hist = await svc.getMessageHistory(UID, 10);
    expect(hist).toHaveLength(1);
    expect(hist[0].twilioSid).toBe("SMx");
    expect(query).toHaveBeenCalledWith(expect.stringContaining("WHERE user_id = $1::uuid"), [UID, 10]);
  });

  it("getAccountBalance", async () => {
    const query = vi.fn((sql: string) => {
      if (sql.includes("integration_twilio") && sql.includes("SELECT")) return Promise.resolve(credRow());
      return Promise.resolve([]);
    });
    const fetchMock = vi.fn().mockImplementation(() => jsonResponse({ balance: "9.99", currency: "usd" }));
    vi.stubGlobal("fetch", fetchMock);
    const svc = new TwilioService({ db: { query }, fetchFn: fetchMock });
    const bal = await svc.getAccountBalance(UID);
    expect(bal.balance).toBe("9.99");
    expect(bal.currency).toBe("usd");
    expect(String(fetchMock.mock.calls[0][0])).toContain("/Balance.json");
  });

  it("revokeAccess", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new TwilioService({ db: { query } });
    await svc.revokeAccess(UID);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("UPDATE integration_twilio"), [UID]);
  });
});
