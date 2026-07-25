/**
 * Projects & Field Service CORE (NELVYON Block 29).
 *
 * In-memory operational project management: projects, milestones, tasks/deps,
 * kanban-by-status, capacity planning, timesheets, field work orders, SLA, and a
 * portal deliverable stub. Operational profitability (`computeOperationalMargin`)
 * is explicitly NON-ACCOUNTING / NON-GL — config rates only for ops estimates.
 *
 * Signature capture stays fail-closed: `signatureConsentGranted` is hardcoded
 * `false` and `captureSignature()` ALWAYS throws `BLOCKED_EXTERNAL`.
 *
 * Exported from `backend/agency/index.ts` / OsCatalogV1 v1.7.0.
 */

import { randomUUID } from "node:crypto";

export type TenantId = string;

export type ProjectsFsErrorCode =
  | "TENANT_REQUIRED"
  | "TENANT_MISMATCH"
  | "NOT_FOUND"
  | "INVALID_STATE"
  | "DEPENDENCY_UNMET"
  | "BLOCKED_EXTERNAL"
  | "CAPACITY_OVERLOAD";

export class ProjectsFsError extends Error {
  readonly code: ProjectsFsErrorCode;

  constructor(code: ProjectsFsErrorCode, message: string) {
    super(`${code}: ${message}`);
    this.name = "ProjectsFsError";
    this.code = code;
  }
}

export type ProjectStatus = "draft" | "active" | "on_hold" | "completed" | "cancelled";

export type TaskStatus = "backlog" | "todo" | "in_progress" | "review" | "done" | "blocked";

/** Kanban columns are derived from task status — no separate board entity. */
export const KANBAN_COLUMNS: readonly TaskStatus[] = [
  "backlog",
  "todo",
  "in_progress",
  "review",
  "done",
  "blocked",
] as const;

export type ProjectMilestone = {
  id: string;
  title: string;
  dueAt: string | null;
  completed: boolean;
};

export type ProjectTask = {
  id: string;
  title: string;
  status: TaskStatus;
  dependsOn: string[];
  assigneeId: string | null;
};

export type Project = {
  id: string;
  tenantId: TenantId;
  name: string;
  templateId: string | null;
  status: ProjectStatus;
  milestones: ProjectMilestone[];
  tasks: ProjectTask[];
  createdAt: string;
};

export type AssigneeCapacity = {
  tenantId: TenantId;
  assigneeId: string;
  weeklyHoursCapacity: number;
};

export type AssignmentPlanResult = {
  ok: boolean;
  warn: boolean;
  plannedHours: number;
  capacityHours: number;
  overloadHours: number;
  message: string | null;
};

export type TimesheetStatus = "draft" | "submitted" | "approved" | "rejected";

export type TimesheetEntry = {
  id: string;
  tenantId: TenantId;
  projectId: string;
  taskId: string | null;
  assigneeId: string;
  hours: number;
  date: string;
  /** Informational only — NEVER posted to GL / accounting. */
  rateInternalCents: number;
  status: TimesheetStatus;
  createdAt: string;
};

export type OperationalMarginInput = {
  revenueEstimateCents: number;
  hoursWorked: number;
  rateInternalCentsPerHour: number;
};

export type OperationalMarginResult = {
  revenueEstimateCents: number;
  internalCostCents: number;
  operationalMarginCents: number;
  method: "computeOperationalMargin";
  accounting: false;
  note: string;
};

export type WorkOrderStatus = "draft" | "assigned" | "scheduled" | "in_progress" | "completed" | "cancelled";

export type FieldWorkOrder = {
  id: string;
  tenantId: TenantId;
  projectId: string;
  title: string;
  assigneeId: string | null;
  scheduledAt: string | null;
  status: WorkOrderStatus;
  checklist: Array<{ id: string; label: string; done: boolean }>;
  evidenceLinks: string[];
  signaturePrepared: { status: "prepared_off"; reason: "consent_required" };
  createdAt: string;
};

export type ClientDeliverable = {
  id: string;
  tenantId: TenantId;
  projectId: string;
  title: string;
  portalRole: string;
  createdAt: string;
};

export type SlaTarget = {
  tenantId: TenantId;
  projectId: string;
  targetHours: number;
  startedAt: string;
};

