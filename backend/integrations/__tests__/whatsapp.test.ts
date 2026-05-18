// @ts-nocheck
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetWhatsAppServiceForTests, WhatsAppService } from "../WhatsAppService";

const UID = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

function credRow() {
  return [
    {
      user_id: UID,
      phone_number_id: "PHONE123",
      waba_id: "WABA1",
      access_token: "WA_TOKEN",
      is_active: true,
    },
  ];
}

describe("WhatsAppService", () => {
  beforeEach(() => {
    resetWhatsAppServiceForTests();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(
        () =>
          new Response(JSON.stringify({ messages: [{ id: "wamid.HAPPY" }] }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetWhatsAppServiceForTests();
  });

  it("saveCredentials", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new WhatsAppService({ db: { query } });
    await svc.saveCredentials(UID, "123", "789", "tok");
    expect(query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO integration_whatsapp"), [
      UID,
      "123",
      "789",
      "tok",
    ]);
  });

  it("getCredentials", async () => {
    const query = vi.fn().mockResolvedValue(credRow());
    const svc = new WhatsAppService({ db: { query } });
    const c = await svc.getCredentials(UID);
    expect(c?.phoneNumberId).toBe("PHONE123");
    expect(c?.accessToken).toBe("WA_TOKEN");
    expect(query).toHaveBeenCalledWith(expect.stringContaining("WHERE user_id = $1::uuid"), [UID]);
  });

  it("getCredentials null", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new WhatsAppService({ db: { query } });
    expect(await svc.getCredentials(UID)).toBeNull();
  });

  function mockDbForOutboundSends() {
    return vi.fn((sql: string) => {
      if (sql.includes("integration_whatsapp") && sql.includes("SELECT")) return Promise.resolve(credRow());
      if (sql.includes("INSERT INTO whatsapp_messages")) return Promise.resolve([]);
      return Promise.resolve([]);
    });
  }

  it("sendTextMessage", async () => {
    const query = mockDbForOutboundSends();
    const svc = new WhatsAppService({ db: { query } });
    const r = await svc.sendTextMessage(UID, "+34123456789", "Hola");
    expect(r.messageId).toBe("wamid.HAPPY");
    const url = globalThis.fetch.mock.calls[0][0] as string;
    expect(url).toContain("/PHONE123/messages");
    expect(url).toContain("access_token=");
    const init = globalThis.fetch.mock.calls[0][1];
    expect(JSON.parse(init.body)).toMatchObject({
      messaging_product: "whatsapp",
      type: "text",
      to: "+34123456789",
    });
  });

  it("sendTemplateMessage", async () => {
    const query = mockDbForOutboundSends();
    const svc = new WhatsAppService({ db: { query } });
    const r = await svc.sendTemplateMessage(UID, "+100", "seasonal_offer", "en_US", [{ type: "body", parameters: [] }]);
    expect(r.messageId).toBe("wamid.HAPPY");
    const init = globalThis.fetch.mock.calls[0][1];
    const body = JSON.parse(init.body);
    expect(body.type).toBe("template");
    expect(body.template).toMatchObject({
      name: "seasonal_offer",
      language: { code: "en_US" },
    });
  });

  it("sendBulkMessages", async () => {
    const query = mockDbForOutboundSends();
    const svc = new WhatsAppService({ db: { query } });
    const bulk = await svc.sendBulkMessages(UID, ["+111", "+222"], " Promo ");
    expect(bulk.sent).toBe(2);
    expect(bulk.failed).toBe(0);
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it("getMessageHistory", async () => {
    const rows = [
      {
        id: "00000000-0000-0000-0000-00000000aa01",
        user_id: UID,
        recipient: "+1",
        message_type: "text",
        content: "x",
        status: "sent",
        sent_at: new Date("2026-01-01T12:00:00.000Z"),
      },
    ];
    const query = vi.fn((sql: string) => {
      if (sql.includes("FROM whatsapp_messages")) return Promise.resolve(rows);
      return Promise.resolve([]);
    });
    const svc = new WhatsAppService({ db: { query } });
    const hist = await svc.getMessageHistory(UID, 10);
    expect(hist).toHaveLength(1);
    expect(hist[0]?.recipient).toBe("+1");
    expect(query).toHaveBeenCalledWith(expect.stringContaining("LIMIT $2::int"), [UID, 10]);
  });

  it("revokeAccess", async () => {
    const query = vi.fn().mockResolvedValue([]);
    const svc = new WhatsAppService({ db: { query } });
    await svc.revokeAccess(UID);
    expect(query).toHaveBeenCalledWith(expect.stringContaining("UPDATE integration_whatsapp"), [UID]);
  });
});
