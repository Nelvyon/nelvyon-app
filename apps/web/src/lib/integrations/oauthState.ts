import { createHmac, timingSafeEqual } from "node:crypto";
import { requireHmacSecret } from "../../../../../backend/saas/hmacSecret";

const MAX_AGE_MS = 10 * 60 * 1000;

function oauthSecret(): string {
  return requireHmacSecret();
}

type OAuthStatePayload = { userId: string; ts: number };

function signPayload(payload: OAuthStatePayload): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", oauthSecret()).update(data).digest("base64url");
  return `${data}.${sig}`;
}

/** Create HMAC-signed OAuth state (binds flow to authenticated user). */
export function createOAuthState(userId: string): string {
  return signPayload({ userId, ts: Date.now() });
}

/** Verify signature + expiry; returns null if invalid or expired. */
export function parseOAuthState(state: string | null): OAuthStatePayload | null {
  if (!state) return null;
  const parts = state.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;

  const [data, sig] = parts as [string, string];
  let secret: string;
  try {
    secret = oauthSecret();
  } catch {
    return null;
  }

  const expected = createHmac("sha256", secret).update(data).digest("base64url");
  try {
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  } catch {
    return null;
  }

  let payload: OAuthStatePayload;
  try {
    payload = JSON.parse(Buffer.from(data, "base64url").toString("utf8")) as OAuthStatePayload;
  } catch {
    return null;
  }

  if (!payload.userId || typeof payload.ts !== "number") return null;
  if (Date.now() - payload.ts > MAX_AGE_MS) return null;
  return payload;
}