export type SlaBreachCheck = {
  breached: boolean;
  elapsedHours: number;
  targetHours: number;
  remainingHours: number;
};

export type ProjectsFsAuditEntry = {
  id: string;
  tenantId: TenantId;
  at: string;
  action: string;
  detail: string;
};

/** Hardcoded false — there is no runtime path that grants signature consent. */
export const SIGNATURE_CONSENT_GRANTED = false as const;

type TenantState = {
  projects: Map<string, Project>;
  capacities: Map<string, AssigneeCapacity>;
  timesheets: Map<string, TimesheetEntry>;
  workOrders: Map<string, FieldWorkOrder>;
  deliverables: Map<string, ClientDeliverable>;
  slas: Map<string, SlaTarget>;
  auditLog: ProjectsFsAuditEntry[];
};

function emptyTenantState(): TenantState {
  return {
    projects: new Map(),
    capacities: new Map(),
    timesheets: new Map(),
    workOrders: new Map(),
    deliverables: new Map(),
    slas: new Map(),
    auditLog: [],
  };
}

/**
 * In-memory Projects & Field Service core with hard tenant isolation.
 * Operational margin is an ops estimate only — never an accounting entry.
 */
export class ProjectsFieldServiceCore {
  private readonly tenants = new Map<TenantId, TenantState>();

  private stateFor(tenantId: TenantId): TenantState {
    if (!tenantId) throw new ProjectsFsError("TENANT_REQUIRED", "tenantId is required");
    let state = this.tenants.get(tenantId);
    if (!state) {
      state = emptyTenantState();
      this.tenants.set(tenantId, state);
    }
    return state;
  }

  private audit(tenantId: TenantId, action: string, detail: string): void {
    this.stateFor(tenantId).auditLog.push({
      id: randomUUID(),
      tenantId,
      at: new Date().toISOString(),
      action,
      detail,
    });
  }

  private getOwnedProject(tenantId: TenantId, projectId: string): Project {
    const project = this.stateFor(tenantId).projects.get(projectId);
    if (!project) throw new ProjectsFsError("NOT_FOUND", `project not found: ${projectId}`);
    if (project.tenantId !== tenantId) {
      throw new ProjectsFsError("TENANT_MISMATCH", "cross-tenant project access denied");
    }
    return project;
  }

  reset(): void {
    this.tenants.clear();
  }

  createProject(input: {
    tenantId: TenantId;
    name: string;
    templateId?: string;
    milestones?: Array<{ title: string; dueAt?: string }>;
  }): Project {
    const state = this.stateFor(input.tenantId);
    const project: Project = {
      id: randomUUID(),
      tenantId: input.tenantId,
      name: input.name.trim(),
      templateId: input.templateId ?? null,
      status: "draft",
      milestones: (input.milestones ?? []).map((m) => ({
        id: randomUUID(),
        title: m.title,
        dueAt: m.dueAt ?? null,
        completed: false,
      })),
      tasks: [],
      createdAt: new Date().toISOString(),
    };
    state.projects.set(project.id, project);
    this.audit(input.tenantId, "project_created", project.id);
    return structuredClone(project);
  }

  getProject(tenantId: TenantId, projectId: string): Project {
    return structuredClone(this.getOwnedProject(tenantId, projectId));
  }

  listProjects(tenantId: TenantId): Project[] {
    return [...this.stateFor(tenantId).projects.values()].map((p) => structuredClone(p));
  }

  setProjectStatus(tenantId: TenantId, projectId: string, status: ProjectStatus): Project {
    const project = this.getOwnedProject(tenantId, projectId);
    project.status = status;
    this.audit(tenantId, "project_status", `${projectId}:${status}`);
    return structuredClone(project);
  }

  addTask(input: {
    tenantId: TenantId;
    projectId: string;
    title: string;
    dependsOn?: string[];
    assigneeId?: string;
    status?: TaskStatus;
  }): ProjectTask {
    const project = this.getOwnedProject(input.tenantId, input.projectId);
    const dependsOn = input.dependsOn ?? [];
    for (const depId of dependsOn) {
      if (!project.tasks.some((t) => t.id === depId)) {
        throw new ProjectsFsError("NOT_FOUND", `dependency task not found: ${depId}`);
      }
    }
    const task: ProjectTask = {
      id: randomUUID(),
      title: input.title.trim(),
      status: input.status ?? "backlog",
      dependsOn: [...dependsOn],
      assigneeId: input.assigneeId ?? null,
    };
    project.tasks.push(task);
    this.audit(input.tenantId, "task_added", `${input.projectId}:${task.id}`);
    return structuredClone(task);
  }

