import { describe, it, expect, vi } from "vitest";
import { SaasInboxService } from "../SaasInboxService";

type Row = Record<string, unknown>;
const makeDb = (rows: Row[][] = []) => {
  let call = 0;
  return { query: vi.fn(async () => rows[call++] ?? []) };
};

const TENANT = "tenant-f";
const now = new Date();

const convRow = {
  id: "cv1", tenant_id: TENANT, contact_id: null, channel: "email",
  status: "open", priority: "normal", assigned_to: null,
  thread_id: null, subject: null,
  first_response_at: null, sla_due_at: null, sla_breached: false,
  unread_count: 0, last_message: null, last_message_at: null,
  created_at: now, updated_at: now,
  contact_name: null, contact_email: null, contact_phone: null,
};

describe("SaasInboxService", () => {
  it("listConversations returns empty", async () => {
    const db = makeDb([[]]);
    const svc = new SaasInboxService(db);
    expect(await svc.listConversations(TENANT)).toEqual([]);
  });

  it("createConversation rejects invalid channel", async () => {
    const db = makeDb();
    const svc = new SaasInboxService(db);
    await expect(svc.createConversation(TENANT, { channel: "telegram" as "email" })).rejects.toThrow("channel");
  });

  it("createConversation returns conversation", async () => {
    // DB calls: getSlaPolicy, getOrCreateThread skipped (no contactId),
    // assignRoundRobinNew: routing check, members query (empty → null), INSERT conv
    const db = makeDb([[], [], [], [convRow]]);
    const svc = new SaasInboxService(db);
    const conv = await svc.createConversation(TENANT, { channel: "email" });
    expect(conv.id).toBe("cv1");
    expect(conv.channel).toBe("email");
    expect(conv.status).toBe("open");
    expect(conv.unreadCount).toBe(0);
  });

  it("getConversation returns null for missing", async () => {
    const db = makeDb([[]]);
    const svc = new SaasInboxService(db);
    expect(await svc.getConversation(TENANT, "x")).toBeNull();
  });

  it("listMessages throws NOT_FOUND for missing conversation", async () => {
    const db = makeDb([[]]);
    const svc = new SaasInboxService(db);
    await expect(svc.listMessages(TENANT, "missing")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("sendMessage throws NOT_FOUND for missing conversation", async () => {
    const db = makeDb([[]]);
    const svc = new SaasInboxService(db);
    await expect(svc.sendMessage(TENANT, "missing", { body: "hi" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("sendMessage rejects empty body", async () => {
    const db = makeDb([[convRow], []]);
    const svc = new SaasInboxService(db);
    await expect(svc.sendMessage(TENANT, "cv1", { body: "  " })).rejects.toThrow("body");
  });
});

const msgRow = {
  id: "m1", conversation_id: "cv1", tenant_id: TENANT,
  direction: "outbound", channel: "email", body: "Hello", status: "sent",
  external_id: null, parent_message_id: null, metadata: {}, created_at: now,
};

describe("SaasInboxService.replyToConversation", () => {
  it("throws NOT_FOUND for missing conversation", async () => {
    const db = makeDb([[]]);
    const svc = new SaasInboxService(db);
    await expect(svc.replyToConversation(TENANT, "missing", "hi"))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws VALIDATION for empty body", async () => {
    const db = makeDb([[convRow]]);
    const svc = new SaasInboxService(db);
    await expect(svc.replyToConversation(TENANT, "cv1", "  "))
      .rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("stores message and returns channelDispatched=false for email with no SES contact", async () => {
    // 1: getConversation 2: getConversation(sendMessage) 3: INSERT msg 4: UPDATE conv
    // 5: UPDATE first_response_at 6: SELECT contact
    const emailConv = { ...convRow, channel: "email", contact_id: "c1", first_response_at: null };
    const db = makeDb([[emailConv], [emailConv], [msgRow], [], [], [{ id: "c1", name: "Ana", email: null, phone: null }]]);
    const svc = new SaasInboxService(db);
    const result = await svc.replyToConversation(TENANT, "cv1", "Hello");
    expect(result.message.id).toBe("m1");
    expect(result.channelDispatched).toBe(false);
  });

  it("returns channelDispatched=false + channelError when SMS contact has no phone", async () => {
    const smsConv = { ...convRow, channel: "sms", contact_id: "c1" };
    const db = makeDb([[smsConv], [smsConv], [msgRow], [], [], [{ id: "c1", name: "X", email: null, phone: null }]]);
    const svc = new SaasInboxService(db);
    const result = await svc.replyToConversation(TENANT, "cv1", "Hello");
    expect(result.channelDispatched).toBe(false);
    expect(result.channelError).toContain("phone number");
  });

  it("returns channelDispatched=false + channelError when WhatsApp contact has no phone", async () => {
    const waConv = { ...convRow, channel: "whatsapp", contact_id: "c1" };
    const db = makeDb([[waConv], [waConv], [msgRow], [], [], [{ id: "c1", name: "X", email: null, phone: null }]]);
    const svc = new SaasInboxService(db);
    const result = await svc.replyToConversation(TENANT, "cv1", "Hello");
    expect(result.channelDispatched).toBe(false);
    expect(result.channelError).toContain("phone number");
  });
});
