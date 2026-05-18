// @ts-nocheck
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetTelegramServiceForTests, TelegramService } from "../TelegramService";

const UID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

function credRow() {
  return [
    {
      user_id: UID,
      bot_token: "123456:ABC-DEF",
      chat_id: "999888777",
      bot_username: "my_bot",
      is_active: true,
    },
  ];
}

function jsonResponse(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
}

function buildFetchMock() {
  return vi.fn().mockImplementation((input: string | URL, init?: RequestInit) => {
    const u = String(input);
    if (u.includes("/sendMessage")) {
      return jsonResponse({ ok: true, result: { message_id: 42 } });
    }
    if (u.includes("/sendPhoto")) {
      return jsonResponse({ ok: true, result: { message_id: 99 } });
    }
    if (u.includes("/getMe")) {
      return jsonResponse({
        ok: true,
        result: { id: 111222333, username: "testbot", first_name: "Test Bot" },
      });
    }
    return jsonResponse({ ok: true, result: {} });
  });
}

describe("TelegramService", () => {
  beforeEach(() => {
    resetTelegramServiceForTests();
    vi.stubGlobal("fetch", buildFetchMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetTelegramServiceForTests();
  });

  it("saveCredentials", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new TelegramService({ db: { query } });
    await svc.saveCredentials(UID, "tok", "cid", "uname");
    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO integration_telegram"), [
      UID,
      "tok",
      "cid",
      "uname",
    ]);
  });

  it("getCredentials", async () => {
    const query = vi.fn().mockResolvedValue(credRow());
    const svc = new TelegramService({ db: { query } });
    const c = await svc.getCredentials(UID);
    expect(c?.botToken).toBe("123456:ABC-DEF");
    expect(c?.chatId).toBe("999888777");
    expect(query).toHaveBeenCalledWith(expect.stringContaining("WHERE user_id = $1::uuid"), [UID]);
  });

  it("getCredentials null", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new TelegramService({ db: { query } });
    expect(await svc.getCredentials(UID)).toBeNull();
  });

  it("sendMessage", async () => {
    const query = vi.fn((sql: string) => {
      if (sql.includes("integration_telegram") && sql.includes("SELECT")) return Promise.resolve(credRow());
      if (sql.includes("INSERT INTO telegram_messages")) return Promise.resolve([]);
      return Promise.resolve([]);
    });
    const fetchMock = vi.fn().mockImplementation(() =>
      jsonResponse({ ok: true, result: { message_id: 7 } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const svc = new TelegramService({ db: { query }, fetchFn: fetchMock });
    const out = await svc.sendMessage(UID, "Hola mundo");
    expect(out.messageId).toBe(7);
    expect(fetchMock).toHaveBeenCalled();
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.method).toBe("POST");
    expect(init.headers?.["Content-Type"]).toBe("application/json");
    const body = JSON.parse(init.body as string);
    expect(body.parse_mode).toBe("HTML");
    expect(body.chat_id).toBe("999888777");
    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO telegram_messages"), expect.any(Array));
  });

  it("sendBulkMessages", async () => {
    const query = vi.fn((sql: string) => {
      if (sql.includes("integration_telegram") && sql.includes("SELECT")) return Promise.resolve(credRow());
      if (sql.includes("INSERT INTO telegram_messages")) return Promise.resolve([]);
      return Promise.resolve([]);
    });
    let n = 0;
    const fetchMock = vi.fn().mockImplementation(() => {
      n += 1;
      return jsonResponse({ ok: true, result: { message_id: 100 + n } });
    });
    vi.stubGlobal("fetch", fetchMock);
    const svc = new TelegramService({ db: { query }, fetchFn: fetchMock });
    const out = await svc.sendBulkMessages(UID, ["1", "2"], "Bulk");
    expect(out.sent).toBe(2);
    expect(out.failed).toBe(0);
    expect(out.results.every((r) => r.ok)).toBe(true);
  });

  it("sendPhoto", async () => {
    const query = vi.fn((sql: string) => {
      if (sql.includes("integration_telegram") && sql.includes("SELECT")) return Promise.resolve(credRow());
      if (sql.includes("INSERT INTO telegram_messages")) return Promise.resolve([]);
      return Promise.resolve([]);
    });
    const fetchMock = vi.fn().mockImplementation(() => jsonResponse({ ok: true, result: { message_id: 55 } }));
    vi.stubGlobal("fetch", fetchMock);
    const svc = new TelegramService({ db: { query }, fetchFn: fetchMock });
    const out = await svc.sendPhoto(UID, "999888777", "https://example.com/p.jpg", "cap");
    expect(out.messageId).toBe(55);
    expect(String(fetchMock.mock.calls[0][0])).toContain("/sendPhoto");
  });

  it("getMessageHistory", async () => {
    const query = vi.fn().mockResolvedValue([
      {
        id: "m1",
        user_id: UID,
        chat_id: "1",
        content: "hi",
        message_id: 1,
        status: "sent",
        sent_at: new Date("2026-01-01T00:00:00.000Z"),
      },
    ]);
    const svc = new TelegramService({ db: { query } });
    const hist = await svc.getMessageHistory(UID, 10);
    expect(hist).toHaveLength(1);
    expect(hist[0].messageId).toBe(1);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("WHERE user_id = $1::uuid"), [UID, 10]);
  });

  it("getBotInfo", async () => {
    const query = vi.fn((sql: string) => {
      if (sql.includes("integration_telegram") && sql.includes("SELECT")) return Promise.resolve(credRow());
      return Promise.resolve([]);
    });
    const fetchMock = vi.fn().mockImplementation(() =>
      jsonResponse({ ok: true, result: { id: 9, username: "xbot", first_name: "X" } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const svc = new TelegramService({ db: { query }, fetchFn: fetchMock });
    const info = await svc.getBotInfo(UID);
    expect(info.id).toBe(9);
    expect(info.username).toBe("xbot");
    expect(info.firstName).toBe("X");
    expect(String(fetchMock.mock.calls[0][0])).toContain("/getMe");
  });

  it("revokeAccess", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new TelegramService({ db: { query } });
    await svc.revokeAccess(UID);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("UPDATE integration_telegram"), [UID]);
  });
});
