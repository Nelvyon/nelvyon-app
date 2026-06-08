/** Phase N — service account JWT for GA4 Data API (read-only, isolated) */

import { createSign } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/analytics.readonly";

interface ServiceAccountJson {
  client_email: string;
  private_key: string;
}

function base64url(input: string | Buffer): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function readServiceAccount(path: string): ServiceAccountJson | null {
  if (!path || !existsSync(path)) return null;
  try {
    const raw = JSON.parse(readFileSync(path, "utf-8")) as ServiceAccountJson;
    if (!raw.client_email || !raw.private_key) return null;
    return raw;
  } catch {
    return null;
  }
}

async function exchangeJwtForAccessToken(
  creds: ServiceAccountJson,
  fetchFn: typeof fetch = fetch,
): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64url(
    JSON.stringify({
      iss: creds.client_email,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsigned = `${header}.${claim}`;
  const sign = createSign("RSA-SHA256");
  sign.update(unsigned);
  sign.end();
  const signature = base64url(sign.sign(creds.private_key));
  const jwt = `${unsigned}.${signature}`;

  try {
    const res = await fetchFn(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { access_token?: string };
    return json.access_token ?? null;
  } catch {
    return null;
  }
}

export async function getGa4AccessTokenFromServiceAccount(
  credentialsPath?: string,
  fetchFn: typeof fetch = fetch,
): Promise<string | null> {
  const path = (credentialsPath ?? process.env.GOOGLE_APPLICATION_CREDENTIALS ?? "").trim();
  const creds = readServiceAccount(path);
  if (!creds) return null;
  return exchangeJwtForAccessToken(creds, fetchFn);
}
