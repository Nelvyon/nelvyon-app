import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";

export type CalendarEventType = "appointment" | "campaign" | "task" | "deadline" | "reminder";

export interface SaasCalendarEvent {
  id: string;
  tenantId: string;
  title: string;
  type: CalendarEventType;
  eventDate: string;
  eventTime: string | null;
  durationMinutes: number | null;
  color: string | null;
  contactId: string | null;
  dealId: string | null;
  campaignId: string | null;
  assignedTo: string | null;
  completed: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateCalendarEventInput {
  title: string;
  type: CalendarEventType;
  eventDate: string;
  eventTime?: string | null;
  durationMinutes?: number | null;
  color?: string | null;
  contactId?: string | null;
  dealId?: string | null;
  campaignId?: string | null;
  assignedTo?: string | null;
  notes?: string | null;
}

export class SaasCalendarError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_FOUND" | "VALIDATION",
  ) {
    super(message);
    this.name = "SaasCalendarError";
  }
}

const EVENT_TYPES: CalendarEventType[] = ["appointment", "campaign", "task", "deadline", "reminder"];

type EventRow = {
  id: string; tenant_id: string; title: string; type: CalendarEventType;
  event_date: string; event_time: string | null; duration_minutes: number | null;
  color: string | null; contact_id: string | null; deal_id: string | null;
  campaign_id: string | null; assigned_to: string | null; completed: boolean;
  notes: string | null; created_at: Date | string; updated_at: Date | string;
};

function rowToEvent(r: EventRow): SaasCalendarEvent {
  return {
    id: r.id, tenantId: r.tenant_id, title: r.title, type: r.type,
    eventDate: r.event_date, eventTime: r.event_time, durationMinutes: r.duration_minutes,
    color: r.color, contactId: r.contact_id, dealId: r.deal_id, campaignId: r.campaign_id,
    assignedTo: r.assigned_to, completed: Boolean(r.completed), notes: r.notes,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

export class SaasCalendarService {
  constructor(private readonly db: SaasPostgresPort = DbClient.getInstance()) {}

  async list(tenantId: string, opts?: { from?: string; to?: string; type?: string }): Promise<SaasCalendarEvent[]> {
    const clauses = ["tenant_id = $1"];
    const params: unknown[] = [tenantId];
    let idx = 2;
    if (opts?.from) { clauses.push(`event_date >= $${idx++}`); params.push(opts.from); }
    if (opts?.to)   { clauses.push(`event_date <= $${idx++}`); params.push(opts.to); }
    if (opts?.type) { clauses.push(`type = $${idx++}`); params.push(opts.type); }
    const rows = await this.db.query<EventRow>(
      `SELECT id, tenant_id, title, type, event_date, event_time, duration_minutes, color,
              contact_id, deal_id, campaign_id, assigned_to, completed, notes, created_at, updated_at
       FROM calendar_events WHERE ${clauses.join(" AND ")} ORDER BY event_date ASC, event_time ASC NULLS LAST`,
      params,
    );
    return rows.map(rowToEvent);
  }

  async get(tenantId: string, id: string): Promise<SaasCalendarEvent | null> {
    const rows = await this.db.query<EventRow>(
      `SELECT id, tenant_id, title, type, event_date, event_time, duration_minutes, color,
              contact_id, deal_id, campaign_id, assigned_to, completed, notes, created_at, updated_at
       FROM calendar_events WHERE tenant_id=$1 AND id=$2 LIMIT 1`,
      [tenantId, id],
    );
    return rows[0] ? rowToEvent(rows[0]) : null;
  }

  async create(tenantId: string, input: CreateCalendarEventInput): Promise<SaasCalendarEvent> {
    if (!input.title.trim()) throw new SaasCalendarError("title is required", "VALIDATION");
    if (!EVENT_TYPES.includes(input.type)) throw new SaasCalendarError(`Invalid type: ${input.type}`, "VALIDATION");
    if (!input.eventDate) throw new SaasCalendarError("eventDate is required", "VALIDATION");
    const rows = await this.db.query<EventRow>(
      `INSERT INTO calendar_events (tenant_id, title, type, event_date, event_time, duration_minutes, color,
         contact_id, deal_id, campaign_id, assigned_to, notes, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
       RETURNING id, tenant_id, title, type, event_date, event_time, duration_minutes, color,
                 contact_id, deal_id, campaign_id, assigned_to, completed, notes, created_at, updated_at`,
      [tenantId, input.title.trim(), input.type, input.eventDate, input.eventTime ?? null,
       input.durationMinutes ?? null, input.color ?? null, input.contactId ?? null,
       input.dealId ?? null, input.campaignId ?? null, input.assignedTo ?? null, input.notes ?? null],
    );
    if (!rows[0]) throw new SaasCalendarError("Failed to create event", "VALIDATION");
    return rowToEvent(rows[0]);
  }

  async update(tenantId: string, id: string, input: Partial<CreateCalendarEventInput & { completed: boolean }>): Promise<SaasCalendarEvent> {
    const existing = await this.get(tenantId, id);
    if (!existing) throw new SaasCalendarError("Event not found", "NOT_FOUND");
    const sets: string[] = ["updated_at = NOW()"];
    const params: unknown[] = [tenantId, id];
    let idx = 3;
    const fields: Array<[keyof typeof input, string]> = [
      ["title", "title"], ["type", "type"], ["eventDate", "event_date"], ["eventTime", "event_time"],
      ["durationMinutes", "duration_minutes"], ["color", "color"], ["contactId", "contact_id"],
      ["dealId", "deal_id"], ["campaignId", "campaign_id"], ["assignedTo", "assigned_to"],
      ["notes", "notes"], ["completed", "completed"],
    ];
    for (const [key, col] of fields) {
      if (input[key] !== undefined) { sets.push(`${col} = $${idx++}`); params.push(input[key] as unknown); }
    }
    const rows = await this.db.query<EventRow>(
      `UPDATE calendar_events SET ${sets.join(",")} WHERE tenant_id=$1 AND id=$2
       RETURNING id, tenant_id, title, type, event_date, event_time, duration_minutes, color,
                 contact_id, deal_id, campaign_id, assigned_to, completed, notes, created_at, updated_at`,
      params,
    );
    if (!rows[0]) throw new SaasCalendarError("Event not found", "NOT_FOUND");
    return rowToEvent(rows[0]);
  }

  async delete(tenantId: string, id: string): Promise<void> {
    const rows = await this.db.query<{ id: string }>(
      `DELETE FROM calendar_events WHERE tenant_id=$1 AND id=$2 RETURNING id`,
      [tenantId, id],
    );
    if (!rows[0]) throw new SaasCalendarError("Event not found", "NOT_FOUND");
  }
}

let _instance: SaasCalendarService | null = null;
export function getSaasCalendarService(): SaasCalendarService {
  if (!_instance) _instance = new SaasCalendarService();
  return _instance;
}
export function resetSaasCalendarServiceForTests(): void { _instance = null; }
