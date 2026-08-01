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

/**
 * Honest scope of user-level DSAR helpers.
 * CRM: only rows attributable to the user inside the active tenant
 * (owned deals + contacts matching profile email / linked to those deals).
 * Never a full tenant CRM wipe.
 */
export const GDPR_USER_DATA_COVERAGE = {
  exportTables: [
    "saas_client_profiles",
    "saas_invoices",
    "saas_service_results",
    "saas_notifications",
    "saas_chat_messages",
    "os_assets",
    "saas_deals",
    "saas_contacts",
    "saas_contact_activities",
    "saas_campania_recipients",
  ] as const,
  deleteTables: [
    "saas_chat_messages",
    "saas_notifications",
    "saas_service_results",
    "saas_invoices",
    "saas_client_profiles",
    "os_assets",
    "os_upsell_suggestions",
    "saas_deals",
    "saas_campania_recipients",
    "saas_contact_activities",
    "saas_contacts",
  ] as const,
  /** Tenant-wide artifacts not owned by a single user — use exportTenantBundle. */
  outOfScope: ["saas_campanias", "saas_profile_changelog", "audit_logs"] as const,
  note:
    "User-level DSAR covers profile/billing/notifications/chat/assets plus CRM rows attributable to the user in the active tenant (deals with owner_user_id=user, contacts matching profile email or linked to those deals, their activities/recipients). Campaign definitions and cross-tenant changelog remain tenant-admin scope.",
} as const;

export type SaasGdprServiceDeps = {
  db?: Pick<DbClient, "query">;
};

async function tryQuery(
  db: Pick<DbClient, "query">,
  sql: string,
  params: unknown[],
): Promise<unknown[]> {
  try {
    return await db.query(sql, params);
  } catch {
    return [];
  }
}

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

  private async resolveUserEmails(userId: string, tenantId: string): Promise<string[]> {
    const emails = new Set<string>();
    const profiles = await tryQuery(
      this.db,
      `SELECT email FROM saas_client_profiles WHERE user_id = $1 AND tenant_id = $2`,
      [userId, tenantId],
    );
    for (const row of profiles) {
      const email = (row as { email?: unknown }).email;
      if (typeof email === "string" && email.trim()) emails.add(email.trim().toLowerCase());
    }
    const users = await tryQuery(
      this.db,
      `SELECT email FROM nelvyon_users WHERE user_id::text = $1 LIMIT 1`,
      [userId],
    );
    for (const row of users) {
      const email = (row as { email?: unknown }).email;
      if (typeof email === "string" && email.trim()) emails.add(email.trim().toLowerCase());
    }
    return [...emails];
  }

  private async loadUserCrmBundle(userId: string, tenantId: string): Promise<{
    deals: unknown[];
    contacts: unknown[];
    contactActivities: unknown[];
    campaniaRecipients: unknown[];
  }> {
    const deals = await tryQuery(
      this.db,
      `SELECT * FROM saas_deals WHERE tenant_id = $1 AND owner_user_id = $2 ORDER BY updated_at DESC`,
      [tenantId, userId],
    );

    const emails = await this.resolveUserEmails(userId, tenantId);
    const contactIds = new Set<string>();
    for (const deal of deals) {
      const contactId = (deal as { contact_id?: unknown }).contact_id;
      if (typeof contactId === "string" && contactId) contactIds.add(contactId);
    }

    let contacts: unknown[] = [];
    if (emails.length > 0 || contactIds.size > 0) {
      contacts = await tryQuery(
        this.db,
        `SELECT * FROM saas_contacts
         WHERE tenant_id = $1
           AND (
             ($2::text[] <> '{}' AND lower(coalesce(email, '')) = ANY($2::text[]))
             OR ($3::uuid[] <> '{}' AND id = ANY($3::uuid[]))
           )
         ORDER BY updated_at DESC`,
        [tenantId, emails, [...contactIds]],
      );
    }

    for (const contact of contacts) {
      const id = (contact as { id?: unknown }).id;
      if (typeof id === "string" && id) contactIds.add(id);
    }

    const idList = [...contactIds];
    const contactActivities =
      idList.length > 0
        ? await tryQuery(
            this.db,
            `SELECT * FROM saas_contact_activities
             WHERE tenant_id = $1 AND contact_id = ANY($2::uuid[])
             ORDER BY created_at DESC LIMIT 5000`,
            [tenantId, idList],
          )
        : [];

    const campaniaRecipients =
      idList.length > 0
        ? await tryQuery(
            this.db,
            `SELECT * FROM saas_campania_recipients
             WHERE tenant_id = $1 AND contact_id = ANY($2::uuid[])
             ORDER BY sent_at DESC NULLS LAST LIMIT 5000`,
            [tenantId, idList],
          )
        : [];

    return { deals, contacts, contactActivities, campaniaRecipients };
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

    const crm = await this.loadUserCrmBundle(userId, tenantId);

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
      crm: {
        deals: crm.deals,
        contacts: crm.contacts,
        contactActivities: crm.contactActivities,
        campaniaRecipients: crm.campaniaRecipients,
      },
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
    const crm = await this.loadUserCrmBundle(userId, tenantId);
    const contactIds = crm.contacts
      .map((c) => (c as { id?: unknown }).id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    if (contactIds.length > 0) {
      await tryQuery(
        this.db,
        `DELETE FROM saas_campania_recipients WHERE tenant_id = $1 AND contact_id = ANY($2::uuid[])`,
        [tenantId, contactIds],
      );
      await tryQuery(
        this.db,
        `DELETE FROM saas_contact_activities WHERE tenant_id = $1 AND contact_id = ANY($2::uuid[])`,
        [tenantId, contactIds],
      );
    }

    await tryQuery(
      this.db,
      `DELETE FROM saas_deals WHERE tenant_id = $1 AND owner_user_id = $2`,
      [tenantId, userId],
    );

    if (contactIds.length > 0) {
      // Anonymize rather than hard-delete: contact may still be referenced by shared tenant objects.
      await tryQuery(
        this.db,
        `UPDATE saas_contacts
         SET name = 'Anonimizado GDPR',
             email = NULL,
             phone = NULL,
             notes = NULL,
             company = NULL,
             position = NULL,
             tags = ARRAY[]::text[],
             updated_at = NOW()
         WHERE tenant_id = $1 AND id = ANY($2::uuid[])`,
        [tenantId, contactIds],
      );
    }

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
      `[GDPR] User-scoped delete completed (CRM-attributed rows anonymized/removed): ${userId} tenant=${tenantId}`,
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
