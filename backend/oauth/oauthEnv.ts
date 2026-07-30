/**
 * Shared OAuth env + redirect helpers (Phase 2).
 * Prefer NEXT_PUBLIC_APP_URL; default host is the product canonical app.nelvyon.com.
 * Never invent credentials — only read env.
 */

export function oauthAppBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  const raw =
    env.NEXT_PUBLIC_APP_URL?.trim() ||
    env.NEXTAUTH_URL?.trim() ||
    "https://app.nelvyon.com";
  return raw.replace(/\/$/, "");
}

/** Default redirect when *_REDIRECT_URI is unset. */
export function defaultOAuthRedirectUri(
  path: string,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${oauthAppBaseUrl(env)}${normalized}`;
}

/** First non-empty env among aliases. */
export function firstEnv(
  aliases: readonly string[],
  env: NodeJS.ProcessEnv = process.env,
): string {
  for (const key of aliases) {
    const v = env[key]?.trim();
    if (v) return v;
  }
  return "";
}

export const META_ID_ALIASES = ["META_APP_ID", "META_CLIENT_ID"] as const;
export const META_SECRET_ALIASES = ["META_APP_SECRET", "META_CLIENT_SECRET"] as const;
export const TIKTOK_ID_ALIASES = ["TIKTOK_APP_ID", "TIKTOK_CLIENT_ID", "TIKTOK_CLIENT_KEY"] as const;
export const TIKTOK_SECRET_ALIASES = [
  "TIKTOK_APP_SECRET",
  "TIKTOK_CLIENT_SECRET",
] as const;

export function metaOAuthAppId(env: NodeJS.ProcessEnv = process.env): string {
  return firstEnv(META_ID_ALIASES, env);
}

export function metaOAuthAppSecret(env: NodeJS.ProcessEnv = process.env): string {
  return firstEnv(META_SECRET_ALIASES, env);
}

export function tiktokOAuthAppId(env: NodeJS.ProcessEnv = process.env): string {
  return firstEnv(TIKTOK_ID_ALIASES, env);
}

export function tiktokOAuthAppSecret(env: NodeJS.ProcessEnv = process.env): string {
  return firstEnv(TIKTOK_SECRET_ALIASES, env);
}

/** True when every entry is set; entries may be "A|B" meaning either alias. */
export function isAliasedEnvConfigured(
  keys: readonly string[],
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (keys.length === 0) return true;
  return keys.every((spec) => {
    const aliases = spec.split("|").map((s) => s.trim()).filter(Boolean);
    return aliases.some((k) => Boolean(env[k]?.trim()));
  });
}

export function missingAliasedEnvKeys(
  keys: readonly string[],
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  return keys.filter((spec) => {
    const aliases = spec.split("|").map((s) => s.trim()).filter(Boolean);
    return !aliases.some((k) => Boolean(env[k]?.trim()));
  });
}

export function missingGoogleOAuthEnvKeys(env: NodeJS.ProcessEnv = process.env): string[] {
  return missingAliasedEnvKeys(["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"], env);
}

export function missingMetaOAuthEnvKeys(env: NodeJS.ProcessEnv = process.env): string[] {
  return missingAliasedEnvKeys(
    ["META_APP_ID|META_CLIENT_ID", "META_APP_SECRET|META_CLIENT_SECRET"],
    env,
  );
}

export function missingLinkedInOAuthEnvKeys(env: NodeJS.ProcessEnv = process.env): string[] {
  return missingAliasedEnvKeys(["LINKEDIN_CLIENT_ID", "LINKEDIN_CLIENT_SECRET"], env);
}

export function missingWhatsAppCloudEnvKeys(env: NodeJS.ProcessEnv = process.env): string[] {
  const missing: string[] = [];
  if (!env.META_WA_PHONE_NUMBER_ID?.trim()) missing.push("META_WA_PHONE_NUMBER_ID");
  if (!env.META_WA_ACCESS_TOKEN?.trim()) missing.push("META_WA_ACCESS_TOKEN");
  if (!env.META_WA_VERIFY_TOKEN?.trim()) missing.push("META_WA_VERIFY_TOKEN");
  if (!env.META_WA_APP_SECRET?.trim()) missing.push("META_WA_APP_SECRET");
  return missing;
}

export function isWhatsAppCloudEnvConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return missingWhatsAppCloudEnvKeys(env).length === 0;
}
