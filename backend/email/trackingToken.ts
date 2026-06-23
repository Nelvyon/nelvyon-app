/**
 * HMAC-SHA256 tokens for email open/click tracking.
 * Token format: base64url(payload_json) + "." + base64url(hmac_sha256)
 * Secret from env TRACKING_SECRET (fallback to JWT_SECRET).
 */
import { createHmac, timingSafeEqual } from "crypto";

const SECRET = () => {
  const s = process.env.TRACKING_SECRET ?? process.env.JWT_SECRET;
  if (!s) throw new Error("TRACKING_SECRET or JWT_SECRET env var required");
  return s;
};

export type TrackingPayload = {
  /** tenant id */
  tid: string;
  /** campania id */
  cid: string;
  /** contact id (recipient) */
  rid: string;
  /** "o" = open, "c" = click */
  t: "o" | "c";
  /** destination URL (click only) */
  url?: string;
  /** expiry unix seconds */
  exp: number;
};

function b64url(s: string): string {
  return Buffer.from(s, "utf8").toString("base64url");
}

function fromB64url(s: string): string {
  return Buffer.from(s, "base64url").toString("utf8");
}

export function signTrackingToken(payload: Omit<TrackingPayload, "exp">): string {
  const full: TrackingPayload = { ...payload, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 }; // 30 days
  const data = b64url(JSON.stringify(full));
  const sig = createHmac("sha256", SECRET()).update(data).digest("base64url");
  return `${data}.${sig}`;
}

export type VerifyResult =
  | { ok: true; payload: TrackingPayload }
  | { ok: false; error: string };

export function verifyTrackingToken(token: string): VerifyResult {
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
  let payload: TrackingPayload;
  try {
    payload = JSON.parse(fromB64url(data)) as TrackingPayload;
  } catch {
    return { ok: false, error: "invalid payload" };
  }
  if (payload.exp < Math.floor(Date.now() / 1000)) return { ok: false, error: "expired" };
  return { ok: true, payload };
}
