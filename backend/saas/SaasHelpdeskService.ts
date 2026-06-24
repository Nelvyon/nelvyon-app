/**
 * SaasHelpdeskService — tickets de soporte + mensajes.
 * Tables: saas_helpdesk_tickets, saas_helpdesk_messages (migration 428).
 */
import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";

export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";

export type HelpdeskTicket = {
  id: string; tenantId: string; subject: string; description: string | null;
  status: TicketStatus; priority: TicketPriority;
  contactName: string; contactEmail: string;
  assignedTo: string | null; resolvedAt: string | null;
  messageCount: number; createdAt: string; updatedAt: string;
};

export type HelpdeskMessage = {
  id: string; ticketId: string; tenantId: string;
  author: string; body: string; isInternal: boolean; createdAt: string;
};

export type CreateTicketInput = {
  subject: string; description?: string | null;
  contactName?: string; contactEmail: string;
  priority?: TicketPriority; assignedTo?: string | null;
};

export type UpdateTicketInput = Partial<Pick<HelpdeskTicket, "status" | "priority" | "assignedTo">>;

export class SaasHelpdeskError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message); this.name = "SaasHelpdeskError";
  }
}

const STATUSES: TicketStatus[] = ["open", "in_progress", "resolved", "closed"];
const PRIORITIES: TicketPriority[] = ["low", "medium", "high", "urgent"];

type TicketRow = {
  id: string; tenant_id: string; subject: string; description: string | null;
  status: string; priority: string; contact_name: string; contact_email: string;
  assigned_to: string | null; resolved_at: Date | null;
  message_count: string | number; created_at: Date; updated_at: Date;
};

type MessageRow = {
  id: string; ticket_id: string; tenant_id: string;
  author: string; body: string; is_internal: boolean; created_at: Date;
};

function rowToTicket(r: TicketRow): HelpdeskTicket {
  return {
    id: r.id, tenantId: r.tenant_id, subject: r.subject, description: r.description,
    status: r.status as TicketStatus, priority: r.priority as TicketPriority,
    contactName: r.contact_name, contactEmail: r.contact_email,
    assignedTo: r.assigned_to, resolvedAt: r.resolved_at ? new Date(r.resolved_at).toISOString() : null,
    messageCount: Number(r.message_count ?? 0),
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

export class SaasHelpdeskService {
  constructor(private readonly db: SaasPostgresPort = DbClient.getInstance()) {}

  async list(tenantId: string, status?: TicketStatus): Promise<HelpdeskTicket[]> {
    const where = status ? `AND t.status=$2` : "";
    const params: unknown[] = status ? [tenantId, status] : [tenantId];
    const rows = await this.db.query<TicketRow>(
      `SELECT t.id,t.tenant_id,t.subject,t.description,t.status,t.priority,
              t.contact_name,t.contact_email,t.assigned_to,t.resolved_at,
              t.created_at,t.updated_at,
              COUNT(m.id) AS message_count
       FROM saas_helpdesk_tickets t
       LEFT JOIN saas_helpdesk_messages m ON m.ticket_id = t.id
       WHERE t.tenant_id=$1 ${where}
       GROUP BY t.id ORDER BY t.updated_at DESC LIMIT 200`,
      params,
    );
    return rows.map(rowToTicket);
  }

  async create(tenantId: string, input: CreateTicketInput): Promise<HelpdeskTicket> {
    if (!input.subject?.trim()) throw new SaasHelpdeskError("subject is required", "VALIDATION");
    if (!input.contactEmail?.trim()) throw new SaasHelpdeskError("contactEmail is required", "VALIDATION");
    const priority: TicketPriority = PRIORITIES.includes(input.priority as TicketPriority) ? (input.priority as TicketPriority) : "medium";
    const rows = await this.db.query<TicketRow>(
      `INSERT INTO saas_helpdesk_tickets (tenant_id,subject,description,contact_name,contact_email,priority,assigned_to)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING id,tenant_id,subject,description,status,priority,contact_name,contact_email,assigned_to,resolved_at,created_at,updated_at,0 AS message_count`,
      [tenantId, input.subject.trim(), input.description ?? null,
       input.contactName?.trim() ?? "", input.contactEmail.trim(), priority, input.assignedTo ?? null],
    );
    if (!rows[0]) throw new SaasHelpdeskError("Failed to create ticket", "DB_ERROR");
    return rowToTicket(rows[0]);
  }

  async update(tenantId: string, ticketId: string, input: UpdateTicketInput): Promise<HelpdeskTicket> {
    const sets: string[] = ["updated_at=NOW()"];
    const params: unknown[] = [tenantId, ticketId];
    let idx = 3;
    if (input.status !== undefined) {
      if (!STATUSES.includes(input.status)) throw new SaasHelpdeskError("Invalid status", "VALIDATION");
      sets.push(`status=$${idx++}`); params.push(input.status);
      if (input.status === "resolved" || input.status === "closed") {
        sets.push(`resolved_at=NOW()`);
      }
    }
    if (input.priority !== undefined) { sets.push(`priority=$${idx++}`); params.push(input.priority); }
    if (input.assignedTo !== undefined) { sets.push(`assigned_to=$${idx++}`); params.push(input.assignedTo); }
    const rows = await this.db.query<TicketRow>(
      `UPDATE saas_helpdesk_tickets SET ${sets.join(",")} WHERE tenant_id=$1 AND id=$2
       RETURNING id,tenant_id,subject,description,status,priority,contact_name,contact_email,assigned_to,resolved_at,created_at,updated_at,0 AS message_count`,
      params,
    );
    if (!rows[0]) throw new SaasHelpdeskError("Ticket not found", "NOT_FOUND");
    return rowToTicket(rows[0]);
  }

  async addMessage(tenantId: string, ticketId: string, body: string, author = "agent", isInternal = false): Promise<HelpdeskMessage> {
    if (!body?.trim()) throw new SaasHelpdeskError("body is required", "VALIDATION");
    const rows = await this.db.query<MessageRow>(
      `INSERT INTO saas_helpdesk_messages (ticket_id,tenant_id,author,body,is_internal)
       VALUES ($1,$2,$3,$4,$5)
       RETURNING id,ticket_id,tenant_id,author,body,is_internal,created_at`,
      [ticketId, tenantId, author, body.trim(), isInternal],
    );
    if (!rows[0]) throw new SaasHelpdeskError("Failed to add message", "DB_ERROR");
    await this.db.query(`UPDATE saas_helpdesk_tickets SET updated_at=NOW() WHERE id=$1`, [ticketId]);
    return {
      id: rows[0].id, ticketId: rows[0].ticket_id, tenantId: rows[0].tenant_id,
      author: rows[0].author, body: rows[0].body, isInternal: rows[0].is_internal,
      createdAt: new Date(rows[0].created_at).toISOString(),
    };
  }

  async delete(tenantId: string, ticketId: string): Promise<void> {
    const rows = await this.db.query<{ id: string }>(
      `DELETE FROM saas_helpdesk_tickets WHERE tenant_id=$1 AND id=$2 RETURNING id`,
      [tenantId, ticketId],
    );
    if (!rows[0]) throw new SaasHelpdeskError("Ticket not found", "NOT_FOUND");
  }
}

let _instance: SaasHelpdeskService | null = null;
export function getSaasHelpdeskService(): SaasHelpdeskService {
  if (!_instance) _instance = new SaasHelpdeskService();
  return _instance;
}
export function resetSaasHelpdeskServiceForTests(): void { _instance = null; }
