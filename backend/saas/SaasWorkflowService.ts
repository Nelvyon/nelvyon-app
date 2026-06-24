import { SendEmailCommand } from "@aws-sdk/client-ses";

import { DbClient } from "../db/DbClient";
import { getSesClient } from "../email/sesClient";
import { getSaasSmsService } from "./SaasSmsService";
import { getSaasWhatsAppService } from "./SaasWhatsAppService";
import { getSaasWhatsAppCloudService, isMetaWaConfigured } from "./SaasWhatsAppCloudService";
import { SaasCrmService, type PipelineStage, type ContactStatus, type SaasContact, type ActivityType } from "./SaasCrmService";
import type { SaasPostgresPort } from "./SaasOnboardingService";
import { assertSaasPlanCanCreate } from "./saasPlanQuota";
import type { SaasDealsService } from "./SaasDealsService";
import type { DealStage } from "./saasDealsDedupe";

const FROM_EMAIL = process.env.SES_FROM_EMAIL ?? "no-reply@nelvyon.com";

async function dispatchEmail(to: string, subject: string, body: string): Promise<void> {
  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#0f172a;">${body}</div>`;
  try {
    const client = getSesClient();
    await client.send(
      new SendEmailCommand({
        Source: `NELVYON <${FROM_EMAIL}>`,
        Destination: { ToAddresses: [to] },
        Message: {
          Subject: { Data: subject, Charset: "UTF-8" },
          Body: { Html: { Data: html, Charset: "UTF-8" } },
        },
      }),
    );
  } catch (e) {
    console.error("[WorkflowEmail] SES error", e instanceof Error ? e.message : e);
    throw e;
  }
}

export type WorkflowStatus = "draft" | "active" | "paused" | "archived";
export type TriggerType =
  | "contact_created"
  | "contact_updated"
  | "stage_changed"
  | "deal_stage_changed"
  | "job_completed"
  | "manual"
  | "scheduled"
  | "form_submitted"
  | "tag_added"
  | "email_opened"
  | "email_clicked"
  | "webhook_in"
  | "date_reached"
  | "sequence_enrolled";

export type WorkflowConditionField =
  | "contact.status"
  | "contact.pipeline_stage"
  | "contact.value"
  | "deal.stage"
  | "deal.value"
  | "deal.contact_id"
  | "deal.probability";

export type WorkflowCondition = {
  field: WorkflowConditionField;
  operator: "equals" | "greater_than";
  value: string | number;
};

export type WorkflowAction =
  | { type: "send_email"; config: { to: string; subject: string; body: string } }
  | { type: "update_contact"; config: { contactId: string; fields: Partial<Pick<SaasContact, "name" | "status" | "pipelineStage" | "value" | "notes">> } }
  | { type: "change_stage"; config: { contactId: string; stage: PipelineStage } }
  | { type: "change_deal_stage"; config: { dealId?: string; stage: DealStage } }
  | { type: "add_deal_note"; config: { dealId?: string; note: string } }
  | { type: "create_activity"; config: { contactId: string; type: ActivityType; description: string } }
  | { type: "create_deal_activity"; config: { contactId?: string; dealId?: string; type: ActivityType; description: string } }
  | { type: "notify"; config: { message: string } }
  | { type: "delay_minutes"; config: { minutes: number } }
  | { type: "webhook_out"; config: { url: string; method?: "GET" | "POST" | "PUT"; body?: Record<string, unknown> } }
  | { type: "add_tag"; config: { contactId?: string; tag: string } }
  | { type: "send_sms"; config: { to: string; body: string } }
  | { type: "send_whatsapp"; config: { to: string; body: string } }
  | { type: "log_call_activity"; config: { to: string; message?: string; contactId?: string } };

