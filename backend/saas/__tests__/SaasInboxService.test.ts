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
  status: "open", assigned_to: null, unread_count: 0,
  last_message: null, last_message_at: null, created_at: now, updated_at: now,
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
    const db = makeDb([[convRow]]);
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
