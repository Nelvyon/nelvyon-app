import { DbClient } from "../db/DbClient";

import { decryptApiKey, encryptApiKey } from "./cryptoService";

export type ApiKeyProvider =
  | "openai"
  | "elevenlabs"
  | "heygen"
  | "runway"
  | "stability"
  | "anthropic"
  | "replicate";

const ALL_PROVIDERS: readonly ApiKeyProvider[] = [
  "openai",
  "elevenlabs",
  "heygen",
  "runway",
  "stability",
  "anthropic",
  "replicate",
];

export function isApiKeyProvider(value: string): value is ApiKeyProvider {
  return (ALL_PROVIDERS as readonly string[]).includes(value);
}

export async function saveApiKey(userId: string, provider: ApiKeyProvider, plainKey: string): Promise<void> {
  const db = DbClient.getInstance();
  const encrypted = encryptApiKey(plainKey);
  await db.query(
    `INSERT INTO api_keys (user_id, provider, encrypted_key, updated_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (user_id, provider) DO UPDATE SET
       encrypted_key = EXCLUDED.encrypted_key,
       updated_at = now()`,
    [userId, provider, encrypted],
  );
}

export async function getApiKey(userId: string, provider: ApiKeyProvider): Promise<string | null> {
  const db = DbClient.getInstance();
  const rows = await db.query<{ encrypted_key: string }>(
    `SELECT encrypted_key FROM api_keys
     WHERE user_id = $1 AND provider = $2`,
    [userId, provider],
  );
  const row = rows[0];
  if (!row) return null;
  try {
    return decryptApiKey(row.encrypted_key);
  } catch {
    return null;
  }
}

export async function deleteApiKey(userId: string, provider: ApiKeyProvider): Promise<void> {
  const db = DbClient.getInstance();
  await db.query(`DELETE FROM api_keys WHERE user_id = $1 AND provider = $2`, [userId, provider]);
}

export async function listUserProviders(userId: string): Promise<ApiKeyProvider[]> {
  const db = DbClient.getInstance();
  const rows = await db.query<{ provider: string }>(`SELECT provider FROM api_keys WHERE user_id = $1`, [userId]);
  return rows.map((r) => r.provider).filter((p): p is ApiKeyProvider => isApiKeyProvider(p));
}

export async function getEffectiveApiKey(userId: string, provider: ApiKeyProvider): Promise<string> {
  const userKey = await getApiKey(userId, provider);
  if (userKey) return userKey;
  const fallbacks: Record<ApiKeyProvider, string | undefined> = {
    openai: process.env.OPENAI_API_KEY,
    elevenlabs: process.env.ELEVENLABS_API_KEY,
    heygen: process.env.HEYGEN_API_KEY,
    runway: process.env.RUNWAY_API_KEY,
    stability: process.env.STABILITY_API_KEY,
    anthropic: process.env.ANTHROPIC_API_KEY,
    replicate: process.env.REPLICATE_API_KEY,
  };
  const fallback = fallbacks[provider];
  if (!fallback) throw new Error(`No API key available for provider: ${provider}`);
  return fallback;
}
