import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";
import { OsAgentError } from "../os-agents/OsAgentError";

const TWILIO_API_BASE = "https://api.twilio.com/2010-04-01";

export interface TwilioCredentials {
  userId: string;
  accountSid: string;
  authToken: string;
  fromNumber: string;
  isActive: boolean;
}

export interface TwilioMessage {
  id: string;
  userId: string;
  toNumber: string;
  messageType: string | null;
  content: string | null;
  twilioSid: string | null;
  status: string;
  sentAt: string;
}

export interface BulkSmsResult {
  sent: number;
  failed: number;
  results: ReadonlyArray<{
    recipient: string;
    ok: boolean;
    messageSid?: string;
    error?: string;
  }>;
}

export type TwilioServiceDeps = {
  db?: Pick<DbClient, "query">;
  fetchFn?: typeof fetch;
};

function basicAuthHeader(accountSid: string, authToken: string): string {
  return `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`;
}

export class TwilioService {
  constructor(private readonly deps: TwilioServiceDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  private get fetchImpl(): typeof fetch {
    return this.deps.fetchFn ?? globalThis.fetch.bind(globalThis);
  }

  async saveCredentials(userId: string, accountSid: string, authToken: string, fromNumber: string): Promise<void> {
    const sid = accountSid.trim();
    const token = authToken.trim();
    const from = fromNumber.trim();
    if (!sid || !token || !from) {
      throw new OsAgentError("accountSid, authToken y fromNumber son requeridos.", "twilio_validation");
    }
    await this.db.query(
      `INSERT INTO integration_twilio
         (user_id, account_sid, auth_token, from_number, is_active, updated_at)
       VALUES ($1::uuid, $2, $3, $4, true, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET
         account_sid = EXCLUDED.account_sid,
         auth_token = EXCLUDED.auth_token,
         from_number = EXCLUDED.from_number,
         is_active = true,
         updated_at = NOW()`,
      [userId, sid, token, from],
    );
  }

  async getCredentials(userId: string): Promise<TwilioCredentials | null> {
    const rows = await this.db.query<{
      user_id: string;
      account_sid: string | null;
      auth_token: string | null;
      from_number: string | null;
      is_active: boolean;
    }>(
      `SELECT user_id::text, account_sid, auth_token, from_number, is_active
       FROM integration_twilio
       WHERE user_id = $1::uuid AND is_active = true
       LIMIT 1`,
      [userId],
    );
    const r = rows[0];
    if (!r || !r.account_sid || !r.auth_token || !r.from_number) return null;
    return {
      userId: r.user_id,
      accountSid: r.account_sid,
      authToken: r.auth_token,
      fromNumber: r.from_number,
      isActive: r.is_active,
    };
  }

  private async requireCredentials(userId: string): Promise<TwilioCredentials> {
    const c = await this.getCredentials(userId);
    if (!c) {
      throw new OsAgentError("Twilio no está conectado para este usuario.", "twilio_auth");
    }
    return c;
  }

  private async parseJsonResponse(res: Response): Promise<Record<string, unknown>> {
    const text = await res.text();
    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      throw new OsAgentError(`Twilio devolvió no-JSON (HTTP ${res.status})`, "twilio_http");
    }
  }

