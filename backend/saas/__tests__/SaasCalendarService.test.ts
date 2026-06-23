import { describe, it, expect, vi } from "vitest";
import { SaasCalendarService } from "../SaasCalendarService";

type Row = Record<string, unknown>;
const makeDb = (rows: Row[][] = []) => {
  let call = 0;
  return { query: vi.fn(async () => rows[call++] ?? []) };
};

const TENANT = "tenant-e";
const now = new Date();

describe("SaasCalendarService", () => {
  it("list returns empty", async () => {
    const db = makeDb([[]]);
    const svc = new SaasCalendarService(db);
    expect(await svc.list(TENANT)).toEqual([]);
  });

  it("create validates title", async () => {
    const db = makeDb();
    const svc = new SaasCalendarService(db);
    await expect(svc.create(TENANT, { title: "", type: "task", eventDate: "2026-07-01" })).rejects.toThrow("title");
  });

  it("create validates type", async () => {
    const db = makeDb();
    const svc = new SaasCalendarService(db);
    await expect(svc.create(TENANT, { title: "Test", type: "unknown" as "task", eventDate: "2026-07-01" })).rejects.toThrow("type");
  });

  it("create validates eventDate", async () => {
    const db = makeDb();
    const svc = new SaasCalendarService(db);
    await expect(svc.create(TENANT, { title: "Test", type: "task", eventDate: "" })).rejects.toThrow("eventDate");
  });

  it("create inserts event", async () => {
    const row = {
      id: "ev1", tenant_id: TENANT, title: "Call", type: "appointment",
      event_date: "2026-07-10", event_time: "10:00", duration_minutes: 30,
      color: "#3b82f6", contact_id: null, deal_id: null, campaign_id: null,
      assigned_to: null, completed: false, notes: null, created_at: now, updated_at: now,
    };
    const db = makeDb([[row]]);
    const svc = new SaasCalendarService(db);
    const event = await svc.create(TENANT, { title: "Call", type: "appointment", eventDate: "2026-07-10", eventTime: "10:00" });
    expect(event.id).toBe("ev1");
    expect(event.type).toBe("appointment");
  });

  it("delete throws NOT_FOUND", async () => {
    const db = makeDb([[]]);
    const svc = new SaasCalendarService(db);
    await expect(svc.delete(TENANT, "missing")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
