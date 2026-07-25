import { beforeEach, describe, expect, it } from "vitest";
import {
  KANBAN_COLUMNS,
  ProjectsFieldServiceCore,
  ProjectsFsError,
  SIGNATURE_CONSENT_GRANTED,
  assertProjectsFsCoreIntegrity,
  resetProjectsFieldServiceCoreForTests,
} from "../ProjectsFieldServiceCore";

describe("ProjectsFieldServiceCore — Block 29", () => {
  let core: ProjectsFieldServiceCore;

  beforeEach(() => {
    resetProjectsFieldServiceCoreForTests();
    core = new ProjectsFieldServiceCore();
  });

  it("creates project with tasks, dependencies, and kanban columns", () => {
    const project = core.createProject({
      tenantId: "t1",
      name: "Website redesign",
      templateId: "web_landing",
      milestones: [{ title: "Kickoff", dueAt: "2026-08-01T00:00:00.000Z" }],
    });
    expect(project.status).toBe("draft");
    expect(project.templateId).toBe("web_landing");
    expect(project.milestones).toHaveLength(1);

    const design = core.addTask({
      tenantId: "t1",
      projectId: project.id,
      title: "Design",
      status: "todo",
    });
    const build = core.addTask({
      tenantId: "t1",
      projectId: project.id,
      title: "Build",
      dependsOn: [design.id],
      status: "todo",
    });

    expect(() =>
      core.updateTaskStatus({
        tenantId: "t1",
        projectId: project.id,
        taskId: build.id,
        status: "in_progress",
      }),
    ).toThrow(ProjectsFsError);

    core.updateTaskStatus({
      tenantId: "t1",
      projectId: project.id,
      taskId: design.id,
      status: "done",
    });
    const started = core.updateTaskStatus({
      tenantId: "t1",
      projectId: project.id,
      taskId: build.id,
      status: "in_progress",
    });
    expect(started.status).toBe("in_progress");

    const board = core.getKanbanBoard("t1", project.id);
    for (const col of KANBAN_COLUMNS) {
      expect(board[col]).toBeDefined();
    }
    expect(board.done.some((t) => t.id === design.id)).toBe(true);
    expect(board.in_progress.some((t) => t.id === build.id)).toBe(true);
  });

  it("submits and approves timesheet entries", () => {
    const project = core.createProject({ tenantId: "t1", name: "Ops" });
    const entry = core.addTimesheetEntry({
      tenantId: "t1",
      projectId: project.id,
      assigneeId: "u1",
      hours: 4,
      date: "2026-07-25",
      rateInternalCents: 4500,
    });
    expect(entry.status).toBe("draft");
    expect(entry.rateInternalCents).toBe(4500);

    const submitted = core.submitTimesheet("t1", entry.id);
    expect(submitted.status).toBe("submitted");
    const approved = core.approveTimesheet("t1", entry.id);
    expect(approved.status).toBe("approved");
  });

  it("computeOperationalMargin is non-accounting ops estimate", () => {
    const margin = core.computeOperationalMargin({
      revenueEstimateCents: 50_000,
      hoursWorked: 20,
      rateInternalCentsPerHour: 500,
    });
    expect(margin.method).toBe("computeOperationalMargin");
    expect(margin.accounting).toBe(false);
    expect(margin.internalCostCents).toBe(10_000);
    expect(margin.operationalMarginCents).toBe(40_000);
  });

  it("work order lifecycle: assign → schedule → evidence → complete", () => {
    const project = core.createProject({ tenantId: "t1", name: "Field" });
    const wo = core.createWorkOrder({
      tenantId: "t1",
      projectId: project.id,
      title: "On-site install",
      checklist: ["Arrive", "Install", "Photo"],
    });
    expect(wo.status).toBe("draft");
    expect(wo.signaturePrepared).toEqual({ status: "prepared_off", reason: "consent_required" });

    const assigned = core.assignWorkOrder("t1", wo.id, "tech-1");
    expect(assigned.status).toBe("assigned");
    expect(assigned.assigneeId).toBe("tech-1");

    const scheduled = core.scheduleWorkOrder("t1", wo.id, "2026-07-26T10:00:00.000Z");
    expect(scheduled.status).toBe("scheduled");

    const withEvidence = core.addWorkOrderEvidence("t1", wo.id, "https://example.test/photo.jpg");
    expect(withEvidence.status).toBe("in_progress");
    expect(withEvidence.evidenceLinks).toHaveLength(1);

    const itemId = wo.checklist[0]!.id;
    core.completeChecklistItem("t1", wo.id, itemId);

    const done = core.completeWorkOrder("t1", wo.id);
    expect(done.status).toBe("completed");
  });

  it("captureSignature ALWAYS throws BLOCKED_EXTERNAL; consent stays false", () => {
    expect(SIGNATURE_CONSENT_GRANTED).toBe(false);
    const project = core.createProject({ tenantId: "t1", name: "Sig" });
    const wo = core.createWorkOrder({ tenantId: "t1", projectId: project.id, title: "Sign" });
    expect(() => core.captureSignature("t1", wo.id)).toThrow(ProjectsFsError);
    try {
      core.captureSignature("t1", wo.id);
    } catch (err) {
      expect(err).toBeInstanceOf(ProjectsFsError);
      expect((err as ProjectsFsError).code).toBe("BLOCKED_EXTERNAL");
    }
  });

  it("portal deliverables are tenant-isolated", () => {
    const pA = core.createProject({ tenantId: "tenant-a", name: "A" });
    const pB = core.createProject({ tenantId: "tenant-b", name: "B" });
    core.addClientDeliverable({
      tenantId: "tenant-a",
      projectId: pA.id,
      title: "Landing draft",
      portalRole: "client_reviewer",
    });
    core.addClientDeliverable({
      tenantId: "tenant-b",
      projectId: pB.id,
      title: "Other tenant doc",
      portalRole: "client_reviewer",
    });

    const listed = core.listClientDeliverablesForPortal({
      tenantId: "tenant-a",
      projectId: pA.id,
      portalRole: "client_reviewer",
    });
    expect(listed).toHaveLength(1);
    expect(listed[0]!.title).toBe("Landing draft");

    expect(() =>
      core.listClientDeliverablesForPortal({
        tenantId: "tenant-b",
        projectId: pA.id,
        portalRole: "client_reviewer",
      }),
    ).toThrow(ProjectsFsError);

    expect(core.listProjects("tenant-a").every((p) => p.tenantId === "tenant-a")).toBe(true);
    expect(core.listAuditLog("tenant-a").every((e) => e.tenantId === "tenant-a")).toBe(true);
  });

  it("planAssignment warns on capacity overload without throwing", () => {
    core.setAssigneeCapacity({ tenantId: "t1", assigneeId: "u1", weeklyHoursCapacity: 20 });
    const okPlan = core.planAssignment({ tenantId: "t1", assigneeId: "u1", plannedHours: 16 });
    expect(okPlan.warn).toBe(false);
    expect(okPlan.overloadHours).toBe(0);

    const warnPlan = core.planAssignment({ tenantId: "t1", assigneeId: "u1", plannedHours: 30 });
    expect(warnPlan.ok).toBe(true);
    expect(warnPlan.warn).toBe(true);
    expect(warnPlan.overloadHours).toBe(10);
    expect(warnPlan.message).toMatch(/capacity_overload_warn/);
  });

  it("SLA breach helper detects overrun", () => {
    const project = core.createProject({ tenantId: "t1", name: "SLA" });
    core.setSlaTarget({
      tenantId: "t1",
      projectId: project.id,
      targetHours: 8,
      startedAt: "2026-07-25T00:00:00.000Z",
    });
    const within = core.checkSlaBreach("t1", project.id, new Date("2026-07-25T04:00:00.000Z"));
    expect(within.breached).toBe(false);
    expect(within.remainingHours).toBe(4);

    const breached = core.checkSlaBreach("t1", project.id, new Date("2026-07-25T12:00:00.000Z"));
    expect(breached.breached).toBe(true);
    expect(breached.elapsedHours).toBe(12);
  });

  it("passes assertProjectsFsCoreIntegrity()", () => {
    expect(assertProjectsFsCoreIntegrity()).toEqual({ ok: true, violations: [] });
  });
});
