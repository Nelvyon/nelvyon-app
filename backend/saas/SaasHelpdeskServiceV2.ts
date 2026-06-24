/**
 * SaasHelpdeskService v2 — tickets SLA + macros.
 * Extends migration 428 with SLA cols from migration 439.
 */
import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";

export type TicketStatus   = "open" | "in_progress" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type SlaPolicy      = "standard" | "priority" | "urgent";

// SLA durations in minutes per policy
const SLA_FIRST_RESPONSE: Record<SlaPolicy, number> = {
  standard: 240,   // 4h
  priority: 60,    // 1h
  urgent:   30,    // 30min
};
const SLA_RESOLUTION: Record<SlaPolicy, number> = {
  standard: 1440,  // 24h
  priority: 480,   // 8h
  urgent:   240,   // 4h
};

export interface HelpdeskTicket {
  id: string; tenantId: string; subject: string; description: string | null;
  status: TicketStatus; priority: TicketPriority; slaPolicy: SlaPolicy;
  contactName: string; contactEmail: string;
  assignedTo: string | null; resolvedAt: string | null;
  firstResponseDue: string | null; resolutionDue: string | null; firstRespondedAt: string | null;
  slaBreached: boolean;
  messageCount: number; createdAt: string; updatedAt: string;
}

export interface HelpdeskMessage {
  id: string; ticketId: string; tenantId: string;
  author: string; body: string; isInternal: boolean; createdAt: string;
}

export interface HelpdeskMacro {
  id: string; tenantId: string; name: string;
  actions: MacroAction[]; active: boolean; createdAt: string; updatedAt: string;
}

export type MacroAction =
  | { type: "set_status";   status: TicketStatus }
  | { type: "set_priority"; priority: TicketPriority }
  | { type: "assign";       assignedTo: string }
  | { type: "add_note";     note: string };

export interface CreateTicketInput {
  subject: string; description?: string | null;
  contactName?: string; contactEmail: string;
  priority?: TicketPriority; assignedTo?: string | null;
  slaPolicy?: SlaPolicy;
}

export type UpdateTicketInput = Partial<Pick<HelpdeskTicket, "status" | "priority" | "assignedTo" | "slaPolicy">>;

export class SaasHelpdeskError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message); this.name = "SaasHelpdeskError";
  }
}

const STATUSES: TicketStatus[]   = ["open", "in_progress", "resolved", "closed"];
const PRIORITIES: TicketPriority[] = ["low", "medium", "high", "urgent"];
const SLA_POLICIES: SlaPolicy[]  = ["standard", "priority", "urgent"];

// ── Mappers ──────────────────────────────────────────────────────────────────

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000);
}

function rowToTicket(r: Record<string, unknown>): HelpdeskTicket {
  const firstResponseDue = r.first_response_due ? new Date(r.first_response_due as string).toISOString() : null;
  const resolutionDue    = r.resolution_due     ? new Date(r.resolution_due as string).toISOString()     : null;
  const now = new Date();
  const status = String(r.status) as TicketStatus;
  const slaBreached = !!(
    (firstResponseDue && !r.first_responded_at && new Date(firstResponseDue) < now) ||
    (resolutionDue && status !== "resolved" && status !== "closed" && new Date(resolutionDue) < now)
  );
  return {
    id: String(r.id),
    tenantId: String(r.tenant_id ?? r.tenantId),
    subject: String(r.subject),
    description: r.description != null ? String(r.description) : null,
    status,
    priority: String(r.priority) as TicketPriority,
    slaPolicy: (SLA_POLICIES.includes(String(r.sla_policy ?? r.slaPolicy) as SlaPolicy) ? String(r.sla_policy ?? r.slaPolicy) : "standard") as SlaPolicy,
    contactName: String(r.contact_name ?? r.contactName ?? ""),
    contactEmail: String(r.contact_email ?? r.contactEmail ?? ""),
    assignedTo: r.assigned_to != null ? String(r.assigned_to) : null,
    resolvedAt: r.resolved_at != null ? new Date(r.resolved_at as string).toISOString() : null,
    firstResponseDue,
    resolutionDue,
    firstRespondedAt: r.first_responded_at != null ? new Date(r.first_responded_at as string).toISOString() : null,
    slaBreached,
    messageCount: Number(r.message_count ?? 0),
    createdAt: new Date(r.created_at as string).toISOString(),
    updatedAt: new Date(r.updated_at as string).toISOString(),
  };
}

function rowToMacro(r: Record<string, unknown>): HelpdeskMacro {
  let actions: MacroAction[] = [];
  try { actions = JSON.parse(String(r.actions ?? "[]")) as MacroAction[]; } catch { actions = []; }
  return {
    id: String(r.id),
    tenantId: String(r.tenant_id ?? r.tenantId),
    name: String(r.name),
    actions,
    active: Boolean(r.active),
    createdAt: new Date(r.created_at as string).toISOString(),
    updatedAt: new Date(r.updated_at as string).toISOString(),
  };
}

