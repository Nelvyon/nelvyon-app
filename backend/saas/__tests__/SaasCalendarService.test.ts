import { describe, it, expect, vi, beforeEach } from "vitest";
import { SaasCalendarService } from "../SaasCalendarService";

// Mock sesClient so SES calls don't fail in tests
vi.mock("../../email/sesClient", () => ({
  getSesClient: vi.fn(),
}));

import { getSesClient } from "../../email/sesClient";

type Row = Record<string, unknown>;
const makeDb = (rows: Row[][] = []) => {
  let call = 0;
  return { query: vi.fn(async () => rows[call++] ?? []) };
};

const TENANT = "tenant-e";
const now = new Date();
const baseRow = {
  id: "ev1", tenant_id: TENANT, title: "Call", type: "appointment",
  event_date: "2026-07-10", event_time: "10:00", duration_minutes: 30,
  color: "#3b82f6", contact_id: null, deal_id: null, campaign_id: null,
  assigned_to: null, completed: false, notes: null, created_at: now, updated_at: now,
};

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

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
    const db = makeDb([[baseRow]]);
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

  it("create appointment WITHOUT contactEmail skips SES", async () => {
    const mockSend = vi.fn();
    vi.mocked(getSesClient).mockReturnValue({ send: mockSend } as never);
    vi.stubEnv("SES_FROM_EMAIL", "noreply@test.com");

    const db = makeDb([[baseRow]]);
    const svc = new SaasCalendarService(db);
    await svc.create(TENANT, { title: "Call", type: "appointment", eventDate: "2026-07-10" });
    // fire-and-forget: give microtasks a tick to settle
    await new Promise(r => setTimeout(r, 10));
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("create appointment WITH contactEmail fires SES confirm", async () => {
    const mockSend = vi.fn().mockResolvedValue({});
    vi.mocked(getSesClient).mockReturnValue({ send: mockSend } as never);
    vi.stubEnv("SES_FROM_EMAIL", "noreply@test.com");

    const db = makeDb([[baseRow]]);
    const svc = new SaasCalendarService(db);
    await svc.create(TENANT, {
      title: "Demo call",
      type: "appointment",
      eventDate: "2026-07-10",
      contactEmail: "cliente@empresa.com",
      contactName: "Ana López",
      companyName: "Nelvyon",
    });
    // let fire-and-forget complete
    await new Promise(r => setTimeout(r, 20));
    expect(mockSend).toHaveBeenCalledOnce();
    // Verify it was a SendEmailCommand going to the right address
    const cmd = mockSend.mock.calls[0][0] as { input: { Destination: { ToAddresses: string[] } } };
    expect(cmd.input.Destination.ToAddresses[0]).toBe("cliente@empresa.com");
  });

  it("create appointment SES failure is non-fatal", async () => {
    vi.mocked(getSesClient).mockReturnValue({ send: vi.fn().mockRejectedValue(new Error("SES down")) } as never);
    vi.stubEnv("SES_FROM_EMAIL", "noreply@test.com");

    const db = makeDb([[baseRow]]);
    const svc = new SaasCalendarService(db);
    // Should not throw even if SES fails
    const event = await svc.create(TENANT, {
      title: "Call",
      type: "appointment",
      eventDate: "2026-07-10",
      contactEmail: "x@y.com",
    });
    await new Promise(r => setTimeout(r, 20));
    expect(event.id).toBe("ev1");
  });
});
