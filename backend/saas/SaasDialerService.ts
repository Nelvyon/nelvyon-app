/**
 * SaasDialerService — Twilio Programmable Voice click-to-call.
 *
 * Env vars (shared with SMS):
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_FROM_NUMBER   — E.164 caller ID registered in Twilio
 *   TWILIO_TWIML_URL     — optional: TwiML webhook; fallback: inline <Say> greeting
 */
import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";

export class SaasDialerError extends Error {
  constructor(message: string, public readonly code: "NOT_CONFIGURED" | "CALL_FAILED" | "VALIDATION") {
    super(message);
    this.name = "SaasDialerError";
  }
}

export type DialerConfig = {
  configured: boolean;
  fromNumber: string | null;
};

export type CallRecord = {
  id: string;
  tenantId: string;
  to: string;
  message: string;
  callSid: string | null;
  status: "initiated" | "failed";
  contactId: string | null;
  createdAt: string;
};

export type InitiateCallInput = {
  to: string;
  message?: string;
  contactId?: string | null;
};

type ActivityRow = {
  id: string;
  tenant_id: string;
  contact_id: string | null;
  description: string;
  created_at: Date;
};

function getDialerCreds(): { accountSid: string; authToken: string; fromNumber: string } | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken  = process.env.TWILIO_AUTH_TOKEN?.trim();
  const fromNumber = process.env.TWILIO_FROM_NUMBER?.trim();
  if (!accountSid || !authToken || !fromNumber) return null;
  return { accountSid, authToken, fromNumber };
}

async function twilioInitiateCall(
  accountSid: string,
  authToken: string,
  from: string,
  to: string,
  messageOrUrl: string,
  fetchFn: typeof fetch = fetch,
): Promise<string> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Calls.json`;
  const twimlUrl = process.env.TWILIO_TWIML_URL?.trim();
  const params = new URLSearchParams({ To: to, From: from });
  if (twimlUrl) {
    params.set("Url", twimlUrl);
  } else {
    const safe = messageOrUrl.replace(/[<>&"]/g, "").slice(0, 200) || "Llamada de Nelvyon.";
    params.set("Twiml", `<Response><Say language="es-ES">${safe}</Say></Response>`);
  }
  const res = await fetchFn(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
    },
    body: params.toString(),
  });
  const data = await res.json() as { sid?: string; message?: string; code?: number };
  if (!res.ok) throw new SaasDialerError(`Twilio call error: ${data.message ?? "unknown"}`, "CALL_FAILED");
  return data.sid ?? "";
}

function parseCallRow(row: ActivityRow): CallRecord {
  let parsed: Record<string, unknown> = {};
  try { parsed = JSON.parse(row.description) as Record<string, unknown>; } catch { /* */ }
  return {
    id: row.id,
    tenantId: row.tenant_id,
    to: typeof parsed.to === "string" ? parsed.to : "?",
    message: typeof parsed.message === "string" ? parsed.message : "",
    callSid: typeof parsed.callSid === "string" ? parsed.callSid : null,
    status: parsed.status === "failed" ? "failed" : "initiated",
    contactId: row.contact_id,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export class SaasDialerService {
  constructor(
    private readonly db: SaasPostgresPort = DbClient.getInstance(),
    private readonly fetchFn: typeof fetch = fetch,
  ) {}

  getConfig(): DialerConfig {
    const creds = getDialerCreds();
    return { configured: creds !== null, fromNumber: creds?.fromNumber ?? null };
  }

  async initiateCall(tenantId: string, input: InitiateCallInput): Promise<CallRecord> {
    const to = input.to.trim();
    if (!to) throw new SaasDialerError("to is required", "VALIDATION");

    const creds = getDialerCreds();
    if (!creds) {
      throw new SaasDialerError(
        "Dialer not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER.",
        "NOT_CONFIGURED",
      );
    }

    const message = input.message?.trim() ?? "Llamada desde Nelvyon.";
    let callSid: string | null = null;
    let status: "initiated" | "failed" = "initiated";
    try {
      callSid = await twilioInitiateCall(
        creds.accountSid, creds.authToken, creds.fromNumber, to, message, this.fetchFn,
      );
    } catch {
      status = "failed";
    }

    const description = JSON.stringify({ to, message, callSid, status });
    const rows = await this.db.query<ActivityRow>(
      `INSERT INTO saas_contact_activities
         (contact_id, tenant_id, activity_type, description, scheduled_at, completed)
       VALUES ($1,$2,'call',$3,NULL,TRUE)
       RETURNING id, contact_id, tenant_id, activity_type, description, scheduled_at, completed, created_at`,
      [input.contactId ?? null, tenantId, description],
    );
    const row = rows[0];
    if (!row) throw new SaasDialerError("Failed to log call", "CALL_FAILED");
    if (status === "failed") throw new SaasDialerError("Call initiation failed (logged)", "CALL_FAILED");
    return parseCallRow(row);
  }

  async listCalls(tenantId: string, opts?: { limit?: number; contactId?: string }): Promise<CallRecord[]> {
    const limit = Math.min(opts?.limit ?? 50, 200);
    let rows: ActivityRow[];
    if (opts?.contactId) {
      rows = await this.db.query<ActivityRow>(
        `SELECT id, contact_id, tenant_id, description, created_at
         FROM saas_contact_activities
         WHERE tenant_id=$1 AND activity_type='call' AND contact_id=$2
         ORDER BY created_at DESC LIMIT $3`,
        [tenantId, opts.contactId, limit],
      );
    } else {
      rows = await this.db.query<ActivityRow>(
        `SELECT id, contact_id, tenant_id, description, created_at
         FROM saas_contact_activities
         WHERE tenant_id=$1 AND activity_type='call'
         ORDER BY created_at DESC LIMIT $2`,
        [tenantId, limit],
      );
    }
    return rows.map(parseCallRow);
  }
}

let _instance: SaasDialerService | null = null;
export function getSaasDialerService(): SaasDialerService {
  if (!_instance) _instance = new SaasDialerService();
  return _instance;
}
export function resetSaasDialerServiceForTests(): void { _instance = null; }