export interface SaasWorkflow {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  status: WorkflowStatus;
  triggerType: TriggerType;
  triggerConfig: Record<string, unknown>;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  runCount: number;
  lastRunAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  tenantId: string;
  triggerData: Record<string, unknown>;
  status: "running" | "completed" | "failed";
  stepsExecuted: Array<Record<string, unknown>>;
  error: string | null;
  startedAt: string;
  completedAt: string | null;
}

export class SaasWorkflowError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_FOUND" | "VALIDATION" | "CONSTRAINT" | "FORBIDDEN",
  ) {
    super(message);
    this.name = "SaasWorkflowError";
  }
}

type WorkflowRow = {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  status: WorkflowStatus;
  trigger_type: TriggerType;
  trigger_config: Record<string, unknown> | null;
  conditions: WorkflowCondition[] | null;
  actions: WorkflowAction[] | null;
  run_count: number | string;
  last_run_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type RunRow = {
  id: string;
  workflow_id: string;
  tenant_id: string;
  trigger_data: Record<string, unknown> | null;
  status: "running" | "completed" | "failed";
  steps_executed: Array<Record<string, unknown>> | null;
  error: string | null;
  started_at: Date | string;
  completed_at: Date | string | null;
};

const STATUSES: readonly WorkflowStatus[] = ["draft", "active", "paused", "archived"] as const;
const TRIGGERS: readonly TriggerType[] = [
  "contact_created",
  "contact_updated",
  "stage_changed",
  "deal_stage_changed",
  "job_completed",
  "manual",
  "form_submitted",
  "tag_added",
  "scheduled",
  "email_opened",
  "email_clicked",
  "webhook_in",
  "date_reached",
  "sequence_enrolled",
] as const;
const STAGES: readonly PipelineStage[] = ["new", "contacted", "qualified", "proposal", "won", "lost"] as const;
const CONTACT_STATUSES: readonly ContactStatus[] = ["lead", "prospect", "client", "churned"] as const;

function toIso(v: Date | string): string {
  return typeof v === "string" ? v : v.toISOString();
}

function toNumber(v: string | number | null | undefined): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function isCheckViolation(e: unknown): boolean {
  return typeof e === "object" && e !== null && "code" in e && (e as { code: unknown }).code === "23514";
}

function assertWorkflowStatus(v: string): WorkflowStatus {
  if ((STATUSES as readonly string[]).includes(v)) return v as WorkflowStatus;
  throw new SaasWorkflowError("Invalid workflow status", "VALIDATION");
}

function assertTrigger(v: string): TriggerType {
  if ((TRIGGERS as readonly string[]).includes(v)) return v as TriggerType;
  throw new SaasWorkflowError("Invalid trigger_type", "VALIDATION");
}

function assertStage(v: string): PipelineStage {
  if ((STAGES as readonly string[]).includes(v)) return v as PipelineStage;
  throw new SaasWorkflowError("Invalid pipeline stage", "VALIDATION");
}

function assertContactStatus(v: string): ContactStatus {
  if ((CONTACT_STATUSES as readonly string[]).includes(v)) return v as ContactStatus;
  throw new SaasWorkflowError("Invalid contact status", "VALIDATION");
}

function rowToWorkflow(r: WorkflowRow): SaasWorkflow {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    name: r.name,
    description: r.description,
    status: r.status,
    triggerType: r.trigger_type,
    triggerConfig: r.trigger_config ?? {},
    conditions: r.conditions ?? [],
    actions: r.actions ?? [],
    runCount: toNumber(r.run_count),
    lastRunAt: r.last_run_at ? toIso(r.last_run_at) : null,
    createdAt: toIso(r.created_at),
    updatedAt: toIso(r.updated_at),
  };
}

function rowToRun(r: RunRow): WorkflowRun {
  return {
    id: r.id,
    workflowId: r.workflow_id,
    tenantId: r.tenant_id,
    triggerData: r.trigger_data ?? {},
    status: r.status,
    stepsExecuted: r.steps_executed ?? [],
    error: r.error,
    startedAt: toIso(r.started_at),
    completedAt: r.completed_at ? toIso(r.completed_at) : null,
  };
}

