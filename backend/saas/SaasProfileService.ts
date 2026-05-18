import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";
import { logger } from "../os-agents/cron/logger";

export interface ClientProfile {
  userId: string;
  tenantId: string;
  fullName: string;
  company: string;
  website?: string;
  phone?: string;
  sector?: string;
  timezone?: string;
  language?: string;
  updatedAt: string;
}

export interface ProfileChangeLog {
  id: string;
  userId: string;
  field: string;
  oldValue: string | null;
  newValue: string | null;
  changedAt: string;
}

export type SaasProfileServiceDeps = {
  db?: Pick<DbClient, "query">;
};

export class SaasProfileService {
  constructor(private readonly deps: SaasProfileServiceDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  async getProfile(userId: string, tenantId: string): Promise<ClientProfile | null> {
    const rows = await this.db.query<ClientProfile>(
      `SELECT user_id as "userId", tenant_id as "tenantId", full_name as "fullName",
              company, website, phone, sector, timezone, language, updated_at as "updatedAt"
       FROM saas_client_profiles WHERE user_id = $1 AND tenant_id = $2`,
      [userId, tenantId],
    );
    return rows[0] ?? null;
  }

  async upsertProfile(
    userId: string,
    tenantId: string,
    data: Partial<Omit<ClientProfile, "userId" | "tenantId" | "updatedAt">>,
  ): Promise<ClientProfile> {
    const current = await this.getProfile(userId, tenantId);

    const rows = await this.db.query<ClientProfile>(
      `INSERT INTO saas_client_profiles (user_id, tenant_id, full_name, company, website, phone, sector, timezone, language)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (user_id, tenant_id) DO UPDATE SET
         full_name = COALESCE(EXCLUDED.full_name, saas_client_profiles.full_name),
         company = COALESCE(EXCLUDED.company, saas_client_profiles.company),
         website = COALESCE(EXCLUDED.website, saas_client_profiles.website),
         phone = COALESCE(EXCLUDED.phone, saas_client_profiles.phone),
         sector = COALESCE(EXCLUDED.sector, saas_client_profiles.sector),
         timezone = COALESCE(EXCLUDED.timezone, saas_client_profiles.timezone),
         language = COALESCE(EXCLUDED.language, saas_client_profiles.language),
         updated_at = NOW()
       RETURNING user_id as "userId", tenant_id as "tenantId", full_name as "fullName",
                 company, website, phone, sector, timezone, language, updated_at as "updatedAt"`,
      [
        userId,
        tenantId,
        data.fullName ?? null,
        data.company ?? null,
        data.website ?? null,
        data.phone ?? null,
        data.sector ?? null,
        data.timezone ?? null,
        data.language ?? null,
      ],
    );

    const updated = rows[0];
    if (!updated) {
      throw new Error("SaasProfileService.upsertProfile: upsert returned no row");
    }

    const fields: (keyof typeof data)[] = ["fullName", "company", "website", "phone", "sector", "timezone", "language"];
    for (const field of fields) {
      const oldVal = current ? String(current[field] ?? "") : null;
      const newVal = data[field] !== undefined ? String(data[field] ?? "") : null;
      if (newVal !== null && oldVal !== newVal) {
        await this.db.query(
          `INSERT INTO saas_profile_changelog (user_id, field, old_value, new_value)
           VALUES ($1, $2, $3, $4)`,
          [userId, field, oldVal, newVal],
        );
      }
    }

    logger.info(`[PROFILE] Perfil actualizado: ${userId}`);
    return updated;
  }

  async getChangeLog(userId: string, limit = 20): Promise<ProfileChangeLog[]> {
    const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));
    return this.db.query<ProfileChangeLog>(
      `SELECT id, user_id as "userId", field, old_value as "oldValue", new_value as "newValue", changed_at as "changedAt"
       FROM saas_profile_changelog WHERE user_id = $1 ORDER BY changed_at DESC LIMIT $2`,
      [userId, safeLimit],
    );
  }
}

export const saasProfileService = new SaasProfileService();
