import { createHash } from "node:crypto";

import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientSingleton } from "../db/DbClient";
import { sendEmail } from "../email/emailService";
import { cancelSubscriptionImmediately } from "../stripe/stripeApi";

const EXPORT_COOLDOWN_HOURS = 24;
const RETAIN_AGENT_DAYS = 30;
const DELETED_EMAIL_DOMAIN = "deleted.nelvyon.com";

/** Metadatos de claves sin secret/hash (solo portabilidad / acceso). */
export type ApiKeyExportRow = {
  id: unknown;
  user_id: unknown;
  provider: unknown;
  created_at: unknown;
  updated_at: unknown;
};

export type UserDataExport = {
  exportedAt: string;
  userId: string;
  tenantId: string | null;
  nelvyon_users: Record<string, unknown> | null;
  subscriptions: unknown[];
  os_jobs: unknown[];
  os_job_results: unknown[];
  /** Tablas sectoriales *\_results con columna tenant_id o client_id. */
  agent_results_by_table: Record<string, unknown[]>;
  usage_events: unknown[];
  /** Uso de API pública SaaS (si existe). */
  saas_api_usage: unknown[];
  dunning_log: unknown[];
  api_keys: ApiKeyExportRow[];
  onboarding: unknown | null;
};

export class DataSubjectService {
  constructor(private readonly db: DbClient) {}

  static getInstance(): DataSubjectService {
    return new DataSubjectService(DbClientSingleton.getInstance());
  }

  async assertExportAllowed(userId: string): Promise<void> {
    const rows = await this.db.query<{ data_export_requested_at: string | null }>(
      `SELECT data_export_requested_at FROM nelvyon_users WHERE user_id = $1 LIMIT 1`,
      [userId],
    );
    const last = rows[0]?.data_export_requested_at;
    if (!last) return;
    const elapsed = Date.now() - new Date(last).getTime();
    if (elapsed < EXPORT_COOLDOWN_HOURS * 60 * 60 * 1000) {
      throw new Error(
        `EXPORT_COOLDOWN: Solo puedes exportar tus datos una vez cada ${EXPORT_COOLDOWN_HOURS} horas.`,
      );
    }
  }

  async markExportRequested(userId: string): Promise<void> {
    await this.db.query(
      `UPDATE nelvyon_users SET data_export_requested_at = now(), updated_at = now() WHERE user_id = $1`,
      [userId],
    );
  }

