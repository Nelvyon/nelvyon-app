/**
 * Tenant-scoped SMS service.
 * Wraps TwilioService using env-level credentials (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_NUMBER).
 * Falls back to a clear error if Twilio is not configured — never silently drops messages.
 */
import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";

export interface SmsSendResult {
  to: string;
  ok: boolean;
  messageSid?: string;
  error?: string;
}

export interface SaasSmsConfigured {
  configured: boolean;
  fromNumber: string | null;
}

export class SaasSmsError extends Error {
  constructor(
    message: string,
    public readonly code: "NOT_CONFIGURED" | "SEND_FAILED" | "VALIDATION",
  ) {
    super(message);
    this.name = "SaasSmsError";
  }
}

function getEnvCredentials(): { accountSid: string; authToken: string; fromNumber: string } | null {
  const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const authToken = process.env.TWILIO_AUTH_TOKEN?.trim();
  const fromNumber = process.env.TWILIO_FROM_NUMBER?.trim();
  if (!accountSid || !authToken || !fromNumber) return null;
  return { accountSid, authToken, fromNumber };
}

async function twilioSend(
  accountSid: string,
  authToken: string,
  from: string,
  to: string,
  body: string,
  fetchImpl: typeof fetch = globalThis.fetch.bind(globalThis),
): Promise<string> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`;
  const params = new URLSearchParams({ To: to, From: from, Body: body });
  const res = await fetchImpl(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const msg = typeof json.message === "string" ? json.message : `HTTP ${res.status}`;
    throw new SaasSmsError(`Twilio error: ${msg}`, "SEND_FAILED");
  }
  if (typeof json.sid !== "string") throw new SaasSmsError("Twilio did not return sid", "SEND_FAILED");
  return json.sid;
}

export class SaasSmsService {
  constructor(
    private readonly db: SaasPostgresPort = DbClient.getInstance(),
    private readonly fetchImpl: typeof fetch = globalThis.fetch.bind(globalThis),
  ) {}

  getStatus(): SaasSmsConfigured {
    const creds = getEnvCredentials();
    return { configured: Boolean(creds), fromNumber: creds?.fromNumber ?? null };
  }

  async send(tenantId: string, to: string, body: string): Promise<SmsSendResult> {
    const toNum = to.trim();
    const bodyText = body.trim();
    if (!toNum) throw new SaasSmsError("to is required", "VALIDATION");
    if (!bodyText) throw new SaasSmsError("body is required", "VALIDATION");
    const creds = getEnvCredentials();
    if (!creds) throw new SaasSmsError("Twilio not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER.", "NOT_CONFIGURED");
    try {
      const sid = await twilioSend(creds.accountSid, creds.authToken, creds.fromNumber, toNum, bodyText, this.fetchImpl);
      await this.logSms(tenantId, toNum, bodyText, sid, "sent");
      return { to: toNum, ok: true, messageSid: sid };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      await this.logSms(tenantId, toNum, bodyText, null, "failed").catch(() => null);
      return { to: toNum, ok: false, error: msg };
    }
  }

  async sendBulk(tenantId: string, recipients: string[], body: string): Promise<{ sent: number; failed: number; results: SmsSendResult[] }> {
    const creds = getEnvCredentials();
    if (!creds) throw new SaasSmsError("Twilio not configured.", "NOT_CONFIGURED");
    const results: SmsSendResult[] = [];
    let sent = 0;
    let failed = 0;
    for (const to of recipients) {
      const r = await this.send(tenantId, to, body);
      results.push(r);
      if (r.ok) sent++; else failed++;
    }
    return { sent, failed, results };
  }

  private async logSms(tenantId: string, to: string, body: string, sid: string | null, status: string): Promise<void> {
    await this.db.query(
      `INSERT INTO saas_sms_log (tenant_id, to_number, body, twilio_sid, status, created_at)
       VALUES ($1,$2,$3,$4,$5,NOW())
       ON CONFLICT DO NOTHING`,
      [tenantId, to, body.slice(0, 1600), sid, status],
    ).catch(() => null);
  }
}

let _instance: SaasSmsService | null = null;
export function getSaasSmsService(): SaasSmsService {
  if (!_instance) _instance = new SaasSmsService();
  return _instance;
}
export function resetSaasSmsServiceForTests(): void { _instance = null; }
