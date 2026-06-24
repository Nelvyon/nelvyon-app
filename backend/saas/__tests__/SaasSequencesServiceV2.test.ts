import { describe, it, expect, vi, beforeEach } from "vitest";
import { SaasSequencesService, resetSaasSequencesServiceForTests } from "../SaasSequencesService";

// ── DB mock factory ──────────────────────────────────────────────────────────

function makeDb() {
  const query = vi.fn();
  return { query };
}

const SEQ = {
  id: "seq-1", tenant_id: "t1", name: "Onboarding", description: null,
  trigger_type: "manual" as const, trigger_config: {}, status: "active" as const,
  enrollments_count: 0, created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
};

const STEP_EMAIL = {
  id: "step-1", sequence_id: "seq-1", position: 0, step_type: "email" as const,
  delay_days: 0, delay_hours: 0, subject: "Bienvenido", body_html: "<p>Hola</p>",
  branch_condition: null, branch_yes_position: null, branch_no_position: null,
  created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
};

const STEP_WAIT = {
  ...STEP_EMAIL, id: "step-2", position: 1, step_type: "wait" as const,
  subject: "", body_html: "", delay_days: 1,
};

const STEP_BRANCH = {
  ...STEP_EMAIL, id: "step-3", position: 2, step_type: "branch" as const,
  subject: "", body_html: "",
  branch_condition: { field: "replied" as const, op: "eq" as const, value: true },
  branch_yes_position: 3, branch_no_position: 4,
};

// ── updateStep ──────────────────────────────────────────────────────────────

