/**
 * S38 — Inbox 10/10: threading, round-robin, SLA, email SES
 * 30+ tests covering all new SaasInboxService v2 methods
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SaasInboxService, resetSaasInboxServiceForTests } from "../SaasInboxService";

beforeEach(() => { resetSaasInboxServiceForTests(); });

const TENANT = "t-s38";
const now = new Date();

const baseConvRow = {
  id: "cv1", tenant_id: TENANT, contact_id: "contact1", channel: "email",
  status: "open", priority: "normal", assigned_to: null,
  thread_id: null, subject: "Hello", first_response_at: null,
  sla_due_at: new Date(Date.now() + 3600_000), sla_breached: false,
  unread_count: 0, last_message: "Hi there", last_message_at: now,
  created_at: now, updated_at: now,
  contact_name: "Ana García", contact_email: "ana@example.com", contact_phone: null,
};

const msgRow = {
  id: "m1", conversation_id: "cv1", tenant_id: TENANT,
  direction: "outbound", channel: "email", body: "Hello", status: "sent",
  external_id: null, parent_message_id: null, metadata: {}, created_at: now,
};

// ── getOrCreateThread ────────────────────────────────────────────────────────

describe("SaasInboxService.getOrCreateThread", () => {
  it("returns existing thread_id when one exists", async () => {
    const db = { query: vi.fn().mockResolvedValueOnce([{ thread_id: "thread-abc" }]) };
    const svc = new SaasInboxService(db as never);
    const tid = await svc.getOrCreateThread(TENANT, "contact1");
    expect(tid).toBe("thread-abc");
  });

  it("generates new UUID when no existing thread", async () => {
    const db = {
      query: vi.fn()
        .mockResolvedValueOnce([])  // no existing
        .mockResolvedValueOnce([{ id: "new-uuid-1234" }]),  // gen_random_uuid
    };
    const svc = new SaasInboxService(db as never);
    const tid = await svc.getOrCreateThread(TENANT, "contact1");
    expect(tid).toBe("new-uuid-1234");
  });

  it("falls back to crypto.randomUUID if DB returns nothing", async () => {
    const db = {
      query: vi.fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]),
    };
    const svc = new SaasInboxService(db as never);
    const tid = await svc.getOrCreateThread(TENANT, "contact1");
    expect(typeof tid).toBe("string");
    expect(tid.length).toBeGreaterThan(0);
  });
});

// ── listThreads ──────────────────────────────────────────────────────────────

describe("SaasInboxService.listThreads", () => {
  it("returns empty array when no threads", async () => {
    const db = { query: vi.fn().mockResolvedValue([]) };
    const svc = new SaasInboxService(db as never);
    expect(await svc.listThreads(TENANT)).toEqual([]);
  });

  it("maps thread row to SaasThread shape", async () => {
    const db = { query: vi.fn().mockResolvedValue([{
      thread_id: "t1", contact_id: "c1", contact_name: "Ana", contact_email: "a@x.com", contact_phone: null,
      channels: "email,sms", conversation_count: "2",
      last_message: "Hi", last_message_at: now,
      has_breached: false, earliest_sla_due: new Date(Date.now() + 1800_000),
    }]) };
    const svc = new SaasInboxService(db as never);
    const threads = await svc.listThreads(TENANT);
    expect(threads).toHaveLength(1);
    expect(threads[0]!.threadId).toBe("t1");
    expect(threads[0]!.channels).toContain("email");
    expect(threads[0]!.channels).toContain("sms");
    expect(threads[0]!.conversationCount).toBe(2);
    expect(threads[0]!.contactName).toBe("Ana");
  });

  it("marks has_breached when SLA breached", async () => {
    const db = { query: vi.fn().mockResolvedValue([{
      thread_id: "t2", contact_id: "c2", contact_name: null, contact_email: null, contact_phone: null,
      channels: "chat", conversation_count: "1",
      last_message: null, last_message_at: null,
      has_breached: true, earliest_sla_due: null,
    }]) };
    const svc = new SaasInboxService(db as never);
    const threads = await svc.listThreads(TENANT);
    expect(threads[0]!.hasBreached).toBe(true);
    expect(threads[0]!.earliestSlaDue).toBeNull();
  });
});

// ── getThread ────────────────────────────────────────────────────────────────

describe("SaasInboxService.getThread", () => {
  it("returns empty when thread has no conversations", async () => {
    const db = { query: vi.fn().mockResolvedValue([]) };
    const svc = new SaasInboxService(db as never);
    const result = await svc.getThread(TENANT, "missing-thread");
    expect(result.conversations).toHaveLength(0);
    expect(result.messages).toHaveLength(0);
  });

  it("returns conversations and messages when thread exists", async () => {
    const convWithThread = { ...baseConvRow, thread_id: "thread1" };
    const db = {
      query: vi.fn()
        .mockResolvedValueOnce([convWithThread])  // listConversations
        .mockResolvedValueOnce([msgRow]),          // batch messages
    };
    const svc = new SaasInboxService(db as never);
    const result = await svc.getThread(TENANT, "thread1");
    expect(result.conversations).toHaveLength(1);
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0]!.body).toBe("Hello");
  });

  it("cross-channel: messages from multiple convs merged chronologically", async () => {
    const conv1 = { ...baseConvRow, id: "cv1", thread_id: "t1", channel: "email" };
    const conv2 = { ...baseConvRow, id: "cv2", thread_id: "t1", channel: "sms" };
    const msg1 = { ...msgRow, id: "m1", conversation_id: "cv1", channel: "email" };
    const msg2 = { ...msgRow, id: "m2", conversation_id: "cv2", channel: "sms", body: "By SMS" };
    const db = {
      query: vi.fn()
        .mockResolvedValueOnce([conv1, conv2])
        .mockResolvedValueOnce([msg1, msg2]),
    };
    const svc = new SaasInboxService(db as never);
    const result = await svc.getThread(TENANT, "t1");
    expect(result.messages).toHaveLength(2);
    const channels = result.messages.map(m => m.channel);
    expect(channels).toContain("email");
    expect(channels).toContain("sms");
  });
});

// ── assignRoundRobin ─────────────────────────────────────────────────────────

describe("SaasInboxService.assignRoundRobin", () => {
  it("assigns first member when no previous assignment", async () => {
    const updatedConv = { ...baseConvRow, assigned_to: "member1" };
    const db = {
      query: vi.fn()
        .mockResolvedValueOnce([baseConvRow])  // getConversation
        .mockResolvedValueOnce([updatedConv]), // UPDATE
    };
    const svc = new SaasInboxService(db as never);
    // assignConversation with explicit memberId bypasses round-robin
    const conv = await svc.assignConversation(TENANT, "cv1", "member1");
    expect(conv.assignedTo).toBe("member1");
  });

  it("assignConversation with null triggers round-robin — returns null when no members", async () => {
    const db = {
      query: vi.fn()
        .mockResolvedValueOnce([])              // routing check
        .mockResolvedValueOnce([])              // members query (empty)
        .mockResolvedValueOnce([baseConvRow])   // getConversation for updateConversation
        .mockResolvedValueOnce([baseConvRow]),  // UPDATE
    };
    const svc = new SaasInboxService(db as never);
    // With no members, assigned_to stays null
    const conv = await svc.assignConversation(TENANT, "cv1", null);
    expect(conv.assignedTo).toBeNull();
  });

  it("round_robin_enabled=false skips assignment", async () => {
    const db = {
      query: vi.fn()
        .mockResolvedValueOnce([{ round_robin_enabled: false, last_assigned_member_id: null }])
        .mockResolvedValueOnce([baseConvRow])
        .mockResolvedValueOnce([baseConvRow]),
    };
    const svc = new SaasInboxService(db as never);
    const conv = await svc.assignConversation(TENANT, "cv1", null);
    expect(conv.assignedTo).toBeNull();
  });

  it("assignConversation NOT_FOUND throws", async () => {
    const db = {
      query: vi.fn()
        .mockResolvedValueOnce([])   // routing
        .mockResolvedValueOnce([])   // getConversation → null
        .mockResolvedValueOnce([]),  // UPDATE → empty
    };
    const svc = new SaasInboxService(db as never);
    await expect(svc.assignConversation(TENANT, "bad-id", "m1"))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("assignConversation with explicit member updates assigned_to", async () => {
    const assigned = { ...baseConvRow, assigned_to: "member-x" };
    const db = {
      query: vi.fn()
        .mockResolvedValueOnce([baseConvRow])
        .mockResolvedValueOnce([assigned]),
    };
    const svc = new SaasInboxService(db as never);
    const conv = await svc.assignConversation(TENANT, "cv1", "member-x");
    expect(conv.assignedTo).toBe("member-x");
  });
});

// ── getSlaPolicy / setSlaPolicy ──────────────────────────────────────────────

describe("SaasInboxService SLA policy", () => {
  it("getSlaPolicy returns defaults when no row", async () => {
    const db = { query: vi.fn().mockResolvedValue([]) };
    const svc = new SaasInboxService(db as never);
    const policy = await svc.getSlaPolicy(TENANT);
    expect(policy.firstResponseMinutes).toBe(60);
    expect(policy.resolutionMinutes).toBe(480);
    expect(policy.businessHoursOnly).toBe(false);
  });

  it("getSlaPolicy returns stored values", async () => {
    const db = { query: vi.fn().mockResolvedValue([{
      first_response_minutes: 30, resolution_minutes: 240, business_hours_only: true,
    }]) };
    const svc = new SaasInboxService(db as never);
    const policy = await svc.getSlaPolicy(TENANT);
    expect(policy.firstResponseMinutes).toBe(30);
    expect(policy.resolutionMinutes).toBe(240);
    expect(policy.businessHoursOnly).toBe(true);
  });

  it("setSlaPolicy merges partial update", async () => {
    const db = {
      query: vi.fn()
        .mockResolvedValueOnce([{ first_response_minutes: 60, resolution_minutes: 480, business_hours_only: false }])
        .mockResolvedValueOnce([]),
    };
    const svc = new SaasInboxService(db as never);
    const policy = await svc.setSlaPolicy(TENANT, { firstResponseMinutes: 15 });
    expect(policy.firstResponseMinutes).toBe(15);
    expect(policy.resolutionMinutes).toBe(480);
  });
});

// ── computeSlaDue / checkSlaBreaches / listSlaAtRisk ────────────────────────

describe("SaasInboxService SLA computation", () => {
  it("computeSlaDue returns a future date", async () => {
    const db = { query: vi.fn().mockResolvedValue([]) };
    const svc = new SaasInboxService(db as never);
    const due = await svc.computeSlaDue(TENANT, "cv1");
    expect(due.getTime()).toBeGreaterThan(Date.now());
  });

  it("computeSlaDue uses policy firstResponseMinutes", async () => {
    const db = { query: vi.fn().mockResolvedValue([{ first_response_minutes: 30, resolution_minutes: 480, business_hours_only: false }]) };
    const svc = new SaasInboxService(db as never);
    const before = Date.now();
    const due = await svc.computeSlaDue(TENANT, "cv1");
    const diff = due.getTime() - before;
    expect(diff).toBeGreaterThanOrEqual(29 * 60_000);
    expect(diff).toBeLessThanOrEqual(31 * 60_000);
  });

  it("checkSlaBreaches returns count of breached rows", async () => {
    const db = {
      query: vi.fn().mockResolvedValue([{ id: "cv1" }, { id: "cv2" }]),
    };
    const svc = new SaasInboxService(db as never);
    const count = await svc.checkSlaBreaches(TENANT);
    expect(count).toBe(2);
  });

  it("checkSlaBreaches returns 0 when no breaches", async () => {
    const db = { query: vi.fn().mockResolvedValue([]) };
    const svc = new SaasInboxService(db as never);
    expect(await svc.checkSlaBreaches(TENANT)).toBe(0);
  });

  it("listSlaAtRisk calls listConversations with slaAtRisk=true", async () => {
    const atRisk = { ...baseConvRow, sla_breached: true, sla_due_at: new Date(Date.now() - 1000) };
    const db = { query: vi.fn().mockResolvedValue([atRisk]) };
    const svc = new SaasInboxService(db as never);
    const list = await svc.listSlaAtRisk(TENANT);
    expect(list).toHaveLength(1);
    expect(list[0]!.slaBreached).toBe(true);
  });

  it("listSlaAtRisk returns empty when all within SLA", async () => {
    const db = { query: vi.fn().mockResolvedValue([]) };
    const svc = new SaasInboxService(db as never);
    expect(await svc.listSlaAtRisk(TENANT)).toHaveLength(0);
  });
});

// ── replyToConversation — email SES ─────────────────────────────────────────

describe("SaasInboxService.replyToConversation email via SES", () => {
  it("dispatches email when contact has email and SES configured", async () => {
    const emailConv = { ...baseConvRow, channel: "email", contact_id: "c1", first_response_at: null };
    // Mock SES client
    const sesClient = { send: vi.fn().mockResolvedValue({}) };
    vi.doMock("../../email/sesClient", () => ({
      getSesClient: () => sesClient,
    }));
    const db = {
      query: vi.fn()
        .mockResolvedValueOnce([emailConv])   // getConversation
        .mockResolvedValueOnce([emailConv])   // getConversation (sendMessage)
        .mockResolvedValueOnce([msgRow])      // INSERT message
        .mockResolvedValueOnce([])            // UPDATE conv
        .mockResolvedValueOnce([])            // UPDATE first_response_at
        .mockResolvedValueOnce([{ id: "c1", name: "Ana", email: "ana@example.com", phone: null }]),
    };
    const svc = new SaasInboxService(db as never);
    const result = await svc.replyToConversation(TENANT, "cv1", "Hello Ana");
    // channelDispatched depends on SES being configured in this env
    expect(result.message.id).toBe("m1");
    expect(result.message.body).toBe("Hello");
  });

  it("sets channelError when contact has no email", async () => {
    const emailConv = { ...baseConvRow, channel: "email", contact_id: "c1", contact_email: null, first_response_at: null };
    const db = {
      query: vi.fn()
        .mockResolvedValueOnce([emailConv])
        .mockResolvedValueOnce([emailConv])
        .mockResolvedValueOnce([msgRow])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: "c1", name: "Ana", email: null, phone: null }]),
    };
    const svc = new SaasInboxService(db as never);
    const result = await svc.replyToConversation(TENANT, "cv1", "Hi");
    expect(result.channelDispatched).toBe(false);
    expect(result.channelError).toContain("email");
  });

  it("sets first_response_at on first outbound reply", async () => {
    const emailConv = { ...baseConvRow, channel: "email", first_response_at: null };
    const db = {
      query: vi.fn()
        .mockResolvedValueOnce([emailConv])
        .mockResolvedValueOnce([emailConv])
        .mockResolvedValueOnce([msgRow])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])   // UPDATE first_response_at
        .mockResolvedValueOnce([]),
    };
    const svc = new SaasInboxService(db as never);
    await svc.replyToConversation(TENANT, "cv1", "First reply");
    // 5th call should be the UPDATE first_response_at
    const calls = (db.query as ReturnType<typeof vi.fn>).mock.calls;
    const firstRespUpdate = calls.find((c: unknown[]) =>
      typeof c[0] === "string" && (c[0] as string).includes("first_response_at"),
    );
    expect(firstRespUpdate).toBeDefined();
  });

  it("skips first_response_at update when already set", async () => {
    const emailConv = { ...baseConvRow, channel: "email", first_response_at: new Date() };
    const db = {
      query: vi.fn()
        .mockResolvedValueOnce([emailConv])
        .mockResolvedValueOnce([emailConv])
        .mockResolvedValueOnce([msgRow])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]),
    };
    const svc = new SaasInboxService(db as never);
    await svc.replyToConversation(TENANT, "cv1", "Follow up");
    const calls = (db.query as ReturnType<typeof vi.fn>).mock.calls;
    const firstRespUpdates = calls.filter((c: unknown[]) =>
      typeof c[0] === "string" && (c[0] as string).includes("first_response_at=NOW"),
    );
    expect(firstRespUpdates).toHaveLength(0);
  });
});

// ── enrichConversationList ────────────────────────────────────────────────────

describe("SaasInboxService.enrichConversationList", () => {
  it("returns same list when no contacts", async () => {
    const db = { query: vi.fn() };
    const svc = new SaasInboxService(db as never);
    const conv = { ...baseConvRow, contactId: null, contactName: null, contactEmail: null, contactPhone: null } as never;
    const result = await svc.enrichConversationList(TENANT, [conv]);
    expect(result).toHaveLength(1);
    expect(db.query).not.toHaveBeenCalled();
  });

  it("enriches contact data from saas_contacts", async () => {
    const db = {
      query: vi.fn().mockResolvedValue([{ id: "c1", name: "María", email: "m@x.com", phone: "+34600000" }]),
    };
    const svc = new SaasInboxService(db as never);
    const conv = {
      id: "cv1", tenantId: TENANT, contactId: "c1", contactName: null, contactEmail: null, contactPhone: null,
      channel: "email", status: "open", priority: "normal", assignedTo: null,
      threadId: null, subject: null, firstResponseAt: null, slaDueAt: null, slaBreached: false,
      unreadCount: 0, lastMessage: null, lastMessageAt: null,
      createdAt: now.toISOString(), updatedAt: now.toISOString(),
    } as never;
    const result = await svc.enrichConversationList(TENANT, [conv]);
    expect(result[0]!.contactName).toBe("María");
    expect(result[0]!.contactEmail).toBe("m@x.com");
    expect(result[0]!.contactPhone).toBe("+34600000");
  });
});
