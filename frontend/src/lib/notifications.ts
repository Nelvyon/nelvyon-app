/**
 * NELVYON Notification Service
 * 
 * Real-time notification system using Server-Sent Events (SSE) with
 * graceful fallback to polling. Supports:
 * - Helpdesk ticket updates
 * - Contract status changes
 * - Campaign delivery reports
 * - System alerts
 * 
 * SCALABILITY NOTES:
 * ─────────────────
 * Current: In-memory polling (works for ~1K concurrent users)
 * Scale path:
 *   1. SSE via backend /api/v1/notifications/stream (5K users)
 *   2. Redis Pub/Sub for multi-instance (50K users)
 *   3. WebSocket with Redis adapter (500K users)
 *   4. Dedicated notification service (Kafka/NATS) (65M users)
 */

import { api } from "./api";

export type NotificationType =
  | "ticket_created"
  | "ticket_updated"
  | "ticket_assigned"
  | "ticket_resolved"
  | "contract_signed"
  | "contract_expired"
  | "campaign_sent"
  | "campaign_failed"
  | "payment_received"
  | "payment_failed"
  | "system_alert";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  timestamp: string;
  metadata?: Record<string, unknown>;
  actionUrl?: string;
}

type NotificationHandler = (notification: AppNotification) => void;

class NotificationService {
  private handlers: Set<NotificationHandler> = new Set();
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private notifications: AppNotification[] = [];
  private lastFetchTime: string | null = null;
  private isConnected = false;
  private eventSource: EventSource | null = null;

  /**
   * Subscribe to notifications
   */
  subscribe(handler: NotificationHandler): () => void {
    this.handlers.add(handler);
    // Send existing unread notifications to new subscriber
    this.notifications.filter(n => !n.read).forEach(n => handler(n));
    return () => this.handlers.delete(handler);
  }

  /**
   * Start listening for notifications.
   * Tries SSE first, falls back to polling.
   */
  start() {
    if (this.isConnected) return;
    this.isConnected = true;

    // Try SSE connection first
    try {
      this.connectSSE();
    } catch {
      // Fallback to polling
      this.startPolling();
    }
  }

  /**
   * Stop listening
   */
  stop() {
    this.isConnected = false;
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  /**
   * Mark notification as read
   */
  markAsRead(id: string) {
    const notif = this.notifications.find(n => n.id === id);
    if (notif) {
      notif.read = true;
      // Persist to backend (fire-and-forget)
      api.markNotificationRead?.(id).catch(() => {});
    }
  }

  /**
   * Mark all as read
   */
  markAllAsRead() {
    this.notifications.forEach(n => { n.read = true; });
    api.markAllNotificationsRead?.().catch(() => {});
  }

  /**
   * Get unread count
   */
  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length;
  }

  /**
   * Get all notifications
   */
  getAll(): AppNotification[] {
    return [...this.notifications];
  }

  /**
   * Create a local notification (for optimistic UI)
   */
  push(notification: Omit<AppNotification, "id" | "timestamp" | "read">) {
    const full: AppNotification = {
      ...notification,
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };
    this.notifications.unshift(full);
    // Keep max 200 notifications
    if (this.notifications.length > 200) {
      this.notifications = this.notifications.slice(0, 200);
    }
    this.handlers.forEach(h => h(full));
  }

  // ─── Private ───

  private connectSSE() {
    // SSE endpoint — will be available when backend supports it
    // For now, falls back to polling
    this.startPolling();
  }

  private startPolling() {
    if (this.pollInterval) return;
    // Poll every 30 seconds
    this.pollInterval = setInterval(() => this.poll(), 30_000);
    // Initial poll
    this.poll();
  }

  private async poll() {
    try {
      const params: Record<string, string> = {};
      if (this.lastFetchTime) params.since = this.lastFetchTime;

      // Try to fetch from backend notification endpoint
      const result = await api.getNotifications?.(params);
      if (result && Array.isArray(result.items)) {
        const newNotifs = result.items as AppNotification[];
        newNotifs.forEach(n => {
          if (!this.notifications.find(existing => existing.id === n.id)) {
            this.notifications.unshift(n);
            this.handlers.forEach(h => h(n));
          }
        });
        this.lastFetchTime = new Date().toISOString();
      }
    } catch {
      // Silent fail — notifications are non-critical
    }
  }
}

export const notificationService = new NotificationService();

/**
 * Helper: Create a helpdesk notification
 */
export function notifyTicketUpdate(
  ticketId: number,
  action: "created" | "updated" | "assigned" | "resolved",
  subject: string,
) {
  const typeMap: Record<string, NotificationType> = {
    created: "ticket_created",
    updated: "ticket_updated",
    assigned: "ticket_assigned",
    resolved: "ticket_resolved",
  };
  const titleMap: Record<string, string> = {
    created: "Nuevo ticket creado",
    updated: "Ticket actualizado",
    assigned: "Ticket asignado",
    resolved: "Ticket resuelto",
  };
  notificationService.push({
    type: typeMap[action],
    title: titleMap[action],
    message: subject,
    actionUrl: `/saas/helpdesk?ticket=${ticketId}`,
    metadata: { ticketId },
  });
}

/**
 * Helper: Create a contract notification
 */
export function notifyContractUpdate(
  contractId: number,
  action: "signed" | "expired",
  title: string,
) {
  notificationService.push({
    type: action === "signed" ? "contract_signed" : "contract_expired",
    title: action === "signed" ? "Contrato firmado" : "Contrato expirado",
    message: title,
    actionUrl: `/saas/contracts?view=${contractId}`,
    metadata: { contractId },
  });
}

/**
 * Helper: Create a campaign notification
 */
export function notifyCampaignResult(
  campaignId: number,
  success: boolean,
  name: string,
  sentCount?: number,
) {
  notificationService.push({
    type: success ? "campaign_sent" : "campaign_failed",
    title: success ? "Campaña enviada" : "Error en campaña",
    message: success
      ? `"${name}" enviada a ${sentCount || 0} destinatarios`
      : `Error al enviar "${name}"`,
    actionUrl: `/saas/campaigns?tab=email`,
    metadata: { campaignId, sentCount },
  });
}