  updateTaskStatus(input: {
    tenantId: TenantId;
    projectId: string;
    taskId: string;
    status: TaskStatus;
  }): ProjectTask {
    const project = this.getOwnedProject(input.tenantId, input.projectId);
    const task = project.tasks.find((t) => t.id === input.taskId);
    if (!task) throw new ProjectsFsError("NOT_FOUND", `task not found: ${input.taskId}`);

    if (input.status === "in_progress" || input.status === "done") {
      for (const depId of task.dependsOn) {
        const dep = project.tasks.find((t) => t.id === depId);
        if (!dep || dep.status !== "done") {
          throw new ProjectsFsError("DEPENDENCY_UNMET", `task ${input.taskId} depends on unfinished ${depId}`);
        }
      }
    }

    task.status = input.status;
    this.audit(input.tenantId, "task_status", `${input.taskId}:${input.status}`);
    return structuredClone(task);
  }

  /** Kanban board: columns keyed by task status. */
  getKanbanBoard(tenantId: TenantId, projectId: string): Record<TaskStatus, ProjectTask[]> {
    const project = this.getOwnedProject(tenantId, projectId);
    const board = Object.fromEntries(KANBAN_COLUMNS.map((c) => [c, [] as ProjectTask[]])) as Record<
      TaskStatus,
      ProjectTask[]
    >;
    for (const task of project.tasks) {
      board[task.status].push(structuredClone(task));
    }
    return board;
  }

  setAssigneeCapacity(input: {
    tenantId: TenantId;
    assigneeId: string;
    weeklyHoursCapacity: number;
  }): AssigneeCapacity {
    if (input.weeklyHoursCapacity < 0) {
      throw new ProjectsFsError("INVALID_STATE", "weeklyHoursCapacity must be >= 0");
    }
    const cap: AssigneeCapacity = {
      tenantId: input.tenantId,
      assigneeId: input.assigneeId,
      weeklyHoursCapacity: input.weeklyHoursCapacity,
    };
    this.stateFor(input.tenantId).capacities.set(input.assigneeId, cap);
    this.audit(input.tenantId, "capacity_set", `${input.assigneeId}:${input.weeklyHoursCapacity}`);
    return { ...cap };
  }

  /**
   * Plans an assignment against weekly capacity. Overload returns `warn: true`
   * (does not throw) so ops can proceed with visibility.
   */
  planAssignment(input: {
    tenantId: TenantId;
    assigneeId: string;
    plannedHours: number;
  }): AssignmentPlanResult {
    const cap = this.stateFor(input.tenantId).capacities.get(input.assigneeId);
    const capacityHours = cap?.weeklyHoursCapacity ?? 0;
    const plannedHours = Math.max(0, input.plannedHours);
    const overloadHours = Math.max(0, plannedHours - capacityHours);
    const warn = overloadHours > 0;
    const result: AssignmentPlanResult = {
      ok: true,
      warn,
      plannedHours,
      capacityHours,
      overloadHours,
      message: warn
        ? `capacity_overload_warn: assignee ${input.assigneeId} planned ${plannedHours}h > capacity ${capacityHours}h`
        : null,
    };
    this.audit(
      input.tenantId,
      warn ? "assignment_capacity_warn" : "assignment_planned",
      `${input.assigneeId}:${plannedHours}/${capacityHours}`,
    );
    return result;
  }

  addTimesheetEntry(input: {
    tenantId: TenantId;
    projectId: string;
    taskId?: string;
    assigneeId: string;
    hours: number;
    date: string;
    rateInternalCents: number;
  }): TimesheetEntry {
    this.getOwnedProject(input.tenantId, input.projectId);
    if (input.hours <= 0) throw new ProjectsFsError("INVALID_STATE", "hours must be > 0");
    const entry: TimesheetEntry = {
      id: randomUUID(),
      tenantId: input.tenantId,
      projectId: input.projectId,
      taskId: input.taskId ?? null,
      assigneeId: input.assigneeId,
      hours: input.hours,
      date: input.date,
      rateInternalCents: Math.max(0, Math.round(input.rateInternalCents)),
      status: "draft",
      createdAt: new Date().toISOString(),
    };
    this.stateFor(input.tenantId).timesheets.set(entry.id, entry);
    this.audit(input.tenantId, "timesheet_added", entry.id);
    return structuredClone(entry);
  }

