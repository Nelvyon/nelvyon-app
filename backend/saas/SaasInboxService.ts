import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";
import { getSaasSmsService, SaasSmsError } from "./SaasSmsService";
import { getSaasWhatsAppService, SaasWhatsAppError } from "./SaasWhatsAppService";
import { getSaasWhatsAppCloudService, SaasWhatsAppCloudError, isMetaWaConfigured } from "./SaasWhatsAppCloudService";
import { SendEmailCommand } from "@aws-sdk/client-ses";
import { getSesClient } from "../email/sesClient";

const FROM_EMAIL = process.env.SES_FROM_EMAIL ?? "no-reply@nelvyon.com";

export type InboxChannel = "email" | "sms" | "whatsapp" | "instagram" | "facebook" | "chat";
export type ConversationStatus = "open" | "closed" | "spam";
export type ConversationPriority = "low" | "normal" | "high" | "urgent";

export interface SaasConversation {
  id: string;
  tenantId: string;
  contactId: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  channel: InboxChannel;
  status: ConversationStatus;
  priority: ConversationPriority;
  assignedTo: string | null;
  threadId: string | null;
  subject: string | null;
  firstResponseAt: string | null;
  slaDueAt: string | null;
  slaBreached: boolean;
  unreadCount: number;
  lastMessage: string | null;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SaasMessage {
  id: string;
  conversationId: string;
  tenantId: string;
  direction: "inbound" | "outbound";
  channel: string | null;
  body: string;
  status: "sent" | "delivered" | "read" | "failed";
  externalId: string | null;
  parentMessageId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface SaasThread {
  threadId: string;
  contactId: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  channels: InboxChannel[];
  conversationCount: number;
  lastMessage: string | null;
  lastMessageAt: string | null;
  hasBreached: boolean;
  earliestSlaDue: string | null;
}

export interface InboxSlaPolicy {
  firstResponseMinutes: number;
  resolutionMinutes: number;
  businessHoursOnly: boolean;
}

export interface CreateConversationInput {
  contactId?: string | null;
  channel: InboxChannel;
  assignedTo?: string | null;
  firstMessage?: string;
  subject?: string | null;
  priority?: ConversationPriority;
}

export interface SendMessageInput {
  body: string;
  direction?: "inbound" | "outbound";
  channel?: string | null;
  parentMessageId?: string | null;
  metadata?: Record<string, unknown>;
}

export interface ReplyResult {
  message: SaasMessage;
  channelDispatched: boolean;
  channelError?: string;
}

export interface EnrichedConversation extends SaasConversation {
  messages?: SaasMessage[];
}

export class SaasInboxError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_FOUND" | "VALIDATION" | "FORBIDDEN",
  ) {
    super(message);
    this.name = "SaasInboxError";
  }
}

const CHANNELS: InboxChannel[] = ["email", "sms", "whatsapp", "instagram", "facebook", "chat"];
const STATUSES: ConversationStatus[] = ["open", "closed", "spam"];
const PRIORITIES: ConversationPriority[] = ["low", "normal", "high", "urgent"];

// ── Row types ─────────────────────────────────────────────────────────────────

type ConvRow = {
  id: string; tenant_id: string; contact_id: string | null;
  contact_name: string | null; contact_email: string | null; contact_phone: string | null;
  channel: InboxChannel; status: ConversationStatus; priority: string;
  assigned_to: string | null; thread_id: string | null; subject: string | null;
  first_response_at: Date | null; sla_due_at: Date | null; sla_breached: boolean;
  unread_count: number | string; last_message: string | null;
  last_message_at: Date | string | null; created_at: Date | string; updated_at: Date | string;
};

type MsgRow = {
  id: string; conversation_id: string; tenant_id: string;
  direction: "inbound" | "outbound"; channel: string | null; body: string;
  status: "sent" | "delivered" | "read" | "failed";
  external_id: string | null; parent_message_id: string | null;
  metadata: Record<string, unknown>; created_at: Date | string;
};