  private async twilioPostForm(
    accountSid: string,
    authToken: string,
    resourcePath: string,
    params: URLSearchParams,
  ): Promise<Record<string, unknown>> {
    const url = `${TWILIO_API_BASE}/Accounts/${encodeURIComponent(accountSid)}/${resourcePath}`;
    const res = await this.fetchImpl(url, {
      method: "POST",
      headers: {
        Authorization: basicAuthHeader(accountSid, authToken),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const body = await this.parseJsonResponse(res);
    if (!res.ok) {
      const msg =
        typeof body.message === "string"
          ? body.message
          : typeof body.error_message === "string"
            ? body.error_message
            : JSON.stringify(body).slice(0, 400);
      throw new OsAgentError(`Twilio API error (HTTP ${res.status}): ${msg}`, "twilio_api");
    }
    return body;
  }

  private async insertTwilioMessage(
    userId: string,
    toNumber: string,
    messageType: string,
    content: string,
    twilioSid: string,
    status: string,
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO twilio_messages (user_id, to_number, message_type, content, twilio_sid, status)
       VALUES ($1::uuid, $2, $3, $4, $5, $6)`,
      [userId, toNumber.trim(), messageType, content, twilioSid, status],
    );
  }

  async sendSms(userId: string, to: string, body: string): Promise<{ messageSid: string }> {
    const toNum = to.trim();
    const bodyText = body.trim();
    if (!toNum || !bodyText) {
      throw new OsAgentError("to y body son requeridos.", "twilio_validation");
    }
    const c = await this.requireCredentials(userId);
    const params = new URLSearchParams();
    params.set("To", toNum);
    params.set("From", c.fromNumber.trim());
    params.set("Body", bodyText);
    const out = await this.twilioPostForm(c.accountSid, c.authToken, "Messages.json", params);
    const sid = typeof out.sid === "string" ? out.sid : "";
    const st = typeof out.status === "string" ? out.status : "queued";
    if (!sid) {
      throw new OsAgentError("Twilio no devolvió sid del mensaje.", "twilio_api");
    }
    await this.insertTwilioMessage(userId, toNum, "sms", bodyText, sid, st);
    return { messageSid: sid };
  }

  async sendBulkSms(userId: string, recipients: string[], body: string): Promise<BulkSmsResult> {
    const results: Array<{ recipient: string; ok: boolean; messageSid?: string; error?: string }> = [];
    let sent = 0;
    let failed = 0;
    for (const raw of recipients) {
      const recipient = String(raw ?? "").trim();
      if (!recipient) continue;
      try {
        const { messageSid } = await this.sendSms(userId, recipient, body);
        sent += 1;
        results.push({ recipient, ok: true, messageSid });
      } catch (e: unknown) {
        failed += 1;
        const errMsg = e instanceof OsAgentError ? e.message : e instanceof Error ? e.message : String(e);
        results.push({ recipient, ok: false, error: errMsg });
      }
    }
    return { sent, failed, results };
  }

  async makeCall(userId: string, to: string, twimlUrl: string): Promise<{ callSid: string }> {
    const toNum = to.trim();
    const url = twimlUrl.trim();
    if (!toNum || !url) {
      throw new OsAgentError("to y twimlUrl son requeridos.", "twilio_validation");
    }
    const c = await this.requireCredentials(userId);
    const params = new URLSearchParams();
    params.set("To", toNum);
    params.set("From", c.fromNumber.trim());
    params.set("Url", url);
    const out = await this.twilioPostForm(c.accountSid, c.authToken, "Calls.json", params);
    const sid = typeof out.sid === "string" ? out.sid : "";
    const st = typeof out.status === "string" ? out.status : "queued";
    if (!sid) {
      throw new OsAgentError("Twilio no devolvió sid de la llamada.", "twilio_api");
    }
    await this.insertTwilioMessage(userId, toNum, "call", url, sid, st);
    return { callSid: sid };
  }

  async getMessageHistory(userId: string, limit = 50): Promise<TwilioMessage[]> {
    const capped = Math.max(1, Math.min(limit, 500));
    const rows = await this.db.query<{
      id: string;
      user_id: string;
      to_number: string | null;
      message_type: string | null;
      content: string | null;
      twilio_sid: string | null;
      status: string;
      sent_at: Date | string;
    }>(
      `SELECT id::text, user_id::text, to_number, message_type, content, twilio_sid, status, sent_at
       FROM twilio_messages
       WHERE user_id = $1::uuid
       ORDER BY sent_at DESC
       LIMIT $2::int`,
      [userId, capped],
    );
    return rows.map((r) => ({
      id: r.id,
      userId: r.user_id,
      toNumber: r.to_number ?? "",
      messageType: r.message_type,
      content: r.content,
      twilioSid: r.twilio_sid,
      status: r.status,
      sentAt: r.sent_at instanceof Date ? r.sent_at.toISOString() : String(r.sent_at),
    }));
  }

  async getAccountBalance(userId: string): Promise<{ balance: string; currency: string }> {
    const c = await this.requireCredentials(userId);
    const balUrl = `${TWILIO_API_BASE}/Accounts/${encodeURIComponent(c.accountSid)}/Balance.json`;
    const res = await this.fetchImpl(balUrl, {
      method: "GET",
      headers: { Authorization: basicAuthHeader(c.accountSid, c.authToken) },
    });
    const body = await this.parseJsonResponse(res);
    if (!res.ok) {
      const msg =
        typeof body.message === "string"
          ? body.message
          : typeof body.error_message === "string"
            ? body.error_message
            : JSON.stringify(body).slice(0, 400);
      throw new OsAgentError(`Twilio Balance error (HTTP ${res.status}): ${msg}`, "twilio_api");
    }
    const balance =
      typeof body.balance === "string"
        ? body.balance
        : body.balance != null
          ? String(body.balance)
          : "0";
    const currency =
      typeof body.currency === "string"
        ? body.currency
        : typeof body.currency_code === "string"
          ? body.currency_code
          : "USD";
    return { balance, currency };
  }

  async revokeAccess(userId: string): Promise<void> {
    await this.db.query(`UPDATE integration_twilio SET is_active = false, updated_at = NOW() WHERE user_id = $1::uuid`, [
      userId,
    ]);
  }
}

let cachedTwilio: TwilioService | undefined;

export function getTwilioService(): TwilioService {
  if (!cachedTwilio) cachedTwilio = new TwilioService();
  return cachedTwilio;
}

export function resetTwilioServiceForTests(): void {
  cachedTwilio = undefined;
}
