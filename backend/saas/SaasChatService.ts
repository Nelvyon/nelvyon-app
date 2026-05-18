import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";
import type { ILlmClient } from "../os-agents/LlmClient";
import { LlmClient } from "../os-agents/LlmClient";
import { logger } from "../os-agents/cron/logger";

export type MessageRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  userId: string;
  tenantId: string;
  role: MessageRole;
  content: string;
  createdAt: string;
}

export type SaasChatServiceDeps = {
  db?: Pick<DbClient, "query">;
  llm?: ILlmClient;
};

export class SaasChatService {
  constructor(private readonly deps: SaasChatServiceDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? LlmClient.getInstance();
  }

  async getHistory(userId: string, tenantId: string, limit = 50): Promise<ChatMessage[]> {
    const rows = await this.db.query<ChatMessage>(
      `SELECT id, user_id as "userId", tenant_id as "tenantId", role, content, created_at as "createdAt"
       FROM saas_chat_messages
       WHERE user_id = $1 AND tenant_id = $2
       ORDER BY created_at ASC LIMIT $3`,
      [userId, tenantId, Math.min(Math.max(Math.floor(limit), 1), 100)],
    );
    return rows;
  }

  async sendMessage(userId: string, tenantId: string, content: string): Promise<{ userMessage: ChatMessage; assistantMessage: ChatMessage }> {
    const userRows = await this.db.query<ChatMessage>(
      `INSERT INTO saas_chat_messages (user_id, tenant_id, role, content)
       VALUES ($1, $2, 'user', $3)
       RETURNING id, user_id as "userId", tenant_id as "tenantId", role, content, created_at as "createdAt"`,
      [userId, tenantId, content],
    );
    const userMessage = userRows[0];
    if (!userMessage) throw new Error("SaasChatService.sendMessage: user insert returned no row");

    const context = await this.db.query<{ service_id: string; status: string }>(
      `SELECT service_id, status FROM os_service_contracts WHERE client_id = $1 AND tenant_id = $2::uuid LIMIT 5`,
      [userId, tenantId],
    );

    const history = await this.getHistory(userId, tenantId, 10);

    const systemPrompt = `Eres el OS de NELVYON, el asistente inteligente de la plataforma.
Hablas en el idioma del cliente. Eres profesional, conciso y útil.
Servicios activos del cliente: ${context.map((c) => `${c.service_id} (${c.status})`).join(", ") || "ninguno"}.
Puedes informar sobre el estado de sus servicios, explicar resultados, y registrar solicitudes de cambio.
No inventes datos. Si no tienes información, dilo claramente.

Historial reciente:
${history.slice(-8).map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n")}

Mensaje actual del cliente:
${content}`;

    const response = await this.llm.complete(systemPrompt);

    const assistantRows = await this.db.query<ChatMessage>(
      `INSERT INTO saas_chat_messages (user_id, tenant_id, role, content)
       VALUES ($1, $2, 'assistant', $3)
       RETURNING id, user_id as "userId", tenant_id as "tenantId", role, content, created_at as "createdAt"`,
      [userId, tenantId, response],
    );
    const assistantMessage = assistantRows[0];
    if (!assistantMessage) throw new Error("SaasChatService.sendMessage: assistant insert returned no row");

    logger.info(`[CHAT] ${userId} → OS: "${content.slice(0, 50)}..."`);
    return { userMessage, assistantMessage };
  }

  async clearHistory(userId: string, tenantId: string): Promise<number> {
    const rows = await this.db.query<{ id: string }>(
      `DELETE FROM saas_chat_messages WHERE user_id = $1 AND tenant_id = $2 RETURNING id`,
      [userId, tenantId],
    );
    return rows.length;
  }
}

export const saasChatService = new SaasChatService();
