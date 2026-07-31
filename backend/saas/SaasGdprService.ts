import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";
import { logger } from "../os-agents/cron/logger";

export type GdprRequestType = "export" | "delete" | "rectify";
export type GdprRequestStatus = "pending" | "processing" | "completed" | "failed";

export interface GdprRequest {
  id: string;
  userId: string;
  tenantId: string;
  type: GdprRequestType;
  status: GdprRequestStatus;
  dataUrl: string | null;
  completedAt: string | null;
  createdAt: string;
}

/** Honest scope of user-level DSAR helpers (not a full CRM wipe). */
export const GDPR_USER_DATA_COVERAGE = {
  exportTables: [
    "saas_client_profiles",
    "saas_invoices",
    "saas_service_results",
    "saas_notifications",
    "saas_chat_messages",
    "os_assets",
  ] as const,
  deleteTables: [
    "saas_chat_messages",
    "saas_notifications",
    "saas_service_results",
    "saas_invoices",
    "saas_client_profiles",
    "os_assets",
    "os_upsell_suggestions",
  ] as const,
  /** Explicitly out of scope for user-level delete/export (use tenant bundle / contact delete). */
  outOfScope: [
    "saas_contacts",
    "saas_deals",
    "saas_campanias",
    "saas_campania_recipients",
    "saas_profile_changelog",
  ] as const,
  note:
    "User-level DSAR covers profile/billing/notifications/chat/assets for the active tenant only. CRM PII uses exportTenantBundle or delete-contact.",
} as const;

export type SaasGdprServiceDeps = {
  db?: Pick<DbClient, "query">;
};

export class SaasGdprService {
  constructor(private readonly deps: SaasGdprServiceDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  async requestExport(userId: string, tenantId: string): Promise<GdprRequest> {
    const rows = await this.db.query<GdprRequest>(
      `INSERT INTO saas_gdpr_requests (user_id, tenant_id, type, status)
       VALUES ($1, $2, 'export', 'pending')
       RETURNING id, user_id as "userId", tenant_id as "tenantId",
                 type, status, data_url as "dataUrl",
                 completed_at as "completedAt", created_at as "createdAt"`,
      [userId, tenantId],
    );
    const row = rows[0];
    if (!row) throw new Error("SaasGdprService.requestExport: INSERT returned no row");
    logger.info(`[GDPR] Export solicitado: ${userId}`);
    return row;
  }

  async exportUserData(userId: string, tenantId: string): Promise<Record<string, unknown>> {
    const [profile, invoices, results, notifications, chatMessages, assets] = await Promise.all([
      this.db.query(`SELECT * FROM saas_client_profiles WHERE user_id = $1 AND tenant_id = $2`, [userId, tenantId]),
      this.db.query(`SELECT * FROM saas_invoices WHERE user_id = $1 AND tenant_id = $2`, [userId, tenantId]),
      this.db.query(`SELECT * FROM saas_service_results WHERE user_id = $1 AND tenant_id = $2`, [userId, tenantId]),
      this.db.query(`SELECT * FROM saas_notifications WHERE user_id = $1 AND tenant_id = $2`, [userId, tenantId]),
      this.db.query(`SELECT * FROM saas_chat_messages WHERE user_id = $1 AND tenant_id = $2`, [userId, tenantId]),
      this.db.query(`SELECT * FROM os_assets WHERE client_id = $1 AND tenant_id = $2`, [userId, tenantId]),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      userId,
      tenantId,
      coverage: GDPR_USER_DATA_COVERAGE,
      profile: profile[0] ?? null,
      invoices,
      serviceResults: results,
      notifications,
      chatHistory: chatMessages,
      assets,
    };
  }

  async requestDeletion(userId: string, tenantId: string): Promise<GdprRequest> {
    const rows = await this.db.query<GdprRequest>(
      `INSERT INTO saas_gdpr_requests (user_id, tenant_id, type, status)
       VALUES ($1, $2, 'delete', 'pending')
       RETURNING id, user_id as "userId", tenant_id as "tenantId",
                 type, status, data_url as "dataUrl",
                 completed_at as "completedAt", created_at as "createdAt"`,
      [userId, tenantId],
    );
    const row = rows[0];
    if (!row) throw new Error("SaasGdprService.requestDeletion: INSERT returned no row");
    logger.info(`[GDPR] Borrado solicitado: ${userId}`);
    return row;
  }

  async deleteUserData(userId: string, tenantId: string): Promise<{ coverage: typeof GDPR_USER_DATA_COVERAGE }> {
    await this.db.query(`DELETE FROM saas_chat_messages WHERE user_id = $1 AND tenant_id = $2`, [userId, tenantId]);
    await this.db.query(`DELETE FROM saas_notifications WHERE user_id = $1 AND tenant_id = $2`, [userId, tenantId]);
    await this.db.query(`DELETE FROM saas_service_results WHERE user_id = $1 AND tenant_id = $2`, [userId, tenantId]);
    await this.db.query(`DELETE FROM saas_invoices WHERE user_id = $1 AND tenant_id = $2`, [userId, tenantId]);
    // saas_profile_changelog has no tenant_id — do not wipe cross-tenant history here.
    await this.db.query(`DELETE FROM saas_client_profiles WHERE user_id = $1 AND tenant_id = $2`, [userId, tenantId]);
    await this.db.query(`DELETE FROM os_assets WHERE client_id = $1 AND tenant_id = $2`, [userId, tenantId]);
    await this.db.query(`DELETE FROM os_upsell_suggestions WHERE client_id = $1 AND tenant_id = $2`, [userId, tenantId]);
    await this.db.query(
      `UPDATE saas_gdpr_requests SET status = 'completed', completed_at = NOW()
       WHERE user_id = $1 AND tenant_id = $2 AND type = 'delete' AND status IN ('pending', 'processing')`,
      [userId, tenantId],
    );
    logger.info(
      `[GDPR] User-scoped delete completed (partial coverage, not full CRM wipe): ${userId} tenant=${tenantId}`,
    );
    return { coverage: GDPR_USER_DATA_COVERAGE };
  }

  async getRequests(userId: string, tenantId: string): Promise<GdprRequest[]> {
    return this.db.query<GdprRequest>(
      `SELECT id, user_id as "userId", tenant_id as "tenantId",
              type, status, data_url as "dataUrl",
              completed_at as "completedAt", created_at as "createdAt"
       FROM saas_gdpr_requests
       WHERE user_id = $1 AND tenant_id = $2
       ORDER BY created_at DESC`,
      [userId, tenantId],
    );
  }

  /** Tenant-wide CRM export (admin compliance). */
  async exportTenantBundle(tenantId: string): Promise<Record<string, unknown>> {
    const [contacts, deals, auditLogs] = await Promise.all([
      this.db.query(`SELECT * FROM saas_contacts WHERE tenant_id=$1`, [tenantId]),
      this.db.query(`SELECT * FROM saas_deals WHERE tenant_id=$1`, [tenantId]),
      this.db.query(`SELECT * FROM audit_logs WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 500`, [tenantId]),
    ]);
    return { tenantId, exportedAt: new Date().toISOString(), contacts, deals, auditLogs };
  }

  async deleteContactById(tenantId: string, contactId: string): Promise<void> {
    await this.db.query(`DELETE FROM saas_contacts WHERE id=$1 AND tenant_id=$2`, [contactId, tenantId]);
  }
}

export const saasGdprService = new SaasGdprService();