type SlaRow = { tenant_id: string; first_response_minutes: number; resolution_minutes: number; business_hours_only: boolean };
type RoutingRow = { tenant_id: string; round_robin_enabled: boolean; last_assigned_member_id: string | null };
type ContactRow = { id: string; name: string | null; email: string | null; phone: string | null };

// ── Mappers ───────────────────────────────────────────────────────────────────

function rowToConv(r: ConvRow): SaasConversation {
  return {
    id: r.id, tenantId: r.tenant_id, contactId: r.contact_id,
    contactName: r.contact_name ?? null,
    contactEmail: r.contact_email ?? null,
    contactPhone: r.contact_phone ?? null,
    channel: r.channel, status: r.status,
    priority: (r.priority ?? "normal") as ConversationPriority,
    assignedTo: r.assigned_to, threadId: r.thread_id ?? null, subject: r.subject ?? null,
    firstResponseAt: r.first_response_at ? new Date(r.first_response_at).toISOString() : null,
    slaDueAt: r.sla_due_at ? new Date(r.sla_due_at).toISOString() : null,
    slaBreached: r.sla_breached ?? false,
    unreadCount: Number(r.unread_count),
    lastMessage: r.last_message,
    lastMessageAt: r.last_message_at ? new Date(r.last_message_at).toISOString() : null,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

function rowToMsg(r: MsgRow): SaasMessage {
  return {
    id: r.id, conversationId: r.conversation_id, tenantId: r.tenant_id,
    direction: r.direction, channel: r.channel ?? null, body: r.body,
    status: r.status, externalId: r.external_id ?? null,
    parentMessageId: r.parent_message_id ?? null,
    metadata: (r.metadata as Record<string, unknown>) ?? {},
    createdAt: new Date(r.created_at).toISOString(),
  };
}

// ── Service ───────────────────────────────────────────────────────────────────

export class SaasInboxService {
  constructor(private readonly db: SaasPostgresPort = DbClient.getInstance()) {}

  // ── Core conversation CRUD ────────────────────────────────────────────────

  async listConversations(tenantId: string, opts?: {
    status?: string; channel?: string; assignedTo?: string;
    slaAtRisk?: boolean; threadId?: string;
  }): Promise<SaasConversation[]> {
    const clauses = ["c.tenant_id = $1"];
    const params: unknown[] = [tenantId];
    let idx = 2;
    if (opts?.status && STATUSES.includes(opts.status as ConversationStatus)) {
      clauses.push(`c.status = $${idx++}`); params.push(opts.status);
    }
    if (opts?.channel && CHANNELS.includes(opts.channel as InboxChannel)) {
      clauses.push(`c.channel = $${idx++}`); params.push(opts.channel);
    }
    if (opts?.assignedTo) {
      clauses.push(`c.assigned_to = $${idx++}`); params.push(opts.assignedTo);
    }
    if (opts?.slaAtRisk) {
      clauses.push(`c.status = 'open' AND (c.sla_breached = true OR c.sla_due_at <= NOW() + INTERVAL '30 minutes')`);
    }
    if (opts?.threadId) {
      clauses.push(`c.thread_id = $${idx++}`); params.push(opts.threadId);
    }
    const rows = await this.db.query<ConvRow>(
      `SELECT c.id, c.tenant_id, c.contact_id, c.channel, c.status,
              COALESCE(c.priority,'normal') as priority,
              c.assigned_to, c.thread_id, c.subject,
              c.first_response_at, c.sla_due_at,
              COALESCE(c.sla_breached,false) as sla_breached,
              c.unread_count, c.last_message, c.last_message_at, c.created_at, c.updated_at,
              ct.name AS contact_name, ct.email AS contact_email, ct.phone AS contact_phone
       FROM conversations c
       LEFT JOIN saas_contacts ct ON ct.tenant_id = c.tenant_id AND ct.id = c.contact_id
       WHERE ${clauses.join(" AND ")}
       ORDER BY c.last_message_at DESC NULLS LAST, c.created_at DESC`,
      params,
    );
    return rows.map(rowToConv);
  }

  async getConversation(tenantId: string, id: string): Promise<SaasConversation | null> {
    const rows = await this.db.query<ConvRow>(
      `SELECT c.id, c.tenant_id, c.contact_id, c.channel, c.status,
              COALESCE(c.priority,'normal') as priority,
              c.assigned_to, c.thread_id, c.subject,
              c.first_response_at, c.sla_due_at,
              COALESCE(c.sla_breached,false) as sla_breached,
              c.unread_count, c.last_message, c.last_message_at, c.created_at, c.updated_at,
              ct.name AS contact_name, ct.email AS contact_email, ct.phone AS contact_phone
       FROM conversations c
       LEFT JOIN saas_contacts ct ON ct.tenant_id = c.tenant_id AND ct.id = c.contact_id
       WHERE c.tenant_id=$1 AND c.id=$2 LIMIT 1`,
      [tenantId, id],
    );
    return rows[0] ? rowToConv(rows[0]) : null;
  }

  async createConversation(tenantId: string, input: CreateConversationInput): Promise<SaasConversation> {
    if (!CHANNELS.includes(input.channel)) throw new SaasInboxError(`Invalid channel: ${input.channel}`, "VALIDATION");
    if (input.priority && !PRIORITIES.includes(input.priority)) {
      throw new SaasInboxError(`Invalid priority: ${input.priority}`, "VALIDATION");
    }

    // Determine thread_id for this contact
    const threadId = input.contactId ? await this.getOrCreateThread(tenantId, input.contactId) : null;

    // Compute SLA due
    const sla = await this.getSlaPolicy(tenantId);
    const slaDueMinutes = sla.firstResponseMinutes;

    // Round-robin assignment if none provided
    let assignedTo = input.assignedTo ?? null;
    if (!assignedTo) {
      assignedTo = await this.assignRoundRobinNew(tenantId);
    }

    const rows = await this.db.query<ConvRow>(
      `INSERT INTO conversations
         (tenant_id, contact_id, channel, assigned_to, last_message, last_message_at,
          thread_id, subject, priority, sla_due_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,CASE WHEN $5 IS NOT NULL THEN NOW() ELSE NULL END,
               $6,$7,$8, NOW() + ($9 || ' minutes')::INTERVAL, NOW())
       RETURNING id, tenant_id, contact_id, channel, status,
                 COALESCE(priority,'normal') as priority,
                 assigned_to, thread_id, subject,
                 first_response_at, sla_due_at, COALESCE(sla_breached,false) as sla_breached,
                 unread_count, last_message, last_message_at, created_at, updated_at,
                 NULL::text AS contact_name, NULL::text AS contact_email, NULL::text AS contact_phone`,
      [tenantId, input.contactId ?? null, input.channel, assignedTo,
       input.firstMessage ?? null, threadId, input.subject ?? null,
       input.priority ?? "normal", String(slaDueMinutes)],
    );
    if (!rows[0]) throw new SaasInboxError("Failed to create conversation", "VALIDATION");
    return rowToConv(rows[0]);
  }

  async updateConversation(
    tenantId: string, id: string,
    input: { status?: ConversationStatus; assignedTo?: string | null; priority?: ConversationPriority },
  ): Promise<SaasConversation> {
    const existing = await this.getConversation(tenantId, id);
    if (!existing) throw new SaasInboxError("Conversation not found", "NOT_FOUND");
    const sets: string[] = ["updated_at = NOW()"];
    const params: unknown[] = [tenantId, id];
    let idx = 3;
    if (input.status !== undefined) { sets.push(`status = $${idx++}`); params.push(input.status); }
    if (input.assignedTo !== undefined) { sets.push(`assigned_to = $${idx++}`); params.push(input.assignedTo); }
    if (input.priority !== undefined) { sets.push(`priority = $${idx++}`); params.push(input.priority); }
    const rows = await this.db.query<ConvRow>(
      `UPDATE conversations SET ${sets.join(",")} WHERE tenant_id=$1 AND id=$2
       RETURNING id, tenant_id, contact_id, channel, status,
                 COALESCE(priority,'normal') as priority,
                 assigned_to, thread_id, subject,
                 first_response_at, sla_due_at, COALESCE(sla_breached,false) as sla_breached,
                 unread_count, last_message, last_message_at, created_at, updated_at,
                 NULL::text AS contact_name, NULL::text AS contact_email, NULL::text AS contact_phone`,
      params,
    );
    if (!rows[0]) throw new SaasInboxError("Conversation not found", "NOT_FOUND");
    return rowToConv(rows[0]);
  }

  async assignConversation(tenantId: string, conversationId: string, memberId: string | null): Promise<SaasConversation> {
    const assigned = memberId ?? await this.assignRoundRobinNew(tenantId);
    return this.updateConversation(tenantId, conversationId, { assignedTo: assigned });
  }

  // ── Messages ──────────────────────────────────────────────────────────────

  async listMessages(tenantId: string, conversationId: string): Promise<SaasMessage[]> {
    const conv = await this.getConversation(tenantId, conversationId);
    if (!conv) throw new SaasInboxError("Conversation not found", "NOT_FOUND");
    const rows = await this.db.query<MsgRow>(
      `SELECT id, conversation_id, tenant_id, direction,
              channel, body, status, external_id, parent_message_id,
              COALESCE(metadata,'{}') as metadata, created_at
       FROM conversation_messages WHERE conversation_id=$1 ORDER BY created_at ASC`,
      [conversationId],
    );
    await this.db.query(
      `UPDATE conversations SET unread_count=0, updated_at=NOW() WHERE tenant_id=$1 AND id=$2`,
      [tenantId, conversationId],
    );
    return rows.map(rowToMsg);
  }

  async sendMessage(tenantId: string, conversationId: string, input: SendMessageInput): Promise<SaasMessage> {
    const conv = await this.getConversation(tenantId, conversationId);
    if (!conv) throw new SaasInboxError("Conversation not found", "NOT_FOUND");
    if (!input.body.trim()) throw new SaasInboxError("body is required", "VALIDATION");
    const direction = input.direction ?? "outbound";
    const rows = await this.db.query<MsgRow>(
      `INSERT INTO conversation_messages
         (conversation_id, tenant_id, direction, channel, body, status, parent_message_id, metadata)
       VALUES ($1,$2,$3,$4,$5,'sent',$6,$7::jsonb)
       RETURNING id, conversation_id, tenant_id, direction, channel, body, status,
                 external_id, parent_message_id,
                 COALESCE(metadata,'{}') as metadata, created_at`,
      [conversationId, tenantId, direction, input.channel ?? conv.channel,
       input.body.trim(), input.parentMessageId ?? null,
       JSON.stringify(input.metadata ?? {})],
    );
    if (!rows[0]) throw new SaasInboxError("Failed to send message", "VALIDATION");
    const unreadDelta = direction === "inbound" ? 1 : 0;
    await this.db.query(
      `UPDATE conversations SET last_message=$3, last_message_at=NOW(),
        unread_count = unread_count + $4, updated_at=NOW()
       WHERE tenant_id=$1 AND id=$2`,
      [tenantId, conversationId, input.body.trim().slice(0, 200), unreadDelta],
    );
    return rowToMsg(rows[0]);
  }

  async replyToConversation(tenantId: string, conversationId: string, body: string): Promise<ReplyResult> {
    const conv = await this.getConversation(tenantId, conversationId);
    if (!conv) throw new SaasInboxError("Conversation not found", "NOT_FOUND");
    if (!body.trim()) throw new SaasInboxError("body is required", "VALIDATION");

    const message = await this.sendMessage(tenantId, conversationId, { body, direction: "outbound" });

    // Set first_response_at if this is the first outbound message
    if (!conv.firstResponseAt) {
      const withinSla = !conv.slaDueAt || new Date() <= new Date(conv.slaDueAt);
      await this.db.query(
        `UPDATE conversations SET first_response_at=NOW(),
          sla_breached = CASE WHEN $3 THEN false ELSE sla_breached END,
          updated_at=NOW()
         WHERE tenant_id=$1 AND id=$2`,
        [tenantId, conversationId, withinSla],
      );
    }

    // Resolve contact phone for SMS / WhatsApp
    let contactPhone: string | null = null;
    let contactEmail: string | null = conv.contactEmail ?? null;

    if ((conv.channel === "sms" || conv.channel === "whatsapp" || conv.channel === "email") && conv.contactId) {
      const rows = await this.db.query<ContactRow>(
        `SELECT id, name, email, phone FROM saas_contacts WHERE tenant_id=$1 AND id=$2 LIMIT 1`,
        [tenantId, conv.contactId],
      ).catch(() => [] as ContactRow[]);
      contactPhone = rows[0]?.phone ?? null;
      contactEmail = rows[0]?.email ?? contactEmail;
    }

    let channelDispatched = false;
    let channelError: string | undefined;

    if (conv.channel === "sms") {
      if (!contactPhone) {
        channelError = "Contact has no phone number — message stored but SMS not sent";
      } else {
        try {
          await getSaasSmsService().send(tenantId, contactPhone, body.trim());
          channelDispatched = true;
        } catch (e) {
          channelError = e instanceof SaasSmsError ? e.message : "SMS dispatch failed";
        }
      }
    } else if (conv.channel === "whatsapp") {
      if (!contactPhone) {
        channelError = "Contact has no phone number — message stored but WhatsApp not sent";
      } else {
        try {
          if (isMetaWaConfigured()) {
            await getSaasWhatsAppCloudService().send(tenantId, {
              to: contactPhone, body: body.trim(), contactId: conv.contactId ?? undefined,
            });
          } else {
            await getSaasWhatsAppService().send(tenantId, {
              to: contactPhone, body: body.trim(), contactId: conv.contactId ?? undefined,
            });
          }
          channelDispatched = true;
        } catch (e) {
          channelError = (e instanceof SaasWhatsAppCloudError || e instanceof SaasWhatsAppError)
            ? e.message : "WhatsApp dispatch failed";
        }
      }
    } else if (conv.channel === "email") {
      if (!contactEmail) {
        channelError = "Contact has no email — message stored but email not sent";
      } else {
        try {
          const sesClient = getSesClient();
          if (!sesClient) {
            channelError = "SES not configured";
          } else {
            await sesClient.send(new SendEmailCommand({
              Source: FROM_EMAIL,
              Destination: { ToAddresses: [contactEmail] },
              Message: {
                Subject: { Data: conv.subject ?? `Re: ${conv.id.slice(0, 8)}`, Charset: "UTF-8" },
                Body: { Text: { Data: body.trim(), Charset: "UTF-8" } },
              },
            }));
            channelDispatched = true;
          }
        } catch (e) {
          channelError = e instanceof Error ? e.message : "Email dispatch failed";
        }
      }
    }
    // chat / instagram / facebook — stored only

    return { message, channelDispatched, channelError };
  }

  // ── Threading ─────────────────────────────────────────────────────────────

  async getOrCreateThread(tenantId: string, contactId: string): Promise<string> {
    // Find existing thread_id for this contact in this tenant
    const rows = await this.db.query<{ thread_id: string }>(
      `SELECT thread_id FROM conversations
       WHERE tenant_id=$1 AND contact_id=$2 AND thread_id IS NOT NULL
       ORDER BY created_at ASC LIMIT 1`,
      [tenantId, contactId],
    );
    if (rows[0]?.thread_id) return rows[0].thread_id;
    // Generate new stable UUID for this thread
    const result = await this.db.query<{ id: string }>(
      `SELECT gen_random_uuid() AS id`,
      [],
    );
    return result[0]?.id ?? crypto.randomUUID();
  }

  async listThreads(tenantId: string): Promise<SaasThread[]> {
    const rows = await this.db.query<{
      thread_id: string; contact_id: string | null;
      contact_name: string | null; contact_email: string | null; contact_phone: string | null;
      channels: string; conversation_count: number;
      last_message: string | null; last_message_at: Date | null;
      has_breached: boolean; earliest_sla_due: Date | null;
    }>(
      `SELECT c.thread_id,
              c.contact_id,
              ct.name AS contact_name, ct.email AS contact_email, ct.phone AS contact_phone,
              STRING_AGG(DISTINCT c.channel, ',') AS channels,
              COUNT(*) AS conversation_count,
              MAX(c.last_message) AS last_message,
              MAX(c.last_message_at) AS last_message_at,
              BOOL_OR(COALESCE(c.sla_breached,false)) AS has_breached,
              MIN(c.sla_due_at) FILTER (WHERE c.status='open') AS earliest_sla_due
       FROM conversations c
       LEFT JOIN saas_contacts ct ON ct.tenant_id = c.tenant_id AND ct.id = c.contact_id
       WHERE c.tenant_id=$1 AND c.thread_id IS NOT NULL
       GROUP BY c.thread_id, c.contact_id, ct.name, ct.email, ct.phone
       ORDER BY MAX(c.last_message_at) DESC NULLS LAST`,
      [tenantId],
    );
    return rows.map(r => ({
      threadId: r.thread_id,
      contactId: r.contact_id,
      contactName: r.contact_name ?? null,
      contactEmail: r.contact_email ?? null,
      contactPhone: r.contact_phone ?? null,
      channels: (r.channels ?? "").split(",").filter(Boolean) as InboxChannel[],
      conversationCount: Number(r.conversation_count),
      lastMessage: r.last_message ?? null,
      lastMessageAt: r.last_message_at ? new Date(r.last_message_at).toISOString() : null,
      hasBreached: r.has_breached ?? false,
      earliestSlaDue: r.earliest_sla_due ? new Date(r.earliest_sla_due).toISOString() : null,
    }));
  }

  async getThread(tenantId: string, threadId: string): Promise<{ conversations: SaasConversation[]; messages: SaasMessage[] }> {
    const conversations = await this.listConversations(tenantId, { threadId });
    if (!conversations.length) return { conversations: [], messages: [] };

    const convIds = conversations.map(c => c.id);
    const msgRows = await this.db.query<MsgRow>(
      `SELECT id, conversation_id, tenant_id, direction,
              channel, body, status, external_id, parent_message_id,
              COALESCE(metadata,'{}') as metadata, created_at
       FROM conversation_messages
       WHERE conversation_id = ANY($1::uuid[])
       ORDER BY created_at ASC`,
      [convIds],
    );
    return { conversations, messages: msgRows.map(rowToMsg) };
  }

  async enrichConversationList(tenantId: string, convs: SaasConversation[]): Promise<SaasConversation[]> {
    if (!convs.length) return convs;
    const contactIds = [...new Set(convs.map(c => c.contactId).filter(Boolean) as string[])];
    if (!contactIds.length) return convs;
    const contacts = await this.db.query<ContactRow>(
      `SELECT id, name, email, phone FROM saas_contacts WHERE tenant_id=$1 AND id = ANY($2::uuid[])`,
      [tenantId, contactIds],
    );
    const byId = new Map(contacts.map(c => [c.id, c]));
    return convs.map(c => {
      const ct = c.contactId ? byId.get(c.contactId) : undefined;
      return { ...c, contactName: ct?.name ?? c.contactName, contactEmail: ct?.email ?? c.contactEmail, contactPhone: ct?.phone ?? c.contactPhone };
    });
  }

  // ── Round-robin ───────────────────────────────────────────────────────────

  async assignRoundRobin(tenantId: string, conversationId: string): Promise<SaasConversation> {
    const memberId = await this.assignRoundRobinNew(tenantId);
    return this.updateConversation(tenantId, conversationId, { assignedTo: memberId });
  }

  private async assignRoundRobinNew(tenantId: string): Promise<string | null> {
    // Check if round-robin is enabled
    const routingRows = await this.db.query<RoutingRow>(
      `SELECT round_robin_enabled, last_assigned_member_id FROM saas_inbox_routing WHERE tenant_id=$1`,
      [tenantId],
    );
    const routing = routingRows[0];
    if (routing && !routing.round_robin_enabled) return null;

    // Get active assignable members directly (avoids singleton DB dependency in tests)
    const memberRows = await this.db.query<{ id: string }>(
      `SELECT id FROM saas_team_members WHERE tenant_id=$1 AND status='active'
       AND role IN ('owner','admin','manager','user') ORDER BY created_at ASC`,
      [tenantId],
    );
    if (!memberRows.length) return null;

    // Find next after last assigned
    const lastId = routing?.last_assigned_member_id ?? null;
    const lastIdx = lastId ? memberRows.findIndex(m => m.id === lastId) : -1;
    const nextIdx = (lastIdx + 1) % memberRows.length;
    const next = memberRows[nextIdx]!;

    // Update last assigned
    await this.db.query(
      `INSERT INTO saas_inbox_routing (tenant_id, round_robin_enabled, last_assigned_member_id, updated_at)
       VALUES ($1, true, $2, NOW())
       ON CONFLICT (tenant_id) DO UPDATE SET last_assigned_member_id=$2, updated_at=NOW()`,
      [tenantId, next.id],
    );

    return next.id;
  }

  // ── SLA ───────────────────────────────────────────────────────────────────

  async getSlaPolicy(tenantId: string): Promise<InboxSlaPolicy> {
    const rows = await this.db.query<SlaRow>(
      `SELECT first_response_minutes, resolution_minutes, business_hours_only
       FROM saas_inbox_sla_policies WHERE tenant_id=$1`,
      [tenantId],
    );
    if (rows[0]) {
      return {
        firstResponseMinutes: rows[0].first_response_minutes,
        resolutionMinutes: rows[0].resolution_minutes,
        businessHoursOnly: rows[0].business_hours_only,
      };
    }
    return { firstResponseMinutes: 60, resolutionMinutes: 480, businessHoursOnly: false };
  }

  async setSlaPolicy(tenantId: string, policy: Partial<InboxSlaPolicy>): Promise<InboxSlaPolicy> {
    const current = await this.getSlaPolicy(tenantId);
    const next = {
      firstResponseMinutes: policy.firstResponseMinutes ?? current.firstResponseMinutes,
      resolutionMinutes: policy.resolutionMinutes ?? current.resolutionMinutes,
      businessHoursOnly: policy.businessHoursOnly ?? current.businessHoursOnly,
    };
    await this.db.query(
      `INSERT INTO saas_inbox_sla_policies (tenant_id, first_response_minutes, resolution_minutes, business_hours_only, updated_at)
       VALUES ($1,$2,$3,$4,NOW())
       ON CONFLICT (tenant_id) DO UPDATE
         SET first_response_minutes=$2, resolution_minutes=$3, business_hours_only=$4, updated_at=NOW()`,
      [tenantId, next.firstResponseMinutes, next.resolutionMinutes, next.businessHoursOnly],
    );
    return next;
  }

  async computeSlaDue(tenantId: string, conversationId: string): Promise<Date> {
    const sla = await this.getSlaPolicy(tenantId);
    return new Date(Date.now() + sla.firstResponseMinutes * 60_000);
  }

  async checkSlaBreaches(tenantId: string): Promise<number> {
    const result = await this.db.query<{ count: string }>(
      `UPDATE conversations SET sla_breached=true, updated_at=NOW()
       WHERE tenant_id=$1 AND status='open' AND sla_due_at < NOW()
         AND first_response_at IS NULL AND sla_breached=false
       RETURNING id`,
      [tenantId],
    );
    return result.length;
  }

  async listSlaAtRisk(tenantId: string): Promise<SaasConversation[]> {
    return this.listConversations(tenantId, { slaAtRisk: true });
  }
}

let _instance: SaasInboxService | null = null;
export function getSaasInboxService(): SaasInboxService {
  if (!_instance) _instance = new SaasInboxService();
  return _instance;
}
export function resetSaasInboxServiceForTests(): void { _instance = null; }
