import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";

export type InboxChannel = "email" | "sms" | "whatsapp" | "instagram" | "facebook" | "chat";
export type ConversationStatus = "open" | "closed" | "spam";

export interface SaasConversation {
  id: string;
  tenantId: string;
  contactId: string | null;
  channel: InboxChannel;
  status: ConversationStatus;
  assignedTo: string | null;
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
  body: string;
  status: "sent" | "delivered" | "read" | "failed";
  externalId: string | null;
  createdAt: string;
}

export interface CreateConversationInput {
  contactId?: string | null;
  channel: InboxChannel;
  assignedTo?: string | null;
  firstMessage?: string;
}

export interface SendMessageInput {
  body: string;
  direction?: "inbound" | "outbound";
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

type ConvRow = {
  id: string; tenant_id: string; contact_id: string | null; channel: InboxChannel;
  status: ConversationStatus; assigned_to: string | null; unread_count: number | string;
  last_message: string | null; last_message_at: Date | string | null;
  created_at: Date | string; updated_at: Date | string;
};

type MsgRow = {
  id: string; conversation_id: string; tenant_id: string;
  direction: "inbound" | "outbound"; body: string;
  status: "sent" | "delivered" | "read" | "failed";
  external_id: string | null; created_at: Date | string;
};

function rowToConv(r: ConvRow): SaasConversation {
  return {
    id: r.id, tenantId: r.tenant_id, contactId: r.contact_id, channel: r.channel,
    status: r.status, assignedTo: r.assigned_to, unreadCount: Number(r.unread_count),
    lastMessage: r.last_message,
    lastMessageAt: r.last_message_at ? new Date(r.last_message_at).toISOString() : null,
    createdAt: new Date(r.created_at).toISOString(),
    updatedAt: new Date(r.updated_at).toISOString(),
  };
}

function rowToMsg(r: MsgRow): SaasMessage {
  return {
    id: r.id, conversationId: r.conversation_id, tenantId: r.tenant_id,
    direction: r.direction, body: r.body, status: r.status, externalId: r.external_id,
    createdAt: new Date(r.created_at).toISOString(),
  };
}

export class SaasInboxService {
  constructor(private readonly db: SaasPostgresPort = DbClient.getInstance()) {}

  async listConversations(tenantId: string, opts?: { status?: string; channel?: string; assignedTo?: string }): Promise<SaasConversation[]> {
    const clauses = ["tenant_id = $1"];
    const params: unknown[] = [tenantId];
    let idx = 2;
    if (opts?.status && STATUSES.includes(opts.status as ConversationStatus)) {
      clauses.push(`status = $${idx++}`); params.push(opts.status);
    }
    if (opts?.channel && CHANNELS.includes(opts.channel as InboxChannel)) {
      clauses.push(`channel = $${idx++}`); params.push(opts.channel);
    }
    if (opts?.assignedTo) {
      clauses.push(`assigned_to = $${idx++}`); params.push(opts.assignedTo);
    }
    const rows = await this.db.query<ConvRow>(
      `SELECT id, tenant_id, contact_id, channel, status, assigned_to, unread_count,
              last_message, last_message_at, created_at, updated_at
       FROM conversations WHERE ${clauses.join(" AND ")} ORDER BY last_message_at DESC NULLS LAST, created_at DESC`,
      params,
    );
    return rows.map(rowToConv);
  }

  async getConversation(tenantId: string, id: string): Promise<SaasConversation | null> {
    const rows = await this.db.query<ConvRow>(
      `SELECT id, tenant_id, contact_id, channel, status, assigned_to, unread_count,
              last_message, last_message_at, created_at, updated_at
       FROM conversations WHERE tenant_id=$1 AND id=$2 LIMIT 1`,
      [tenantId, id],
    );
    return rows[0] ? rowToConv(rows[0]) : null;
  }

  async createConversation(tenantId: string, input: CreateConversationInput): Promise<SaasConversation> {
    if (!CHANNELS.includes(input.channel)) throw new SaasInboxError(`Invalid channel: ${input.channel}`, "VALIDATION");
    const rows = await this.db.query<ConvRow>(
      `INSERT INTO conversations (tenant_id, contact_id, channel, assigned_to, last_message, last_message_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,CASE WHEN $5 IS NOT NULL THEN NOW() ELSE NULL END,NOW())
       RETURNING id, tenant_id, contact_id, channel, status, assigned_to, unread_count,
                 last_message, last_message_at, created_at, updated_at`,
      [tenantId, input.contactId ?? null, input.channel, input.assignedTo ?? null, input.firstMessage ?? null],
    );
    if (!rows[0]) throw new SaasInboxError("Failed to create conversation", "VALIDATION");
    return rowToConv(rows[0]);
  }

  async updateConversation(tenantId: string, id: string, input: { status?: ConversationStatus; assignedTo?: string | null }): Promise<SaasConversation> {
    const existing = await this.getConversation(tenantId, id);
    if (!existing) throw new SaasInboxError("Conversation not found", "NOT_FOUND");
    const sets: string[] = ["updated_at = NOW()"];
    const params: unknown[] = [tenantId, id];
    let idx = 3;
    if (input.status !== undefined) { sets.push(`status = $${idx++}`); params.push(input.status); }
    if (input.assignedTo !== undefined) { sets.push(`assigned_to = $${idx++}`); params.push(input.assignedTo); }
    const rows = await this.db.query<ConvRow>(
      `UPDATE conversations SET ${sets.join(",")} WHERE tenant_id=$1 AND id=$2
       RETURNING id, tenant_id, contact_id, channel, status, assigned_to, unread_count,
                 last_message, last_message_at, created_at, updated_at`,
      params,
    );
    if (!rows[0]) throw new SaasInboxError("Conversation not found", "NOT_FOUND");
    return rowToConv(rows[0]);
  }

  async listMessages(tenantId: string, conversationId: string): Promise<SaasMessage[]> {
    const conv = await this.getConversation(tenantId, conversationId);
    if (!conv) throw new SaasInboxError("Conversation not found", "NOT_FOUND");
    const rows = await this.db.query<MsgRow>(
      `SELECT id, conversation_id, tenant_id, direction, body, status, external_id, created_at
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
      `INSERT INTO conversation_messages (conversation_id, tenant_id, direction, body, status)
       VALUES ($1,$2,$3,$4,'sent')
       RETURNING id, conversation_id, tenant_id, direction, body, status, external_id, created_at`,
      [conversationId, tenantId, direction, input.body.trim()],
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
}

let _instance: SaasInboxService | null = null;
export function getSaasInboxService(): SaasInboxService {
  if (!_instance) _instance = new SaasInboxService();
  return _instance;
}
export function resetSaasInboxServiceForTests(): void { _instance = null; }