export type WorkflowInput = {
  name: string;
  description?: string | null;
  status?: WorkflowStatus;
  triggerType: TriggerType;
  triggerConfig?: Record<string, unknown>;
  conditions?: WorkflowCondition[];
  actions?: WorkflowAction[];
};

export type WorkflowPatch = Partial<WorkflowInput>;

export class SaasWorkflowService {
  constructor(
    private readonly db: SaasPostgresPort,
    private readonly crm: Pick<SaasCrmService, "updateContact" | "addActivity" | "getContact">,
    private readonly deals?: Pick<SaasDealsService, "changeStage" | "updateDeal" | "getDeal">,
  ) {}

  async createWorkflow(tenantId: string, data: WorkflowInput): Promise<SaasWorkflow> {
    await assertSaasPlanCanCreate(this.db, tenantId, "workflows");
    const name = data.name.trim();
    if (name.length === 0) throw new SaasWorkflowError("name is required", "VALIDATION");
    const status = data.status ?? "draft";
    assertWorkflowStatus(status);
    const triggerType = assertTrigger(data.triggerType);
    try {
      const rows = await this.db.query<WorkflowRow>(
        `INSERT INTO saas_workflows
         (tenant_id, name, description, status, trigger_type, trigger_config, conditions, actions, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
         RETURNING id, tenant_id, name, description, status, trigger_type, trigger_config, conditions, actions, run_count, last_run_at, created_at, updated_at`,
        [tenantId, name, data.description ?? null, status, triggerType, data.triggerConfig ?? {}, data.conditions ?? [], data.actions ?? []],
      );
      const row = rows[0];
      if (!row) throw new SaasWorkflowError("Failed to create workflow", "CONSTRAINT");
      return rowToWorkflow(row);
    } catch (e: unknown) {
      if (isCheckViolation(e)) throw new SaasWorkflowError("Invalid status or trigger_type", "CONSTRAINT");
      throw e;
    }
  }

  async getWorkflows(tenantId: string): Promise<SaasWorkflow[]> {
    const rows = await this.db.query<WorkflowRow>(
      `SELECT id, tenant_id, name, description, status, trigger_type, trigger_config, conditions, actions, run_count, last_run_at, created_at, updated_at
       FROM saas_workflows WHERE tenant_id = $1 ORDER BY created_at DESC`,
      [tenantId],
    );
    return rows.map(rowToWorkflow);
  }

  async getWorkflow(tenantId: string, workflowId: string): Promise<SaasWorkflow | null> {
    const rows = await this.db.query<WorkflowRow>(
      `SELECT id, tenant_id, name, description, status, trigger_type, trigger_config, conditions, actions, run_count, last_run_at, created_at, updated_at
       FROM saas_workflows WHERE tenant_id = $1 AND id = $2 LIMIT 1`,
      [tenantId, workflowId],
    );
    return rows[0] ? rowToWorkflow(rows[0]) : null;
  }