  async exportUserData(userId: string): Promise<UserDataExport> {
    const users = await this.db.query<Record<string, unknown>>(
      `SELECT * FROM nelvyon_users WHERE user_id = $1 LIMIT 1`,
      [userId],
    );
    const profile = users[0] ?? null;
    const masked = profile ? redactUserRow(profile) : null;
    const tenantId = typeof profile?.tenant_id === "string" ? profile.tenant_id : null;

    const subscriptions = await this.db.query(
      `SELECT * FROM subscriptions WHERE user_id::text = $1 ORDER BY created_at`,
      [userId],
    );

    const usage_events = await this.db.query(
      `SELECT * FROM usage_events WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10000`,
      [userId],
    );

    const dunning = tenantId
      ? await this.db.query(`SELECT * FROM dunning_log WHERE tenant_id = $1 ORDER BY created_at DESC`, [tenantId])
      : [];

    const apiKeys = await this.db.query<ApiKeyExportRow>(
      `SELECT id, user_id, provider, created_at, updated_at FROM api_keys WHERE user_id = $1`,
      [userId],
    );

    const onboardingRows = await this.db.query(`SELECT * FROM onboarding WHERE user_id = $1 LIMIT 1`, [userId]);

    let os_jobs: unknown[] = [];
    let os_job_results: unknown[] = [];
    if (tenantId) {
      os_jobs = await this.db.query(
        `SELECT * FROM os_jobs WHERE client_id = $1 ORDER BY created_at DESC LIMIT 5000`,
        [tenantId],
      );
      os_job_results = await this.db.query(
        `SELECT * FROM os_job_results WHERE tenant_id = $1 OR client_id = $1 ORDER BY created_at DESC LIMIT 5000`,
        [tenantId],
      );
    }

    const saas_api_usage =
      tenantId || userId
        ? await tryQuery(
            this.db,
            `SELECT u.*
             FROM saas_api_usage u
             INNER JOIN saas_api_keys k ON k.id = u.api_key_id
             WHERE k.user_id::text = $1
             ORDER BY u.created_at DESC
             LIMIT 5000`,
            [userId],
          )
        : [];

    const agent_results_by_table: Record<string, unknown[]> = {};
    if (tenantId) {
      const tables = await this.listResultTablesWithTenantOrClient();
      for (const t of tables) {
        if (t === "os_job_results") continue;
        try {
          const cols = await this.db.query<{ column_name: string }>(
            `SELECT column_name FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = $1`,
            [t],
          );
          const names = new Set(cols.map((c) => c.column_name));
          const conditions: string[] = [];
          const params: unknown[] = [];
          if (names.has("tenant_id")) {
            params.push(tenantId);
            conditions.push(`tenant_id = $${params.length}`);
          }
          if (names.has("client_id")) {
            params.push(tenantId);
            conditions.push(`client_id = $${params.length}`);
          }
          if (conditions.length === 0) continue;
          const sql = `SELECT * FROM "${t}" WHERE (${conditions.join(" OR ")}) ORDER BY created_at DESC NULLS LAST LIMIT 500`;
          const rows = await this.db.query(sql, params);
          if (rows.length > 0) agent_results_by_table[t] = rows;
        } catch {
          /* skip missing / incompatible */
        }
      }
    }

    return {
      exportedAt: new Date().toISOString(),
      userId,
      tenantId,
      nelvyon_users: masked,
      subscriptions,
      os_jobs,
      os_job_results,
      agent_results_by_table,
      usage_events,
      saas_api_usage,
      dunning_log: dunning,
      api_keys: apiKeys,
      onboarding: onboardingRows[0] ?? null,
    };
  }

  private async listResultTablesWithTenantOrClient(): Promise<string[]> {
    const cols = await this.db.query<{ table_name: string }>(
      `SELECT DISTINCT table_name::text AS table_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND (column_name = 'tenant_id' OR column_name = 'client_id')`,
    );
    const cand = cols.map((r) => r.table_name).filter((t) => t.endsWith("_results"));
    const bases = await this.db.query<{ table_name: string }>(
      `SELECT table_name::text AS table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`,
    );
    const base = new Set(bases.map((b) => b.table_name));
    return cand.filter((t) => base.has(t));
  }

  async scheduleDataDeletion(userId: string, daysFromNow: number): Promise<void> {
    const days =
      typeof daysFromNow === "number" && Number.isFinite(daysFromNow) && daysFromNow > 0 ? daysFromNow : 30;
    await this.db.query(
      `UPDATE nelvyon_users
       SET scheduled_deletion_at = now() + ($2::bigint * interval '1 day'),
           deletion_requested_at = COALESCE(deletion_requested_at, now()),
           updated_at = now()
       WHERE user_id = $1`,
      [userId, days],
    );
  }

  /** userIds listos para que un cron ejecute eliminación (programada). */
  async getPendingDeletions(): Promise<string[]> {
    const rows = await this.db.query<{ user_id: string }>(
      `SELECT user_id FROM nelvyon_users
       WHERE scheduled_deletion_at IS NOT NULL
         AND scheduled_deletion_at <= now()
         AND deleted_at IS NULL`,
    );
    return rows.map((r) => r.user_id);
  }