  submitTimesheet(tenantId: TenantId, entryId: string): TimesheetEntry {
    const entry = this.stateFor(tenantId).timesheets.get(entryId);
    if (!entry || entry.tenantId !== tenantId) {
      throw new ProjectsFsError("NOT_FOUND", `timesheet not found: ${entryId}`);
    }
    if (entry.status !== "draft") {
      throw new ProjectsFsError("INVALID_STATE", `cannot submit timesheet in status ${entry.status}`);
    }
    entry.status = "submitted";
    this.audit(tenantId, "timesheet_submitted", entryId);
    return structuredClone(entry);
  }

  approveTimesheet(tenantId: TenantId, entryId: string): TimesheetEntry {
    const entry = this.stateFor(tenantId).timesheets.get(entryId);
    if (!entry || entry.tenantId !== tenantId) {
      throw new ProjectsFsError("NOT_FOUND", `timesheet not found: ${entryId}`);
    }
    if (entry.status !== "submitted") {
      throw new ProjectsFsError("INVALID_STATE", `cannot approve timesheet in status ${entry.status}`);
    }
    entry.status = "approved";
    this.audit(tenantId, "timesheet_approved", entryId);
    return structuredClone(entry);
  }

  rejectTimesheet(tenantId: TenantId, entryId: string): TimesheetEntry {
    const entry = this.stateFor(tenantId).timesheets.get(entryId);
    if (!entry || entry.tenantId !== tenantId) {
      throw new ProjectsFsError("NOT_FOUND", `timesheet not found: ${entryId}`);
    }
    if (entry.status !== "submitted") {
      throw new ProjectsFsError("INVALID_STATE", `cannot reject timesheet in status ${entry.status}`);
    }
    entry.status = "rejected";
    this.audit(tenantId, "timesheet_rejected", entryId);
    return structuredClone(entry);
  }

  listTimesheets(tenantId: TenantId, projectId?: string): TimesheetEntry[] {
    return [...this.stateFor(tenantId).timesheets.values()]
      .filter((e) => (projectId ? e.projectId === projectId : true))
      .map((e) => structuredClone(e));
  }

  /**
   * Operational margin only — NOT accounting, NOT GL, NOT invoicing.
   * Formula: revenueEstimateCents − (hoursWorked × rateInternalCentsPerHour).
   */
  computeOperationalMargin(input: OperationalMarginInput): OperationalMarginResult {
    const revenueEstimateCents = Math.max(0, Math.round(input.revenueEstimateCents));
    const internalCostCents = Math.max(
      0,
      Math.round(input.hoursWorked * Math.max(0, input.rateInternalCentsPerHour)),
    );
    return {
      revenueEstimateCents,
      internalCostCents,
      operationalMarginCents: revenueEstimateCents - internalCostCents,
      method: "computeOperationalMargin",
      accounting: false,
      note: "Operational estimate only — explicitly NOT accounting/GL.",
    };
  }

  createWorkOrder(input: {
    tenantId: TenantId;
    projectId: string;
    title: string;
    checklist?: string[];
  }): FieldWorkOrder {
    this.getOwnedProject(input.tenantId, input.projectId);
    const wo: FieldWorkOrder = {
      id: randomUUID(),
      tenantId: input.tenantId,
      projectId: input.projectId,
      title: input.title.trim(),
      assigneeId: null,
      scheduledAt: null,
      status: "draft",
      checklist: (input.checklist ?? []).map((label) => ({
        id: randomUUID(),
        label,
        done: false,
      })),
      evidenceLinks: [],
      signaturePrepared: { status: "prepared_off", reason: "consent_required" },
      createdAt: new Date().toISOString(),
    };
    this.stateFor(input.tenantId).workOrders.set(wo.id, wo);
    this.audit(input.tenantId, "work_order_created", wo.id);
    return structuredClone(wo);
  }