// ── Service ──────────────────────────────────────────────────────────────────

export class SaasHelpdeskServiceV2 {
  constructor(private readonly db: SaasPostgresPort = DbClient.getInstance()) {}

  // ── Tickets ───────────────────────────────────────────────────────────────

  async list(tenantId: string, status?: TicketStatus): Promise<HelpdeskTicket[]> {
    const where = status ? `AND t.status=$2` : "";
    const params: unknown[] = status ? [tenantId, status] : [tenantId];
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT t.*,COUNT(m.id) AS message_count
       FROM saas_helpdesk_tickets t
       LEFT JOIN saas_helpdesk_messages m ON m.ticket_id = t.id
       WHERE t.tenant_id=$1 ${where}
       GROUP BY t.id ORDER BY t.updated_at DESC LIMIT 200`,
      params,
    );
    return rows.map(rowToTicket);
  }

  async get(tenantId: string, id: string): Promise<{ ticket: HelpdeskTicket; messages: HelpdeskMessage[] }> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT t.*,COUNT(m.id) AS message_count
       FROM saas_helpdesk_tickets t
       LEFT JOIN saas_helpdesk_messages m ON m.ticket_id = t.id
       WHERE t.id=$1::uuid AND t.tenant_id=$2
       GROUP BY t.id`,
      [id, tenantId],
    );
    if (!rows[0]) throw new SaasHelpdeskError("Ticket no encontrado", "NOT_FOUND");
    const msgs = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM saas_helpdesk_messages WHERE ticket_id=$1::uuid ORDER BY created_at`,
      [id],
    );
    return {
      ticket: rowToTicket(rows[0]),
      messages: msgs.map(r => ({
        id: String(r.id), ticketId: String(r.ticket_id), tenantId: String(r.tenant_id),
        author: String(r.author), body: String(r.body), isInternal: Boolean(r.is_internal),
        createdAt: new Date(r.created_at as string).toISOString(),
      })),
    };
  }

  async create(tenantId: string, input: CreateTicketInput): Promise<HelpdeskTicket> {
    if (!input.subject?.trim()) throw new SaasHelpdeskError("subject es obligatorio", "VALIDATION");
    if (!input.contactEmail?.trim()) throw new SaasHelpdeskError("contactEmail es obligatorio", "VALIDATION");
    const priority: TicketPriority = PRIORITIES.includes(input.priority as TicketPriority) ? (input.priority as TicketPriority) : "medium";
    const slaPolicy: SlaPolicy = SLA_POLICIES.includes(input.slaPolicy as SlaPolicy) ? (input.slaPolicy as SlaPolicy) : "standard";
    const now = new Date();
    const firstResponseDue = addMinutes(now, SLA_FIRST_RESPONSE[slaPolicy]);
    const resolutionDue    = addMinutes(now, SLA_RESOLUTION[slaPolicy]);
    const rows = await this.db.query<Record<string, unknown>>(
      `INSERT INTO saas_helpdesk_tickets
         (tenant_id,subject,description,contact_name,contact_email,priority,assigned_to,sla_policy,first_response_due,resolution_due)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *,0 AS message_count`,
      [tenantId, input.subject.trim(), input.description ?? null,
       input.contactName?.trim() ?? "", input.contactEmail.trim(),
       priority, input.assignedTo ?? null, slaPolicy, firstResponseDue, resolutionDue],
    );
    if (!rows[0]) throw new SaasHelpdeskError("Error al crear ticket", "DB_ERROR");
    return rowToTicket(rows[0]);
  }

  async update(tenantId: string, id: string, input: UpdateTicketInput): Promise<HelpdeskTicket> {
    const sets: string[] = ["updated_at=NOW()"];
    const params: unknown[] = [tenantId, id];
    let idx = 3;
    if (input.status !== undefined) {
      if (!STATUSES.includes(input.status)) throw new SaasHelpdeskError("Estado inválido", "VALIDATION");
      sets.push(`status=$${idx++}`); params.push(input.status);
      if (input.status === "resolved" || input.status === "closed") sets.push(`resolved_at=NOW()`);
    }
    if (input.priority !== undefined) { sets.push(`priority=$${idx++}`); params.push(input.priority); }
    if (input.assignedTo !== undefined) { sets.push(`assigned_to=$${idx++}`); params.push(input.assignedTo); }
    if (input.slaPolicy !== undefined) { sets.push(`sla_policy=$${idx++}`); params.push(input.slaPolicy); }
    const rows = await this.db.query<Record<string, unknown>>(
      `UPDATE saas_helpdesk_tickets SET ${sets.join(",")}
       WHERE tenant_id=$1 AND id=$2::uuid
       RETURNING *,0 AS message_count`,
      params,
    );
    if (!rows[0]) throw new SaasHelpdeskError("Ticket no encontrado", "NOT_FOUND");
    return rowToTicket(rows[0]);
  }

  async addMessage(tenantId: string, ticketId: string, body: string, author = "agent", isInternal = false): Promise<HelpdeskMessage> {
    if (!body?.trim()) throw new SaasHelpdeskError("body es obligatorio", "VALIDATION");
    const rows = await this.db.query<Record<string, unknown>>(
      `INSERT INTO saas_helpdesk_messages (ticket_id,tenant_id,author,body,is_internal)
       VALUES ($1::uuid,$2,$3,$4,$5)
       RETURNING *`,
      [ticketId, tenantId, author, body.trim(), isInternal],
    );
    if (!rows[0]) throw new SaasHelpdeskError("Error al añadir mensaje", "DB_ERROR");
    // mark first_responded_at if first agent reply
    if (!isInternal) {
      await this.db.query(
        `UPDATE saas_helpdesk_tickets SET updated_at=NOW(),
           first_responded_at=COALESCE(first_responded_at,NOW()),
           status=CASE WHEN status='open' THEN 'in_progress' ELSE status END
         WHERE id=$1::uuid AND tenant_id=$2`,
        [ticketId, tenantId],
      );
    }
    const r = rows[0];
    return {
      id: String(r.id), ticketId: String(r.ticket_id), tenantId: String(r.tenant_id),
      author: String(r.author), body: String(r.body), isInternal: Boolean(r.is_internal),
      createdAt: new Date(r.created_at as string).toISOString(),
    };
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const rows = await this.db.query<{ id: string }>(
      `DELETE FROM saas_helpdesk_tickets WHERE tenant_id=$1 AND id=$2::uuid RETURNING id`,
      [tenantId, id],
    );
    if (!rows[0]) throw new SaasHelpdeskError("Ticket no encontrado", "NOT_FOUND");
  }

  // ── Macros ────────────────────────────────────────────────────────────────

  async listMacros(tenantId: string): Promise<HelpdeskMacro[]> {
    const rows = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM saas_helpdesk_macros WHERE tenant_id=$1 AND active=true ORDER BY name`,
      [tenantId],
    );
    return rows.map(rowToMacro);
  }

  async createMacro(tenantId: string, input: { name: string; actions: MacroAction[] }): Promise<HelpdeskMacro> {
    if (!input.name?.trim()) throw new SaasHelpdeskError("name es obligatorio", "VALIDATION");
    const rows = await this.db.query<Record<string, unknown>>(
      `INSERT INTO saas_helpdesk_macros (tenant_id,name,actions) VALUES ($1,$2,$3::jsonb)
       RETURNING *`,
      [tenantId, input.name.trim(), JSON.stringify(input.actions ?? [])],
    );
    if (!rows[0]) throw new SaasHelpdeskError("Error al crear macro", "DB_ERROR");
    return rowToMacro(rows[0]);
  }

  async deleteMacro(tenantId: string, id: string): Promise<void> {
    const rows = await this.db.query<{ id: string }>(
      `DELETE FROM saas_helpdesk_macros WHERE tenant_id=$1 AND id=$2::uuid RETURNING id`,
      [tenantId, id],
    );
    if (!rows[0]) throw new SaasHelpdeskError("Macro no encontrado", "NOT_FOUND");
  }

  async applyMacro(tenantId: string, ticketId: string, macroId: string): Promise<HelpdeskTicket> {
    const mRows = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM saas_helpdesk_macros WHERE id=$1::uuid AND tenant_id=$2`,
      [macroId, tenantId],
    );
    if (!mRows[0]) throw new SaasHelpdeskError("Macro no encontrado", "NOT_FOUND");
    const macro = rowToMacro(mRows[0]);

    const patch: UpdateTicketInput = {};
    const notes: string[] = [];
    for (const a of macro.actions) {
      if (a.type === "set_status")   { patch.status   = a.status; }
      if (a.type === "set_priority") { patch.priority = a.priority; }
      if (a.type === "assign")       { patch.assignedTo = a.assignedTo; }
      if (a.type === "add_note")     { notes.push(a.note); }
    }
    const ticket = await this.update(tenantId, ticketId, patch);
    for (const note of notes) {
      await this.addMessage(tenantId, ticketId, note, "macro", true);
    }
    return ticket;
  }
}

let _instance: SaasHelpdeskServiceV2 | null = null;
export function getSaasHelpdeskServiceV2(): SaasHelpdeskServiceV2 {
  if (!_instance) _instance = new SaasHelpdeskServiceV2();
  return _instance;
}
export function resetSaasHelpdeskServiceV2ForTests(): void { _instance = null; }
