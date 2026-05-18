import type { DbClient } from "../db/DbClient";
import { DbClient as DbClientClass } from "../db/DbClient";
import { logger } from "../os-agents/cron/logger";

export type NotificationType = "job_started" | "job_progress" | "job_completed" | "job_failed" | "upsell" | "health_alert" | "asset_ready";

export interface SaasNotification {
  id: string;
  userId: string;
  tenantId: string;
  type: NotificationType;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
}

export type SaasNotificationServiceDeps = {
  db?: Pick<DbClient, "query">;
};

export class SaasNotificationService {
  constructor(private readonly deps: SaasNotificationServiceDeps = {}) {}

  private get db(): Pick<DbClient, "query"> {
    return this.deps.db ?? DbClientClass.getInstance();
  }

  async createNotification(params: {
    userId: string;
    tenantId: string;
    type: NotificationType;
    title: string;
    message: string;
    metadata?: Record<string, unknown>;
  }): Promise<SaasNotification> {
    const rows = await this.db.query<SaasNotification>(
      `INSERT INTO saas_notifications (user_id, tenant_id, type, title, message, metadata)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)
       RETURNING id, user_id as "userId", tenant_id as "tenantId", type, title, message,
                 metadata, read, created_at as "createdAt"`,
      [params.userId, params.tenantId, params.type, params.title, params.message, JSON.stringify(params.metadata ?? {})],
    );
    const row = rows[0];
    if (!row) {
      throw new Error("SaasNotificationService.createNotification: INSERT returned no row");
    }
    logger.info(`[NOTIFY] ${params.type} → ${params.userId}: ${params.title}`);
    return row;
  }

  async getNotifications(userId: string, tenantId: string, limit = 50): Promise<SaasNotification[]> {
    const safeLimit = Math.min(100, Math.max(1, Math.floor(limit)));
    return this.db.query<SaasNotification>(
      `SELECT id, user_id as "userId", tenant_id as "tenantId", type, title, message,
              metadata, read, created_at as "createdAt"
       FROM saas_notifications
       WHERE user_id = $1 AND tenant_id = $2
       ORDER BY created_at DESC LIMIT $3`,
      [userId, tenantId, safeLimit],
    );
  }

  /** Últimas notificaciones no leídas (p. ej. SSE). */
  async getRecentUnread(userId: string, tenantId: string, limit = 10): Promise<SaasNotification[]> {
    const safeLimit = Math.min(50, Math.max(1, Math.floor(limit)));
    return this.db.query<SaasNotification>(
      `SELECT id, user_id as "userId", tenant_id as "tenantId", type, title, message,
              metadata, read, created_at as "createdAt"
       FROM saas_notifications
       WHERE user_id = $1 AND tenant_id = $2 AND read = false
       ORDER BY created_at DESC LIMIT $3`,
      [userId, tenantId, safeLimit],
    );
  }

  async markAllRead(userId: string, tenantId: string): Promise<number> {
    const rows = await this.db.query<{ id: string }>(
      `UPDATE saas_notifications SET read = true
       WHERE user_id = $1 AND tenant_id = $2 AND read = false
       RETURNING id`,
      [userId, tenantId],
    );
    return rows.length;
  }

  async markRead(id: string, userId: string): Promise<boolean> {
    const rows = await this.db.query<{ id: string }>(
      `UPDATE saas_notifications SET read = true
       WHERE id = $1::uuid AND user_id = $2 AND read = false
       RETURNING id`,
      [id, userId],
    );
    return rows.length > 0;
  }

  async getUnreadCount(userId: string, tenantId: string): Promise<number> {
    const rows = await this.db.query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM saas_notifications
       WHERE user_id = $1 AND tenant_id = $2 AND read = false`,
      [userId, tenantId],
    );
    return parseInt(rows[0]?.count ?? "0", 10);
  }
}

export const saasNotificationService = new SaasNotificationService();