describe("SaasSequencesService.updateStep", () => {
  let db: ReturnType<typeof makeDb>;
  let svc: SaasSequencesService;

  beforeEach(() => {
    resetSaasSequencesServiceForTests();
    db = makeDb();
    svc = new SaasSequencesService(db as never);
  });

  it("updates step_type and subject", async () => {
    db.query
      .mockResolvedValueOnce([SEQ])              // get sequence
      .mockResolvedValueOnce([{ ...STEP_EMAIL, step_type: "wait", subject: "" }]); // UPDATE RETURNING

    const result = await svc.updateStep("t1", "seq-1", "step-1", { stepType: "wait" });
    expect(result.stepType).toBe("wait");
    expect(db.query).toHaveBeenCalledTimes(2);
  });

  it("updates branchCondition and positions", async () => {
    const updatedStep = {
      ...STEP_EMAIL, step_type: "branch" as const,
      branch_condition: { field: "replied", op: "eq", value: true },
      branch_yes_position: 3, branch_no_position: 4,
    };
    db.query
      .mockResolvedValueOnce([SEQ])
      .mockResolvedValueOnce([updatedStep]);

    const result = await svc.updateStep("t1", "seq-1", "step-1", {
      stepType: "branch",
      branchCondition: { field: "replied", op: "eq", value: true },
      branchYesPosition: 3, branchNoPosition: 4,
    });
    expect(result.stepType).toBe("branch");
    expect(result.branchCondition?.field).toBe("replied");
    expect(result.branchYesPosition).toBe(3);
  });

  it("throws NOT_FOUND when sequence not found", async () => {
    db.query.mockResolvedValueOnce([]);
    await expect(svc.updateStep("t1", "bad-id", "step-1", { delayDays: 1 })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws NOT_FOUND when step not found", async () => {
    db.query.mockResolvedValueOnce([SEQ]).mockResolvedValueOnce([]);
    await expect(svc.updateStep("t1", "seq-1", "bad-step", { delayDays: 1 })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("throws VALIDATION for empty update", async () => {
    db.query.mockResolvedValueOnce([SEQ]);
    await expect(svc.updateStep("t1", "seq-1", "step-1", {})).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("throws VALIDATION for invalid stepType", async () => {
    db.query.mockResolvedValueOnce([SEQ]);
    await expect(svc.updateStep("t1", "seq-1", "step-1", { stepType: "invalid" as never })).rejects.toMatchObject({ code: "VALIDATION" });
  });
});

// ── handleReplyHook ─────────────────────────────────────────────────────────

describe("SaasSequencesService.handleReplyHook", () => {
  let db: ReturnType<typeof makeDb>;
  let svc: SaasSequencesService;

  beforeEach(() => {
    resetSaasSequencesServiceForTests();
    db = makeDb();
    svc = new SaasSequencesService(db as never);
  });

  it("marks reply_received=true on enrollment", async () => {
    const enrollment = {
      id: "enr-1", sequence_id: "seq-1", tenant_id: "t1", contact_id: "c1",
      current_step: 2, status: "active", reply_received: true,
      next_send_at: null, enrolled_at: new Date().toISOString(), completed_at: null,
    };
    db.query
      .mockResolvedValueOnce([enrollment])       // UPDATE reply_received
      .mockResolvedValueOnce([STEP_BRANCH])      // SELECT step at position 2
      .mockResolvedValueOnce(undefined);         // UPDATE current_step

    await svc.handleReplyHook("t1", "seq-1", "c1");
    expect(db.query).toHaveBeenCalledWith(
      expect.stringContaining("reply_received=true"),
      expect.any(Array),
    );
  });

  it("advances enrollment to branch_yes_position when on branch step", async () => {
    const enrollment = {
      id: "enr-1", sequence_id: "seq-1", tenant_id: "t1", contact_id: "c1",
      current_step: 2, status: "active", reply_received: true,
      next_send_at: null, enrolled_at: new Date().toISOString(), completed_at: null,
    };
    db.query
      .mockResolvedValueOnce([enrollment])
      .mockResolvedValueOnce([STEP_BRANCH])
      .mockResolvedValueOnce(undefined);

    await svc.handleReplyHook("t1", "seq-1", "c1");
    const lastCall = db.query.mock.calls[2]!;
    expect(lastCall[0]).toContain("current_step");
    expect(lastCall[1]).toContain(3); // branch_yes_position
  });

  it("does nothing when enrollment not found", async () => {
    db.query.mockResolvedValueOnce([]);
    await svc.handleReplyHook("t1", "seq-1", "c-missing");
    expect(db.query).toHaveBeenCalledTimes(1);
  });

  it("does nothing when step is not a branch", async () => {
    const enrollment = {
      id: "enr-1", sequence_id: "seq-1", tenant_id: "t1", contact_id: "c1",
      current_step: 0, status: "active", reply_received: true,
      next_send_at: null, enrolled_at: new Date().toISOString(), completed_at: null,
    };
    db.query
      .mockResolvedValueOnce([enrollment])
      .mockResolvedValueOnce([STEP_EMAIL]); // step_type=email

    await svc.handleReplyHook("t1", "seq-1", "c1");
    expect(db.query).toHaveBeenCalledTimes(2); // no third update call
  });
});

// ── addStep with branch/wait types ──────────────────────────────────────────

describe("SaasSequencesService.addStep — v2 types", () => {
  let db: ReturnType<typeof makeDb>;
  let svc: SaasSequencesService;

  beforeEach(() => {
    resetSaasSequencesServiceForTests();
    db = makeDb();
    svc = new SaasSequencesService(db as never);
  });

  it("adds wait step without requiring subject/bodyHtml", async () => {
    db.query
      .mockResolvedValueOnce([SEQ])
      .mockResolvedValueOnce([{ max_pos: 0 }])
      .mockResolvedValueOnce([STEP_WAIT]);

    const step = await svc.addStep("t1", "seq-1", { stepType: "wait", delayDays: 1 });
    expect(step.stepType).toBe("wait");
  });

  it("adds branch step with condition", async () => {
    db.query
      .mockResolvedValueOnce([SEQ])
      .mockResolvedValueOnce([{ max_pos: 1 }])
      .mockResolvedValueOnce([STEP_BRANCH]);

    const step = await svc.addStep("t1", "seq-1", {
      stepType: "branch",
      branchCondition: { field: "replied", op: "eq", value: true },
      branchYesPosition: 3, branchNoPosition: 4,
    });
    expect(step.stepType).toBe("branch");
    expect(step.branchCondition?.field).toBe("replied");
  });

  it("throws VALIDATION when email step missing subject", async () => {
    db.query.mockResolvedValueOnce([SEQ]);
    await expect(svc.addStep("t1", "seq-1", { stepType: "email", bodyHtml: "<p>ok</p>" })).rejects.toMatchObject({ code: "VALIDATION" });
  });

  it("throws VALIDATION when email step missing bodyHtml", async () => {
    db.query.mockResolvedValueOnce([SEQ]);
    await expect(svc.addStep("t1", "seq-1", { stepType: "email", subject: "Hi" })).rejects.toMatchObject({ code: "VALIDATION" });
  });
});

// ── processDueEnrollments — branching ───────────────────────────────────────

describe("SaasSequencesService.processDueEnrollments — branch/wait logic", () => {
  let db: ReturnType<typeof makeDb>;
  let svc: SaasSequencesService;
  const sendEmail = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    resetSaasSequencesServiceForTests();
    db = makeDb();
    svc = new SaasSequencesService(db as never);
    sendEmail.mockClear();
  });

  it("processes branch step without sending email", async () => {
    const enrollment = {
      id: "enr-1", sequence_id: "seq-1", tenant_id: "t1", contact_id: "c1",
      current_step: 2, reply_received: true,
    };
    const branchStepRow = {
      ...STEP_BRANCH,
      contact_email: "test@test.com", contact_name: "Test",
    };
    const nextStepRow = { position: 3, delay_days: 0, delay_hours: 0 };

    db.query
      .mockResolvedValueOnce([enrollment])           // SELECT due enrollments
      .mockResolvedValueOnce([branchStepRow])        // SELECT step + contact
      .mockResolvedValueOnce([nextStepRow])          // SELECT next step
      .mockResolvedValueOnce(undefined);             // UPDATE enrollment

    await svc.processDueEnrollments(sendEmail);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("processes wait step without sending email", async () => {
    const enrollment = {
      id: "enr-1", sequence_id: "seq-1", tenant_id: "t1", contact_id: "c1",
      current_step: 1, reply_received: false,
    };
    const waitStepRow = {
      ...STEP_WAIT,
      contact_email: "test@test.com", contact_name: "Test",
    };
    const nextStepRow = { position: 2, delay_days: 0, delay_hours: 0 };

    db.query
      .mockResolvedValueOnce([enrollment])
      .mockResolvedValueOnce([waitStepRow])
      .mockResolvedValueOnce([nextStepRow])
      .mockResolvedValueOnce(undefined);

    await svc.processDueEnrollments(sendEmail);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it("sends email for email steps and advances enrollment", async () => {
    const enrollment = {
      id: "enr-1", sequence_id: "seq-1", tenant_id: "t1", contact_id: "c1",
      current_step: 0, reply_received: false,
    };
    const emailStepRow = {
      ...STEP_EMAIL,
      contact_email: "user@test.com", contact_name: "User",
    };

    db.query
      .mockResolvedValueOnce([enrollment])
      .mockResolvedValueOnce([emailStepRow])
      .mockResolvedValueOnce([])              // no next step → completes
      .mockResolvedValueOnce(undefined);

    await svc.processDueEnrollments(sendEmail);
    expect(sendEmail).toHaveBeenCalledWith("user@test.com", "Bienvenido", "<p>Hola</p>");
  });

  it("marks enrollment failed when no contact email", async () => {
    const enrollment = {
      id: "enr-1", sequence_id: "seq-1", tenant_id: "t1", contact_id: "c1",
      current_step: 0, reply_received: false,
    };
    const stepWithoutEmail = { ...STEP_EMAIL, contact_email: null, contact_name: "User" };

    db.query
      .mockResolvedValueOnce([enrollment])
      .mockResolvedValueOnce([stepWithoutEmail])
      .mockResolvedValueOnce(undefined);

    await svc.processDueEnrollments(sendEmail);
    const failCall = db.query.mock.calls[2]![0] as string;
    expect(failCall).toContain("status='failed'");
    expect(sendEmail).not.toHaveBeenCalled();
  });
});
