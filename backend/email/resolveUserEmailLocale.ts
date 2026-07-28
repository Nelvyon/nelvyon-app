import type { DbClient } from "../db/DbClient";
import { resolveEmailLocale, type EmailLocale } from "./localeCopy";

/**
 * Resolve operational email locale from saas_client_profiles.language.
 * Falls back to es when missing/unsupported (backward compatible).
 */
export async function resolveUserEmailLocale(
  db: DbClient,
  userId: string,
): Promise<EmailLocale> {
  try {
    const rows = await db.query<{ language: string | null }>(
      `SELECT p.language
       FROM nelvyon_users u
       LEFT JOIN saas_client_profiles p
         ON p.tenant_id = u.tenant_id AND p.user_id = u.user_id::text
       WHERE u.user_id = $1::uuid
       LIMIT 1`,
      [userId],
    );
    return resolveEmailLocale(rows[0]?.language ?? null);
  } catch {
    return "es";
  }
}

export function dateLocaleTag(locale: EmailLocale): string {
  switch (locale) {
    case "en":
      return "en-US";
    case "fr":
      return "fr-FR";
    case "de":
      return "de-DE";
    case "it":
      return "it-IT";
    case "pt":
      return "pt-PT";
    default:
      return "es-ES";
  }
}
