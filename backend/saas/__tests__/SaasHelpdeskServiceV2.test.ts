import { describe, it, expect, beforeEach, vi } from "vitest";
import { SaasHelpdeskServiceV2, resetSaasHelpdeskServiceV2ForTests, SaasHelpdeskError } from "../SaasHelpdeskServiceV2";
import type { SaasPostgresPort } from "../SaasOnboardingService";

function makeDb(rows: Record<string, unknown>[] = []): SaasPostgresPort {
  return { query: vi.fn().mockResolvedValue(rows) } as unknown as SaasPostgresPort;
}

const T = "tenant-s28-hd";
const now = new Date().toISOString();
const ticketRow = {
  id: "t-1", tenant_id: T, subject: "Login issue", description: "Can't login",
  status: "open", priority: "high", sla_policy: "standard",
  contact_name: "Ana", contact_email: "ana@test.com",
  assigned_to: null, resolved_at: null,
  first_response_due: new Date(Date.now() + 4 * 3600000).toISOString(),
  resolution_due: new Date(Date.now() + 24 * 3600000).toISOString(),
  first_responded_at: null,
  message_count: "0", created_at: now, updated_at: now,
};
const macroRow = {
  id: "m-1", tenant_id: T, name: "Close & Resolve",
  actions: JSON.stringify([{ type: "set_status", status: "resolved" }]),
  active: true, created_at: now, updated_at: now,
};

beforeEach(() => { resetSaasHelpdeskServiceV2ForTests(); });

describe("create", () => {
  it("throws VALIDATION when subject is empty", async () => {
    const svc = new SaasHelpdeskServiceV2(makeDb([]));
    await expect(svc.create(T, { subject: "", contactEmail: "x@x.com" })).rejects.toThrow(SaasHelpdeskError);
  });

  it("throws VALIDATION when contactEmail is empty", async () => {
    const svc = new SaasHelpdeskServiceV2(makeDb([]));
    await expect(svc.create(T, { subject: "S", contactEmail: "" })).rejects.toThrow(SaasHelpdeskError);
  });

  it("creates ticket with SLA fields populated", async () => {
    const db = makeDb([ticketRow]);
    const svc = new SaasHelpdeskServiceV2(db);
    const t = await svc.create(T, { subject: "Login issue", contactEmail: "ana@test.com", priority: "high" });
    expect(t.subject).toBe("Login issue");
    expect(t.firstResponseDue).toBeTruthy();
    expect(t.resolutionDue).toBeTruthy();
    expect(t.slaPolicy).toBe("standard");
  });

  it("uses urgent SLA policy when specified", async () => {
    const db = makeDb([{ ...ticketRow, sla_policy: "urgent",
      first_response_due: new Date(Date.now() + 30 * 60000).toISOString(),
      resolution_due: new Date(Date.now() + 4 * 3600000).toISOString() }]);
    const svc = new SaasHelpdeskServiceV2(db);
    const t = await svc.create(T, { subject: "Emergency", contactEmail: "x@x.com", slaPolicy: "urgent" });
    expect(t.slaPolicy).toBe("urgent");
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining("sla_policy"), expect.arrayContaining(["urgent"]));
  });

  it("defaults priority to medium when invalid", async () => {
    const db = makeDb([ticketRow]);
    const svc = new SaasHelpdeskServiceV2(db);
    await svc.create(T, { subject: "S", contactEmail: "x@x.com", priority: "invalid" as never });
    expect(db.query).toHaveBeenCalledWith(expect.any(String), expect.arrayContaining(["medium"]));
  });
});

describe("list", () => {
  it("returns empty array when no tickets", async () => {
    expect(await new SaasHelpdeskServiceV2(makeDb([])).list(T)).toEqual([]);
  });

  it("maps SLA breached=false when due is in future", async () => {
    const svc = new SaasHelpdeskServiceV2(makeDb([ticketRow]));
    const tickets = await svc.list(T);
    expect(tickets[0]!.slaBreached).toBe(false);
  });

  it("maps SLA breached=true when resolution_due is in past", async () => {
    const row = { ...ticketRow, resolution_due: new Date(Date.now() - 3600000).toISOString() };
    const svc = new SaasHelpdeskServiceV2(makeDb([row]));
    const tickets = await svc.list(T);
    expect(tickets[0]!.slaBreached).toBe(true);
  });

  it("filters by status", async () => {
    const db = makeDb([]);
    const svc = new SaasHelpdeskServiceV2(db);
    await svc.list(T, "open");
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining("status=$2"), [T, "open"]);
  });
});