  async updateWorkflow(tenantId: string, workflowId: string, data: WorkflowPatch): Promise<SaasWorkflow> {
    const existing = await this.getWorkflow(tenantId, workflowId);
    if (!existing) throw new SaasWorkflowError("Workflow not found", "NOT_FOUND");
    const name = data.name !== undefined ? data.name.trim() : undefined;
    if (name !== undefined && name.length === 0) throw new SaasWorkflowError("name cannot be empty", "VALIDATION");
    const status = data.status !== undefined ? assertWorkflowStatus(data.status) : undefined;
    const triggerType = data.triggerType !== undefined ? assertTrigger(data.triggerType) : undefined;
    try {
      const rows = await this.db.query<WorkflowRow>(
        `UPDATE saas_workflows SET
          name = COALESCE($3, name),
          description = COALESCE($4, description),
          status = COALESCE($5, status),
          trigger_type = COALESCE($6, trigger_type),
          trigger_config = COALESCE($7, trigger_config),
          conditions = COALESCE($8, conditions),
          actions = COALESCE($9, actions),
          updated_at = NOW()
         WHERE tenant_id = $1 AND id = $2
         RETURNING id, tenant_id, name, description, status, trigger_type, trigger_config, conditions, actions, run_count, last_run_at, created_at, updated_at`,
        [tenantId, workflowId, name ?? null, data.description ?? null, status ?? null, triggerType ?? null, data.triggerConfig ?? null, data.conditions ?? null, data.actions ?? null],
      );
      const row = rows[0];
      if (!row) throw new SaasWorkflowError("Workflow not found", "NOT_FOUND");
      return rowToWorkflow(row);
    } catch (e: unknown) {
      if (isCheckViolation(e)) throw new SaasWorkflowError("Invalid status or trigger_type", "CONSTRAINT");
      throw e;
    }
  }

  async deleteWorkflow(tenantId: string, workflowId: string): Promise<void> {
    await this.db.query(`DELETE FROM saas_workflows WHERE tenant_id = $1 AND id = $2`, [tenantId, workflowId]);
  }

  async activateWorkflow(tenantId: string, workflowId: string): Promise<SaasWorkflow> {
    return this.updateWorkflow(tenantId, workflowId, { status: "active" });
  }

  async pauseWorkflow(tenantId: string, workflowId: string): Promise<SaasWorkflow> {
    return this.updateWorkflow(tenantId, workflowId, { status: "paused" });
  }

  private evalConditions(conditions: WorkflowCondition[], triggerData: Record<string, unknown>): boolean {
    for (const c of conditions) {
      const contact = (triggerData.contact ?? {}) as Record<string, unknown>;
      const deal = (triggerData.deal ?? {}) as Record<string, unknown>;
      if (c.field === "contact.status") {
        const actual = typeof contact.status === "string" ? contact.status : "";
        const expected = String(c.value);
        assertContactStatus(expected);
        if (c.operator !== "equals" || actual !== expected) return false;
      } else if (c.field === "contact.pipeline_stage") {
        const actual = typeof contact.pipeline_stage === "string" ? contact.pipeline_stage : "";
        const expected = String(c.value);
        assertStage(expected);
        if (c.operator !== "equals" || actual !== expected) return false;
      } else if (c.field === "contact.value") {
        const actual = typeof contact.value === "number" ? contact.value : Number(contact.value ?? 0);
        const expected = Number(c.value);
        if (c.operator !== "greater_than" || !(actual > expected)) return false;
      } else if (c.field === "deal.stage") {
        const actual = typeof deal.stage === "string" ? deal.stage : "";
        const expected = String(c.value);
        assertStage(expected);
        if (c.operator !== "equals" || actual !== expected) return false;
      } else if (c.field === "deal.contact_id") {
        const actual = deal.contactId === null || deal.contactId === undefined ? "" : String(deal.contactId);
        const expected = String(c.value);
        if (c.operator !== "equals" || actual !== expected) return false;
      } else if (c.field === "deal.value") {
        const actual = typeof deal.value === "number" ? deal.value : Number(deal.value ?? 0);
        const expected = Number(c.value);
        if (c.operator !== "greater_than" || !(actual > expected)) return false;
      } else if (c.field === "deal.probability") {
        const actual = typeof deal.probability === "number" ? deal.probability : Number(deal.probability ?? 0);
        const expected = Number(c.value);
        if (c.operator !== "greater_than" || !(actual > expected)) return false;
      }
    }
    return true;
  }

