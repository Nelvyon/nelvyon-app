import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";
import { OsAgentError } from "../os-agents/OsAgentError";

function botApiBase(botToken: string): string {
  return `https://api.telegram.org/bot${botToken}/`;
}

export interface TelegramCredentials {
  userId: string;
  botToken: string;
  chatId: string;
  botUsername: string;
  isActive: boolean;
}

export interface TelegramMessage {
  id: string;
  userId: string;
  chatId: string;
  content: string | null;
  messageId: number | null;
  status: string;
  sentAt: string;
}

export interface BulkTelegramResult {
  sent: number;
  failed: number;
  results: ReadonlyArray<{
    chatId: string;
    ok: boolean;
    messageId?: number;
    error?: string;
  }>;
}

export type TelegramServiceDeps = {
  db?: Pick<DbClient, "query">;
  fetchFn?: typeof fetch;
};

export class TelegramService {
  constructor(private readonly deps: TelegramServiceDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  private get fetchImpl(): typeof fetch {
    return this.deps.fetchFn ?? globalThis.fetch.bind(globalThis);
  }

  async saveCredentials(userId: string, botToken: string, chatId: string, botUsername: string): Promise<void> {
    const token = botToken.trim();
    const cid = chatId.trim();
    const uname = botUsername.trim();
    if (!token || !cid) {
      throw new OsAgentError("botToken y chatId son requeridos.", "telegram_validation");
    }
    await this.db.query(
      `INSERT INTO integration_telegram
         (user_id, bot_token, chat_id, bot_username, is_active, updated_at)
       VALUES ($1::uuid, $2, $3, $4, true, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET
         bot_token = EXCLUDED.bot_token,
         chat_id = EXCLUDED.chat_id,
         bot_username = EXCLUDED.bot_username,
         is_active = true,
         updated_at = NOW()`,
      [userId, token, cid, uname || null],
    );
  }

  async getCredentials(userId: string): Promise<TelegramCredentials | null> {
    const rows = await this.db.query<{
      user_id: string;
      bot_token: string | null;
      chat_id: string | null;
      bot_username: string | null;
      is_active: boolean;
    }>(
      `SELECT user_id::text, bot_token, chat_id, bot_username, is_active
       FROM integration_telegram
       WHERE user_id = $1::uuid AND is_active = true
       LIMIT 1`,
      [userId],
    );
    const r = rows[0];
    if (!r || !r.bot_token || !r.chat_id) return null;
    return {
      userId: r.user_id,
      botToken: r.bot_token,
      chatId: r.chat_id,
      botUsername: r.bot_username ?? "",
      isActive: r.is_active,
    };
  }

  private async requireCredentials(userId: string): Promise<TelegramCredentials> {
    const c = await this.getCredentials(userId);
    if (!c) {
      throw new OsAgentError("Telegram no está conectado para este usuario.", "telegram_auth");
    }
    return c;
  }

  private async parseJsonResponse(res: Response): Promise<Record<string, unknown>> {
    const text = await res.text();
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      throw new OsAgentError(`Telegram devolvió no-JSON (HTTP ${res.status})`, "telegram_http");
    }
  }

  private assertTelegramOk(body: Record<string, unknown>, httpStatus: number): void {
    if (body.ok === true) return;
    const desc = typeof body.description === "string" ? body.description : JSON.stringify(body).slice(0, 400);
    throw new OsAgentError(`Telegram API error (HTTP ${httpStatus}): ${desc}`, "telegram_api");
  }