  private getOwnedWorkOrder(tenantId: TenantId, workOrderId: string): FieldWorkOrder {
    const wo = this.stateFor(tenantId).workOrders.get(workOrderId);
    if (!wo) throw new ProjectsFsError("NOT_FOUND", `work order not found: ${workOrderId}`);
    if (wo.tenantId !== tenantId) {
      throw new ProjectsFsError("TENANT_MISMATCH", "cross-tenant work order access denied");
    }
    return wo;
  }

  assignWorkOrder(tenantId: TenantId, workOrderId: string, assigneeId: string): FieldWorkOrder {
    const wo = this.getOwnedWorkOrder(tenantId, workOrderId);
    if (wo.status === "cancelled" || wo.status === "completed") {
      throw new ProjectsFsError("INVALID_STATE", `cannot assign work order in status ${wo.status}`);
    }
    wo.assigneeId = assigneeId;
    wo.status = "assigned";
    this.audit(tenantId, "work_order_assigned", `${workOrderId}:${assigneeId}`);
    return structuredClone(wo);
  }

  scheduleWorkOrder(tenantId: TenantId, workOrderId: string, scheduledAt: string): FieldWorkOrder {
    const wo = this.getOwnedWorkOrder(tenantId, workOrderId);
    if (!wo.assigneeId) {
      throw new ProjectsFsError("INVALID_STATE", "assign before schedule");
    }
    wo.scheduledAt = scheduledAt;
    wo.status = "scheduled";
    this.audit(tenantId, "work_order_scheduled", `${workOrderId}:${scheduledAt}`);
    return structuredClone(wo);
  }

  addWorkOrderEvidence(tenantId: TenantId, workOrderId: string, link: string): FieldWorkOrder {
    const wo = this.getOwnedWorkOrder(tenantId, workOrderId);
    wo.evidenceLinks.push(link);
    if (wo.status === "scheduled" || wo.status === "assigned") {
      wo.status = "in_progress";
    }
    this.audit(tenantId, "work_order_evidence", `${workOrderId}:${link}`);
    return structuredClone(wo);
  }

  completeChecklistItem(tenantId: TenantId, workOrderId: string, checklistItemId: string): FieldWorkOrder {
    const wo = this.getOwnedWorkOrder(tenantId, workOrderId);
    const item = wo.checklist.find((c) => c.id === checklistItemId);
    if (!item) throw new ProjectsFsError("NOT_FOUND", `checklist item not found: ${checklistItemId}`);
    item.done = true;
    this.audit(tenantId, "work_order_checklist", `${workOrderId}:${checklistItemId}`);
    return structuredClone(wo);
  }

  completeWorkOrder(tenantId: TenantId, workOrderId: string): FieldWorkOrder {
    const wo = this.getOwnedWorkOrder(tenantId, workOrderId);
    wo.status = "completed";
    this.audit(tenantId, "work_order_completed", workOrderId);
    return structuredClone(wo);
  }

  getWorkOrder(tenantId: TenantId, workOrderId: string): FieldWorkOrder {
    return structuredClone(this.getOwnedWorkOrder(tenantId, workOrderId));
  }

  /**
   * ALWAYS throws BLOCKED_EXTERNAL. Consent flag is hardcoded false and never flips.
   */
  captureSignature(_tenantId: TenantId, _workOrderId: string): never {
    void _tenantId;
    void _workOrderId;
    void SIGNATURE_CONSENT_GRANTED;
    throw new ProjectsFsError(
      "BLOCKED_EXTERNAL",
      "signature capture blocked: consent_required (signatureConsentGranted=false)",
    );
  }

  addClientDeliverable(input: {
    tenantId: TenantId;
    projectId: string;
    title: string;
    portalRole: string;
  }): ClientDeliverable {
    this.getOwnedProject(input.tenantId, input.projectId);
    const d: ClientDeliverable = {
      id: randomUUID(),
      tenantId: input.tenantId,
      projectId: input.projectId,
      title: input.title.trim(),
      portalRole: input.portalRole,
      createdAt: new Date().toISOString(),
    };
    this.stateFor(input.tenantId).deliverables.set(d.id, d);
    this.audit(input.tenantId, "deliverable_added", d.id);
    return structuredClone(d);
  }