  /** Optional trigger_config filters. Each trigger type can define its own config filters. */
  matchesTriggerConfig(triggerType: TriggerType, triggerConfig: Record<string, unknown>, triggerData: Record<string, unknown>): boolean {
    if (triggerType === "deal_stage_changed") {
      const deal = (triggerData.deal ?? {}) as Record<string, unknown>;
      if (triggerConfig.stage_to && String(triggerConfig.stage_to) !== String(deal.stage ?? "")) return false;
      if (triggerConfig.stage_from && String(triggerConfig.stage_from) !== String(deal.previousStage ?? "")) return false;
      if (triggerConfig.contact_id && String(triggerConfig.contact_id) !== String(deal.contactId ?? "")) return false;
    }
    if (triggerType === "email_opened" || triggerType === "email_clicked") {
      // Optional: only fire for a specific campania_id
      if (triggerConfig.campania_id) {
        const email = (triggerData.email ?? {}) as Record<string, unknown>;
        if (String(triggerConfig.campania_id) !== String(email.campaniaId ?? "")) return false;
      }
    }
    if (triggerType === "webhook_in") {
      // Optional: only fire for a specific source name
      if (triggerConfig.source) {
        if (String(triggerConfig.source) !== String(triggerData.source ?? "")) return false;
      }
    }
    if (triggerType === "date_reached") {
      // Fire when today's date matches triggerConfig.date (YYYY-MM-DD)
      if (triggerConfig.date) {
        const today = new Date().toISOString().slice(0, 10);
        if (String(triggerConfig.date) !== today) return false;
      }
    }
    if (triggerType === "tag_added") {
      // Optional: only fire for a specific tag value
      if (triggerConfig.tag && String(triggerConfig.tag) !== String(triggerData.tag ?? "")) return false;
    }
    if (triggerType === "form_submitted") {
      // Optional: only fire for a specific form_id
      if (triggerConfig.form_id) {
        const form = (triggerData.form ?? {}) as Record<string, unknown>;
        if (String(triggerConfig.form_id) !== String(form.id ?? "")) return false;
      }
    }
    return true;
  }

  async dispatchActiveWorkflows(tenantId: string, triggerType: TriggerType, triggerData: Record<string, unknown>): Promise<void> {
    const workflows = await this.getWorkflows(tenantId);
    for (const wf of workflows) {
      if (wf.status !== "active" || wf.triggerType !== triggerType) continue;
      if (!this.matchesTriggerConfig(wf.triggerType, wf.triggerConfig, triggerData)) continue;

      // Idempotency for scheduled workflows: skip if already ran in the last 4 minutes
      // (cron runs every 5 min — prevents double execution on retries or overlapping calls)
      if (triggerType === "scheduled" && wf.lastRunAt) {
        const msSinceLast = Date.now() - new Date(wf.lastRunAt).getTime();
        if (msSinceLast < 4 * 60 * 1000) continue;
      }

      await this.executeWorkflow(wf.id, tenantId, triggerData);
    }
  }

  private resolveDealId(triggerData: Record<string, unknown>, configDealId?: string): string | null {
    if (configDealId) return configDealId;
    const deal = (triggerData.deal ?? {}) as Record<string, unknown>;
    return typeof deal.id === "string" ? deal.id : null;
  }

  private resolveContactIdForDealAction(triggerData: Record<string, unknown>, configContactId?: string): string | null {
    if (configContactId) return configContactId;
    const deal = (triggerData.deal ?? {}) as Record<string, unknown>;
    if (typeof deal.contactId === "string" && deal.contactId.length > 0) return deal.contactId;
    const contact = (triggerData.contact ?? {}) as Record<string, unknown>;
    return typeof contact.id === "string" ? contact.id : null;
  }

