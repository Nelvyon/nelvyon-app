import { describe, it, expect, vi } from "vitest";
import { SaasWebhooksService } from "../SaasWebhooksService";

type Row = Record<string, unknown>;
const makeDb = (rows: Row[][] = []) => {
  let call = 0;
  return { query: vi.fn(async () => rows[call++] ?? []) };
};

const TENANT = "tenant-b";

describe("SaasWebhooksService", () => {
  it("list returns empty when no webhooks", async () => {
    const db = makeDb([[]]);
    const svc = new SaasWebhooksService(db);
    expect(await svc.list(TENANT)).toEqual([]);
  });

  it("create rejects non-HTTPS url", async () => {
    const db = makeDb();
    const svc = new SaasWebhooksService(db);
    await expect(svc.create(TENANT, { name: "Test", url: "http://example.com", events: [] })).rejects.toThrow("HTTPS");
  });

  it("create rejects invalid events", async () => {
    const db = makeDb();
    const svc = new SaasWebhooksService(db);
    await expect(
      svc.create(TENANT, { name: "Test", url: "https://example.com", events: ["fake.event"] })
    ).rejects.toThrow("Invalid events");
  });

  it("create rejects empty name", async () => {
    const db = makeDb();
    const svc = new SaasWebhooksService(db);
    await expect(svc.create(TENANT, { name: "", url: "https://example.com", events: [] })).rejects.toThrow("name is required");
  });

  it("create inserts and returns webhook with secret", async () => {
    const now = new Date();
    const row = {
      id: "wh1", tenant_id: TENANT, name: "My hook", url: "https://example.com/hook",
      events: ["contact.created"], active: true, secret: "abc123", deliveries: 0, failures: 0,
      last_delivered_at: null, created_at: now, updated_at: now,
    };
    const db = makeDb([[row]]);
    const svc = new SaasWebhooksService(db);
    const wh = await svc.create(TENANT, { name: "My hook", url: "https://example.com/hook", events: ["contact.created"] });
    expect(wh.id).toBe("wh1");
    expect(wh.secret).toBe("abc123");
    expect(wh.active).toBe(true);
  });

  it("delete throws NOT_FOUND for missing", async () => {
    const db = makeDb([[]]);
    const svc = new SaasWebhooksService(db);
    await expect(svc.delete(TENANT, "x")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