describe("get", () => {
  it("throws NOT_FOUND when missing", async () => {
    const svc = new SaasHelpdeskServiceV2(makeDb([]));
    await expect(svc.get(T, "missing")).rejects.toThrow(SaasHelpdeskError);
  });

  it("returns ticket with messages", async () => {
    const db = { query: vi.fn() } as unknown as SaasPostgresPort;
    const msgRow = { id: "msg-1", ticket_id: "t-1", tenant_id: T, author: "agent", body: "Hi!", is_internal: false, created_at: now };
    (db.query as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([ticketRow])
      .mockResolvedValueOnce([msgRow]);
    const svc = new SaasHelpdeskServiceV2(db);
    const { ticket, messages } = await svc.get(T, "t-1");
    expect(ticket.id).toBe("t-1");
    expect(messages).toHaveLength(1);
    expect(messages[0]!.body).toBe("Hi!");
  });
});

describe("update", () => {
  it("throws NOT_FOUND when missing", async () => {
    const svc = new SaasHelpdeskServiceV2(makeDb([]));
    await expect(svc.update(T, "missing", { status: "resolved" })).rejects.toThrow(SaasHelpdeskError);
  });

  it("throws VALIDATION for invalid status", async () => {
    const svc = new SaasHelpdeskServiceV2(makeDb([ticketRow]));
    await expect(svc.update(T, "t-1", { status: "invalid" as never })).rejects.toThrow(SaasHelpdeskError);
  });

  it("sets resolved_at when status=resolved", async () => {
    const db = makeDb([{ ...ticketRow, status: "resolved" }]);
    const svc = new SaasHelpdeskServiceV2(db);
    await svc.update(T, "t-1", { status: "resolved" });
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining("resolved_at=NOW()"), expect.any(Array));
  });
});

describe("addMessage", () => {
  it("throws VALIDATION when body is empty", async () => {
    const svc = new SaasHelpdeskServiceV2(makeDb([]));
    await expect(svc.addMessage(T, "t-1", "  ")).rejects.toThrow(SaasHelpdeskError);
  });

  it("marks first_responded_at for non-internal messages", async () => {
    const msgRow = { id: "msg-1", ticket_id: "t-1", tenant_id: T, author: "agent", body: "Hi", is_internal: false, created_at: now };
    const db = { query: vi.fn() } as unknown as SaasPostgresPort;
    (db.query as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([msgRow]) // INSERT message
      .mockResolvedValueOnce([]);      // UPDATE ticket
    const svc = new SaasHelpdeskServiceV2(db);
    await svc.addMessage(T, "t-1", "Hi", "agent", false);
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining("first_responded_at"), expect.any(Array));
  });

  it("does not update ticket for internal messages", async () => {
    const msgRow = { id: "msg-1", ticket_id: "t-1", tenant_id: T, author: "agent", body: "Note", is_internal: true, created_at: now };
    const db = makeDb([msgRow]);
    const svc = new SaasHelpdeskServiceV2(db);
    await svc.addMessage(T, "t-1", "Note", "agent", true);
    // Only one query (INSERT), no UPDATE for internal
    expect((db.query as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
  });
});

describe("delete", () => {
  it("throws NOT_FOUND when missing", async () => {
    const svc = new SaasHelpdeskServiceV2(makeDb([]));
    await expect(svc.delete(T, "missing")).rejects.toThrow(SaasHelpdeskError);
  });
  it("succeeds when found", async () => {
    await expect(new SaasHelpdeskServiceV2(makeDb([{ id: "t-1" }])).delete(T, "t-1")).resolves.toBeUndefined();
  });
});

describe("macros", () => {
  it("listMacros returns active macros", async () => {
    const svc = new SaasHelpdeskServiceV2(makeDb([macroRow]));
    const macros = await svc.listMacros(T);
    expect(macros).toHaveLength(1);
    expect(macros[0]!.name).toBe("Close & Resolve");
    expect(macros[0]!.actions[0]!.type).toBe("set_status");
  });

  it("createMacro throws VALIDATION for empty name", async () => {
    const svc = new SaasHelpdeskServiceV2(makeDb([]));
    await expect(svc.createMacro(T, { name: "", actions: [] })).rejects.toThrow(SaasHelpdeskError);
  });

  it("createMacro inserts with JSON actions", async () => {
    const db = makeDb([macroRow]);
    const svc = new SaasHelpdeskServiceV2(db);
    const m = await svc.createMacro(T, { name: "Close", actions: [{ type: "set_status", status: "resolved" }] });
    expect(m.name).toBe("Close & Resolve"); // from mock
    expect(db.query).toHaveBeenCalledWith(expect.stringContaining("jsonb"), expect.any(Array));
  });

  it("deleteMacro throws NOT_FOUND when missing", async () => {
    const svc = new SaasHelpdeskServiceV2(makeDb([]));
    await expect(svc.deleteMacro(T, "missing")).rejects.toThrow(SaasHelpdeskError);
  });

  it("applyMacro throws NOT_FOUND when macro missing", async () => {
    const db = { query: vi.fn() } as unknown as SaasPostgresPort;
    (db.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]); // macro not found
    const svc = new SaasHelpdeskServiceV2(db);
    await expect(svc.applyMacro(T, "t-1", "missing")).rejects.toThrow(SaasHelpdeskError);
  });

  it("applyMacro applies set_status action", async () => {
    const db = { query: vi.fn() } as unknown as SaasPostgresPort;
    (db.query as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce([macroRow]) // get macro
      .mockResolvedValueOnce([{ ...ticketRow, status: "resolved" }]); // update ticket
    const svc = new SaasHelpdeskServiceV2(db);
    const t = await svc.applyMacro(T, "t-1", "m-1");
    expect(t.status).toBe("resolved");
  });
});