  /** Portal stub: list deliverables for a project filtered by portalRole (tenant-scoped). */
  listClientDeliverablesForPortal(input: {
    tenantId: TenantId;
    projectId: string;
    portalRole: string;
  }): ClientDeliverable[] {
    this.getOwnedProject(input.tenantId, input.projectId);
    return [...this.stateFor(input.tenantId).deliverables.values()]
      .filter((d) => d.projectId === input.projectId && d.portalRole === input.portalRole)
      .map((d) => structuredClone(d));
  }

  setSlaTarget(input: {
    tenantId: TenantId;
    projectId: string;
    targetHours: number;
    startedAt?: string;
  }): SlaTarget {
    this.getOwnedProject(input.tenantId, input.projectId);
    if (input.targetHours <= 0) throw new ProjectsFsError("INVALID_STATE", "targetHours must be > 0");
    const sla: SlaTarget = {
      tenantId: input.tenantId,
      projectId: input.projectId,
      targetHours: input.targetHours,
      startedAt: input.startedAt ?? new Date().toISOString(),
    };
    this.stateFor(input.tenantId).slas.set(input.projectId, sla);
    this.audit(input.tenantId, "sla_set", `${input.projectId}:${input.targetHours}`);
    return { ...sla };
  }

  /** Breach detection helper — compares elapsed hours since startedAt to targetHours. */
  checkSlaBreach(tenantId: TenantId, projectId: string, now: Date = new Date()): SlaBreachCheck {
    const sla = this.stateFor(tenantId).slas.get(projectId);
    if (!sla || sla.tenantId !== tenantId) {
      throw new ProjectsFsError("NOT_FOUND", `sla not found for project: ${projectId}`);
    }
    const started = Date.parse(sla.startedAt);
    const elapsedHours = Math.max(0, (now.getTime() - started) / 3_600_000);
    const remainingHours = sla.targetHours - elapsedHours;
    return {
      breached: elapsedHours > sla.targetHours,
      elapsedHours,
      targetHours: sla.targetHours,
      remainingHours,
    };
  }

  listAuditLog(tenantId: TenantId): ProjectsFsAuditEntry[] {
    return [...this.stateFor(tenantId).auditLog];
  }
}

let sharedInstance: ProjectsFieldServiceCore | undefined;

export function getProjectsFieldServiceCore(): ProjectsFieldServiceCore {
  if (!sharedInstance) sharedInstance = new ProjectsFieldServiceCore();
  return sharedInstance;
}

export function resetProjectsFieldServiceCoreForTests(): void {
  sharedInstance = new ProjectsFieldServiceCore();
}

export function assertProjectsFsCoreIntegrity(): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  const core = new ProjectsFieldServiceCore();

  if (SIGNATURE_CONSENT_GRANTED !== false) {
    violations.push("signature_consent_must_stay_false");
  }

  try {
    core.captureSignature("integrity-tenant", "wo-none");
    violations.push("capture_signature_must_throw");
  } catch (err) {
    if (!(err instanceof ProjectsFsError) || err.code !== "BLOCKED_EXTERNAL") {
      violations.push("capture_signature_must_throw_BLOCKED_EXTERNAL");
    }
  }

  const margin = core.computeOperationalMargin({
    revenueEstimateCents: 10_000,
    hoursWorked: 10,
    rateInternalCentsPerHour: 100,
  });
  if (margin.accounting !== false) violations.push("operational_margin_must_declare_accounting_false");
  if (margin.method !== "computeOperationalMargin") violations.push("operational_margin_method_mismatch");
  if (margin.operationalMarginCents !== 9000) violations.push("operational_margin_formula_incorrect");

  const tenantA = "integrity-a";
  const tenantB = "integrity-b";
  const pA = core.createProject({ tenantId: tenantA, name: "A" });
  core.createProject({ tenantId: tenantB, name: "B" });
  try {
    core.getProject(tenantB, pA.id);
    violations.push("tenant_isolation_must_deny_cross_tenant_get");
  } catch (err) {
    if (!(err instanceof ProjectsFsError) || (err.code !== "NOT_FOUND" && err.code !== "TENANT_MISMATCH")) {
      violations.push("tenant_isolation_wrong_error");
    }
  }

  if (KANBAN_COLUMNS.length < 4) violations.push("kanban_columns_incomplete");

  return { ok: violations.length === 0, violations };
}
