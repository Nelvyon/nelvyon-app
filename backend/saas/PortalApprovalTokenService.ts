/**
 * HMAC tokens for portal one-click approve/reject (no login).
 */
import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";

const SECRET = () => {
  const s = process.env.TRACKING_SECRET ?? process.env.JWT_SECRET;
  if (!s) throw new Error("TRACKING_SECRET or JWT_SECRET env var required");
  return s;
};

export type PortalApprovalPayload = {
  did: string; // deliverable_id
  wid: number; // workspace_id
  cid: string; // client_id
  act: "approve" | "reject";
  exp: number;
};

function b64url(s: string): string {
  return Buffer.from(s, "utf8").toString("base64url");
}

function fromB64url(s: string): string {
  return Buffer.from(s, "base64url").toString("utf8");
}

export function signPortalApprovalToken(
  payload: Omit<PortalApprovalPayload, "exp">,
  ttlDays = 14,
): string {
  const full: PortalApprovalPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + ttlDays * 24 * 60 * 60,
  };
  const data = b64url(JSON.stringify(full));
  const sig = createHmac("sha256", SECRET()).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export type VerifyPortalResult =
  | { ok: true; payload: PortalApprovalPayload }
  | { ok: false; error: string };

export function verifyPortalApprovalToken(token: string): VerifyPortalResult {
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { ok: false, error: "malformed" };
  const [data, sig] = parts as [string, string];
  const expected = createHmac("sha256", SECRET()).update(data).digest("base64url");
  try {
    if (!timingSafeEqual(Buffer.from(sig, "base64url"), Buffer.from(expected, "base64url"))) {
      return { ok: false, error: "invalid signature" };
    }
  } catch {
    return { ok: false, error: "invalid signature" };
  }
  let payload: PortalApprovalPayload;
  try {
    payload = JSON.parse(fromB64url(data)) as PortalApprovalPayload;
  } catch {
    return { ok: false, error: "invalid payload" };
  }
  if (payload.exp < Math.floor(Date.now() / 1000)) return { ok: false, error: "expired" };
  return { ok: true, payload };
}

export function hashApprovalToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateTokenId(): string {
  return randomBytes(16).toString("hex");
}

export async function createPortalApprovalLinks(params: {
  deliverableId: string;
  workspaceId: number;
  clientId: string;
  baseUrl: string;
}): Promise<{ approveUrl: string; rejectUrl: string }> {
  const { DbClient } = await import("../db/DbClient");
  const db = DbClient.getInstance();
  const approveToken = signPortalApprovalToken({
    did: params.deliverableId,
    wid: params.workspaceId,
    cid: params.clientId,
    act: "approve",
  });
  const rejectToken = signPortalApprovalToken({
    did: params.deliverableId,
    wid: params.workspaceId,
    cid: params.clientId,
    act: "reject",
  });
  for (const [token, action] of [[approveToken, "approve"], [rejectToken, "reject"]] as const) {
    await db.query(
      `INSERT INTO os_deliverable_approval_tokens (token_hash, deliverable_id, workspace_id, client_id, action, expires_at)
       VALUES ($1, $2::uuid, $3, $4::uuid, $5, NOW() + INTERVAL '14 days')`,
      [hashApprovalToken(token), params.deliverableId, params.workspaceId, params.clientId, action],
    ).catch(() => {});
  }
  return {
    approveUrl: `${params.baseUrl}/portal/approve/${encodeURIComponent(approveToken)}`,
    rejectUrl: `${params.baseUrl}/portal/approve/${encodeURIComponent(rejectToken)}?action=reject`,
  };
}