  async deleteUserData(userId: string): Promise<void> {
    const users = await this.db.query<{ email: string; full_name: string; tenant_id: string }>(
      `SELECT email, full_name, tenant_id FROM nelvyon_users WHERE user_id = $1 LIMIT 1`,
      [userId],
    );
    const u = users[0];
    if (!u) return;

    const emailHash = createHash("sha256").update(userId).digest("hex").slice(0, 16);
    const anonEmail = `user_${emailHash}@${DELETED_EMAIL_DOMAIN}`;
    const deadPassword = createHash("sha256").update(`${userId}:deleted:${Date.now()}`).digest("hex");

    await this.tryCancelStripeSubscription(userId);

    await this.db.query(`DELETE FROM api_keys WHERE user_id = $1`, [userId]);
    await tryQuery(this.db, `DELETE FROM saas_api_keys WHERE user_id::text = $1`, [userId]);
    await tryExec(this.db, `DELETE FROM onboarding WHERE user_id = $1`, [userId]);

    await tryExec(this.db, `UPDATE os_job_results SET scheduled_deletion_at = COALESCE(scheduled_deletion_at, now() + ($2::bigint * interval '1 day')) WHERE tenant_id = $1 OR client_id = $1`, [
      u.tenant_id,
      RETAIN_AGENT_DAYS,
    ]);
    await tryExec(this.db, `UPDATE os_jobs SET scheduled_deletion_at = COALESCE(scheduled_deletion_at, now() + ($2::bigint * interval '1 day')) WHERE client_id = $1`, [
      u.tenant_id,
      RETAIN_AGENT_DAYS,
    ]);

    await this.db.query(
      `UPDATE nelvyon_users SET
        deleted_at = now(),
        anonymized_at = now(),
        email = $2,
        full_name = 'Usuario eliminado',
        password_hash = $3,
        email_verification_token = NULL,
        email_verification_expires = NULL,
        cancellation_feedback = NULL,
        plan = 'suspended',
        updated_at = now()
       WHERE user_id = $1`,
      [userId, anonEmail, deadPassword],
    );

    await tryExec(this.db, `UPDATE subscriptions SET status = 'canceled', updated_at = now() WHERE user_id::text = $1`, [
      userId,
    ]);

    await this.sendDeletionEmail(u.email, u.full_name ?? "Usuario");
  }

  private async tryCancelStripeSubscription(userId: string): Promise<void> {
    try {
      if (!process.env.STRIPE_SECRET_KEY?.trim() && !process.env.STRIPE_API_KEY?.trim()) return;
      const rows = await this.db.query<{ stripe_subscription_id: string | null }>(
        `SELECT COALESCE(stripe_subscription_id, paddle_subscription_id) AS stripe_subscription_id
         FROM subscriptions
         WHERE user_id::text = $1
           AND COALESCE(stripe_subscription_id, paddle_subscription_id) IS NOT NULL
         LIMIT 1`,
        [userId],
      );
      const sid = rows[0]?.stripe_subscription_id;
      if (!sid) return;
      await cancelSubscriptionImmediately(sid);
    } catch (e) {
      console.warn("[DataSubjectService] Stripe cancel skipped:", e);
    }
  }

  private async sendDeletionEmail(originalEmail: string, name: string): Promise<void> {
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? "https://nelvyon.com";
      await sendEmail("account_deleted", {
        email: originalEmail,
        name: name || "Usuario",
        appUrl,
        summary:
          "Tu perfil ha sido anonimizado y el acceso desactivado. Los resultados de agentes marcados pasan a retención de 30 días antes de su eliminación. Los datos relativos a facturación se conservan el plazo legal sin vincularse a tu cuenta activa.",
      });
    } catch (e) {
      console.warn("[DataSubjectService] deletion email skipped:", e);
    }
  }
}

function redactUserRow(row: Record<string, unknown>): Record<string, unknown> {
  const { password_hash: _pw, ...rest } = row;
  return { ...rest, password_hash: "[REDACTED]" };
}

async function tryQuery(db: DbClient, sql: string, params: unknown[]): Promise<unknown[]> {
  try {
    return await db.query(sql, params);
  } catch {
    return [];
  }
}

async function tryExec(db: DbClient, sql: string, params: unknown[]): Promise<void> {
  try {
    await db.query(sql, params);
  } catch {
    /* table/column puede no existir en entornos antiguos */
  }
}