  async executeWorkflow(workflowId: string, tenantId: string, triggerData: Record<string, unknown> = {}): Promise<WorkflowRun> {
    const wf = await this.getWorkflow(tenantId, workflowId);
    if (!wf) throw new SaasWorkflowError("Workflow not found", "NOT_FOUND");

    const runRows = await this.db.query<RunRow>(
      `INSERT INTO saas_workflow_runs (workflow_id, tenant_id, trigger_data, status, steps_executed, started_at)
       VALUES ($1,$2,$3,'running','[]'::jsonb,NOW())
       RETURNING id, workflow_id, tenant_id, trigger_data, status, steps_executed, error, started_at, completed_at`,
      [workflowId, tenantId, triggerData],
    );
    const run = runRows[0];
    if (!run) throw new SaasWorkflowError("Failed to create run", "CONSTRAINT");

    const stepsExecuted: Array<Record<string, unknown>> = [];
    try {
      if (!this.evalConditions(wf.conditions, triggerData)) {
        await this.db.query(
          `UPDATE saas_workflow_runs SET status='completed', steps_executed=$2, completed_at=NOW() WHERE id=$1`,
          [run.id, stepsExecuted],
        );
        const rows = await this.getWorkflowRuns(workflowId, tenantId);
        return rows[0] as WorkflowRun;
      }

      for (const action of wf.actions) {
        if (action.type === "send_email") {
          const cfg = action.config;
          // Resolve {{contact.email}} / {{contact.name}} placeholders from triggerData
          let contact = (triggerData.contact ?? {}) as Record<string, unknown>;
          // If contact only has id (e.g. deal_stage_changed), fetch full record from DB
          if (typeof contact.id === "string" && (!contact.email || !contact.name)) {
            type ContactRow = { id: string; email: string | null; name: string };
            const rows = await this.db.query<ContactRow>(
              `SELECT id, email, name FROM saas_contacts WHERE tenant_id = $1 AND id = $2 LIMIT 1`,
              [tenantId, contact.id],
            );
            if (rows[0]) contact = { ...contact, email: rows[0].email, name: rows[0].name };
          }
          const toResolved = cfg.to === "{{contact.email}}"
            ? (typeof contact.email === "string" ? contact.email : cfg.to)
            : cfg.to;
          const bodyResolved = cfg.body.replace(/\{\{contact\.name\}\}/g, String(contact.name ?? ""));
          await dispatchEmail(toResolved, cfg.subject, bodyResolved);
          await this.db.query(
            `INSERT INTO saas_activity_log (tenant_id, event_type, description, metadata)
             VALUES ($1,$2,$3,$4)`,
            [tenantId, "workflow_email", `Email sent to ${toResolved}: ${cfg.subject}`, { ...cfg, to: toResolved }],
          );
          stepsExecuted.push({ action: action.type, ok: true, to: toResolved });
        } else if (action.type === "update_contact") {
          await this.crm.updateContact(tenantId, action.config.contactId, {
            name: (action.config.fields.name as string | undefined) ?? undefined,
            status: (action.config.fields.status as ContactStatus | undefined) ?? undefined,
            pipeline_stage: (action.config.fields.pipelineStage as PipelineStage | undefined) ?? undefined,
            value: (action.config.fields.value as number | undefined) ?? undefined,
            notes: (action.config.fields.notes as string | undefined) ?? undefined,
          });
          stepsExecuted.push({ action: action.type, ok: true });
        } else if (action.type === "change_stage") {
          await this.crm.updateContact(tenantId, action.config.contactId, { pipeline_stage: action.config.stage });
          stepsExecuted.push({ action: action.type, ok: true });
        } else if (action.type === "create_activity") {
          await this.crm.addActivity(action.config.contactId, tenantId, {
            activityType: action.config.type,
            description: action.config.description,
          });
          stepsExecuted.push({ action: action.type, ok: true });
        } else if (action.type === "change_deal_stage") {
          if (!this.deals) throw new SaasWorkflowError("Deals service unavailable", "FORBIDDEN");
          const dealId = this.resolveDealId(triggerData, action.config.dealId);
          if (!dealId) throw new SaasWorkflowError("dealId required for change_deal_stage", "VALIDATION");
          await this.deals.updateDeal(tenantId, dealId, { stage: action.config.stage });
          stepsExecuted.push({ action: action.type, ok: true, dealId });
        } else if (action.type === "add_deal_note") {
          if (!this.deals) throw new SaasWorkflowError("Deals service unavailable", "FORBIDDEN");
          const dealId = this.resolveDealId(triggerData, action.config.dealId);
          if (!dealId) throw new SaasWorkflowError("dealId required for add_deal_note", "VALIDATION");
          const existing = await this.deals.getDeal(tenantId, dealId);
          if (!existing) throw new SaasWorkflowError("Deal not found", "NOT_FOUND");
          const merged = [existing.notes?.trim(), action.config.note.trim()].filter(Boolean).join("\n");
          await this.deals.updateDeal(tenantId, dealId, { notes: merged });
          stepsExecuted.push({ action: action.type, ok: true, dealId });
        } else if (action.type === "create_deal_activity") {
          const contactId = this.resolveContactIdForDealAction(triggerData, action.config.contactId);
          if (!contactId) throw new SaasWorkflowError("contactId required for create_deal_activity", "VALIDATION");
          const dealId = this.resolveDealId(triggerData, action.config.dealId);
          const prefix = dealId ? `[Deal ${dealId}] ` : "";
          await this.crm.addActivity(contactId, tenantId, {
            activityType: action.config.type,
            description: `${prefix}${action.config.description}`,
          });
          stepsExecuted.push({ action: action.type, ok: true, contactId, dealId });
        } else if (action.type === "notify") {
          await this.db.query(
            `INSERT INTO saas_activity_log (tenant_id, event_type, description, metadata)
             VALUES ($1,$2,$3,$4)`,
            [tenantId, "workflow_notify", action.config.message, action.config],
          );
          stepsExecuted.push({ action: action.type, ok: true });
        } else if (action.type === "delay_minutes") {
          const ms = Math.min(action.config.minutes * 60 * 1000, 10 * 60 * 1000); // cap at 10min
          await new Promise((r) => setTimeout(r, ms));
          stepsExecuted.push({ action: action.type, ok: true, minutes: action.config.minutes });
        } else if (action.type === "webhook_out") {
          const method = action.config.method ?? "POST";
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10_000);
          try {
            const res = await fetch(action.config.url, {
              method,
              headers: { "Content-Type": "application/json" },
              body: method !== "GET" ? JSON.stringify({ ...action.config.body, triggerData }) : undefined,
              signal: controller.signal,
            });
            stepsExecuted.push({ action: action.type, ok: res.ok, status: res.status, url: action.config.url });
          } catch (err) {
            stepsExecuted.push({ action: action.type, ok: false, error: err instanceof Error ? err.message : String(err) });
          } finally {
            clearTimeout(timeout);
          }
        } else if (action.type === "add_tag") {
          const contactId = action.config.contactId ?? this.resolveContactIdForDealAction(triggerData);
          if (contactId) {
            await this.db.query(
              `UPDATE saas_contacts
               SET tags = array(SELECT DISTINCT unnest(tags || $3::text[])), updated_at = NOW()
               WHERE tenant_id = $1 AND id = $2`,
              [tenantId, contactId, [action.config.tag]],
            );
            stepsExecuted.push({ action: action.type, ok: true, contactId, tag: action.config.tag });
          } else {
            stepsExecuted.push({ action: action.type, ok: false, error: "contactId not resolvable" });
          }
        } else if (action.type === "send_sms") {
          const toResolved = action.config.to === "{{contact.phone}}"
            ? (() => {
                const contact = (triggerData.contact ?? {}) as Record<string, unknown>;
                return typeof contact.phone === "string" ? contact.phone : action.config.to;
              })()
            : action.config.to;
          try {
            const result = await getSaasSmsService().send(tenantId, toResolved, action.config.body);
            stepsExecuted.push({ action: action.type, ok: result.ok, to: toResolved, sid: result.messageSid });
          } catch (e) {
            stepsExecuted.push({ action: action.type, ok: false, error: e instanceof Error ? e.message : String(e) });
          }
        } else if (action.type === "send_whatsapp") {
          const toResolved = action.config.to === "{{contact.phone}}"
            ? (() => {
                const contact = (triggerData.contact ?? {}) as Record<string, unknown>;
                return typeof contact.phone === "string" ? contact.phone : action.config.to;
              })()
            : action.config.to;
          try {
            if (isMetaWaConfigured()) {
              const result = await getSaasWhatsAppCloudService().send(tenantId, { to: toResolved, body: action.config.body });
              stepsExecuted.push({ action: action.type, ok: result.status === "sent", to: toResolved, sid: result.metaWamid, provider: "meta" });
            } else {
              const result = await getSaasWhatsAppService().send(tenantId, { to: toResolved, body: action.config.body });
              stepsExecuted.push({ action: action.type, ok: result.status === "sent", to: toResolved, sid: result.twilioSid, provider: "twilio" });
            }
          } catch (e) {
            stepsExecuted.push({ action: action.type, ok: false, error: e instanceof Error ? e.message : String(e) });
          }
        } else if (action.type === "log_call_activity") {
          const toResolved = action.config.to === "{{contact.phone}}"
            ? (() => {
                const contact = (triggerData.contact ?? {}) as Record<string, unknown>;
                return typeof contact.phone === "string" ? contact.phone : action.config.to;
              })()
            : action.config.to;
          try {
            const { getSaasDialerService } = await import("./SaasDialerService");
            const call = await getSaasDialerService().initiateCall(tenantId, {
              to: toResolved,
              message: action.config.message,
              contactId: action.config.contactId ?? null,
            });
            stepsExecuted.push({ action: action.type, ok: call.status === "initiated", to: toResolved, sid: call.callSid });
          } catch (e) {
            stepsExecuted.push({ action: action.type, ok: false, error: e instanceof Error ? e.message : String(e) });
          }
        }
      }

      await this.db.query(
        `UPDATE saas_workflow_runs
         SET status='completed', steps_executed=$2, completed_at=NOW()
         WHERE id=$1`,
        [run.id, stepsExecuted],
      );
      await this.db.query(
        `UPDATE saas_workflows
         SET run_count = run_count + 1, last_run_at = NOW(), updated_at = NOW()
         WHERE id=$1 AND tenant_id=$2`,
        [workflowId, tenantId],
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      await this.db.query(
        `UPDATE saas_workflow_runs
         SET status='failed', steps_executed=$2, error=$3, completed_at=NOW()
         WHERE id=$1`,
        [run.id, stepsExecuted, msg],
      );
    }
    const rows = await this.getWorkflowRuns(workflowId, tenantId);
    return rows[0] as WorkflowRun;
  }

  async getWorkflowRuns(workflowId: string, tenantId: string): Promise<WorkflowRun[]> {
    const rows = await this.db.query<RunRow>(
      `SELECT id, workflow_id, tenant_id, trigger_data, status, steps_executed, error, started_at, completed_at
       FROM saas_workflow_runs
       WHERE workflow_id = $1 AND tenant_id = $2
       ORDER BY started_at DESC`,
      [workflowId, tenantId],
    );
    return rows.map(rowToRun);
  }
}

let cached: SaasWorkflowService | undefined;

export function getSaasWorkflowService(): SaasWorkflowService {
  if (!cached) {
    const db = DbClient.getInstance();
    const crm = new SaasCrmService(db);
    const { SaasDealsService } = require("./SaasDealsService") as typeof import("./SaasDealsService");
    const deals = new SaasDealsService(db);
    cached = new SaasWorkflowService(db, crm, deals);
  }
  return cached;
}

export function resetSaasWorkflowServiceForTests(): void {
  cached = undefined;
}