  private async telegramJsonPost(
    botToken: string,
    method: string,
    jsonBody: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    const url = `${botApiBase(botToken)}${method}`;
    const res = await this.fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(jsonBody),
    });
    const body = await this.parseJsonResponse(res);
    this.assertTelegramOk(body, res.status);
    return body;
  }

  private async telegramJsonGet(botToken: string, method: string): Promise<Record<string, unknown>> {
    const url = `${botApiBase(botToken)}${method}`;
    const res = await this.fetchImpl(url, { method: "GET" });
    const body = await this.parseJsonResponse(res);
    this.assertTelegramOk(body, res.status);
    return body;
  }

  private async insertTelegramMessage(
    userId: string,
    chatIdStr: string,
    content: string,
    messageId: number,
    status: string,
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO telegram_messages (user_id, chat_id, content, message_id, status)
       VALUES ($1::uuid, $2, $3, $4::int, $5)`,
      [userId, chatIdStr.trim(), content, messageId, status],
    );
  }

  private extractMessageId(result: unknown): number {
    if (result == null || typeof result !== "object") return NaN;
    const mid = (result as { message_id?: unknown }).message_id;
    if (typeof mid === "number" && Number.isFinite(mid)) return mid;
    return NaN;
  }

  async sendMessage(userId: string, text: string, chatId?: string): Promise<{ messageId: number }> {
    const bodyText = text.trim();
    if (!bodyText) {
      throw new OsAgentError("text es requerido.", "telegram_validation");
    }
    const c = await this.requireCredentials(userId);
    const targetChat = (chatId ?? c.chatId).trim();
    if (!targetChat) {
      throw new OsAgentError("chatId es requerido (integración o parámetro).", "telegram_validation");
    }
    const out = await this.telegramJsonPost(c.botToken, "sendMessage", {
      chat_id: targetChat,
      text: bodyText,
      parse_mode: "HTML",
    });
    const result = out.result;
    const mid = this.extractMessageId(result);
    if (!Number.isFinite(mid)) {
      throw new OsAgentError("Telegram no devolvió message_id.", "telegram_api");
    }
    await this.insertTelegramMessage(userId, targetChat, bodyText, mid, "sent");
    return { messageId: mid };
  }

  async sendBulkMessages(userId: string, chatIds: string[], text: string): Promise<BulkTelegramResult> {
    const results: Array<{ chatId: string; ok: boolean; messageId?: number; error?: string }> = [];
    let sent = 0;
    let failed = 0;
    for (const raw of chatIds) {
      const cid = String(raw ?? "").trim();
      if (!cid) continue;
      try {
        const { messageId } = await this.sendMessage(userId, text, cid);
        sent += 1;
        results.push({ chatId: cid, ok: true, messageId });
      } catch (e: unknown) {
        failed += 1;
        const errMsg = e instanceof OsAgentError ? e.message : e instanceof Error ? e.message : String(e);
        results.push({ chatId: cid, ok: false, error: errMsg });
      }
    }
    return { sent, failed, results };
  }

  async sendPhoto(userId: string, chatId: string, photoUrl: string, caption?: string): Promise<{ messageId: number }> {
    const cid = chatId.trim();
    const photo = photoUrl.trim();
    if (!cid || !photo) {
      throw new OsAgentError("chatId y photoUrl son requeridos.", "telegram_validation");
    }
    const c = await this.requireCredentials(userId);
    const payload: Record<string, unknown> = {
      chat_id: cid,
      photo,
    };
    const cap = caption?.trim();
    if (cap) payload.caption = cap;
    const out = await this.telegramJsonPost(c.botToken, "sendPhoto", payload);
    const mid = this.extractMessageId(out.result);
    if (!Number.isFinite(mid)) {
      throw new OsAgentError("Telegram no devolvió message_id.", "telegram_api");
    }
    const content = cap ? `[photo] ${photo}\n${cap}` : `[photo] ${photo}`;
    await this.insertTelegramMessage(userId, cid, content, mid, "sent");
    return { messageId: mid };
  }

  async getMessageHistory(userId: string, limit = 50): Promise<TelegramMessage[]> {
    const capped = Math.max(1, Math.min(limit, 500));
    const rows = await this.db.query<{
      id: string;
      user_id: string;
      chat_id: string | null;
      content: string | null;
      message_id: number | null;
      status: string;
      sent_at: Date | string;
    }>(
      `SELECT id::text, user_id::text, chat_id, content, message_id, status, sent_at
       FROM telegram_messages
       WHERE user_id = $1::uuid
       ORDER BY sent_at DESC
       LIMIT $2::int`,
      [userId, capped],
    );
    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      chatId: r.chat_id ?? "",
      content: r.content,
      messageId: r.message_id,
      status: r.status,
      sentAt: r.sent_at instanceof Date ? r.sent_at.toISOString() : String(r.sent_at),
    }));
  }

  async getBotInfo(userId: string): Promise<{ id: number; username: string; firstName: string }> {
    const c = await this.requireCredentials(userId);
    const out = await this.telegramJsonGet(c.botToken, "getMe");
    const result = out.result;
    if (result == null || typeof result !== "object") {
      throw new OsAgentError("Telegram getMe sin result.", "telegram_api");
    }
    const o = result as Record<string, unknown>;
    const id = typeof o.id === "number" ? o.id : Number(o.id);
    const username = typeof o.username === "string" ? o.username : "";
    const firstName = typeof o.first_name === "string" ? o.first_name : "";
    if (!Number.isFinite(id)) {
      throw new OsAgentError("Telegram getMe sin id válido.", "telegram_api");
    }
    return { id, username, firstName };
  }

  async revokeAccess(userId: string): Promise<void> {
    await this.db.query(`UPDATE integration_telegram SET is_active = false, updated_at = NOW() WHERE user_id = $1::uuid`, [
      userId,
    ]);
  }
}

let cachedTelegram: TelegramService | undefined;

export function getTelegramService(): TelegramService {
  if (!cachedTelegram) cachedTelegram = new TelegramService();
  return cachedTelegram;
}

export function resetTelegramServiceForTests(): void {
  cachedTelegram = undefined;
}
