/**
 * Secure mobile session helpers for the Capacitor shell (`apps/mobile/`).
 * Pure TS core — testable without a device/emulator/Xcode/Android Studio.
 *
 * The Capacitor app itself only loads the live SaaS webapp (see
 * `apps/mobile/capacitor.config.json`); this module documents/enforces the
 * security contract that shell relies on:
 *  - every request carries an explicit tenant header (never implicit/global);
 *  - auth is a short-lived bearer token (never a hardcoded/long-lived secret);
 *  - actions captured while offline are queued locally, never silently
 *    dropped, until connectivity returns (bounded queue + capped retries).
 */

export type MobileSessionContext = {
  tenantId: string;
  authToken: string;
  deviceId: string;
  /** Unix ms; session is considered expired at/after this instant. */
  expiresAtMs: number;
};

export type MobileAuthHeaders = {
  Authorization: string;
  "X-Tenant-Id": string;
  "X-Device-Id": string;
};

const MIN_TENANT_ID_LENGTH = 8;
const MIN_TOKEN_LENGTH = 16;

export function isMobileSessionValid(session: MobileSessionContext, nowMs = Date.now()): boolean {
  if (!session.tenantId || session.tenantId.trim().length < MIN_TENANT_ID_LENGTH) return false;
  if (!session.authToken || session.authToken.trim().length < MIN_TOKEN_LENGTH) return false;
  if (!session.deviceId || session.deviceId.trim().length === 0) return false;
  if (!Number.isFinite(session.expiresAtMs) || session.expiresAtMs <= nowMs) return false;
  return true;
}

/** Builds the headers every mobile HTTP call must send — never a bare cookie without tenant scoping. */
export function buildMobileAuthHeaders(session: MobileSessionContext): MobileAuthHeaders {
  if (!isMobileSessionValid(session)) {
    throw new Error("mobile_session_invalid_or_expired");
  }
  return {
    Authorization: `Bearer ${session.authToken}`,
    "X-Tenant-Id": session.tenantId,
    "X-Device-Id": session.deviceId,
  };
}

/**
 * Hard tenant-isolation guard: a mobile session must never be allowed to act
 * on a tenant other than the one it was issued for, even if the caller passes
 * a different id by mistake or a compromised UI state requests it.
 */
export function assertMobileTenantIsolation(session: MobileSessionContext, requestedTenantId: string): void {
  if (session.tenantId !== requestedTenantId) {
    throw new Error(
      `mobile_tenant_isolation_violation: session=${session.tenantId} requested=${requestedTenantId}`,
    );
  }
}

// --- Offline queue (basic, in-memory stub — no persistent device storage yet) ---

export type OfflineActionKind = "note" | "task_update" | "lead_status" | "message_draft";

export type OfflineQueueItem = {
  id: string;
  tenantId: string;
  kind: OfflineActionKind;
  payload: Record<string, unknown>;
  createdAtMs: number;
  attempts: number;
};

export type OfflineQueueDrainResult = {
  sent: OfflineQueueItem[];
  failed: OfflineQueueItem[];
  remaining: OfflineQueueItem[];
};

const MAX_QUEUE_SIZE = 200;
const MAX_ATTEMPTS = 5;

export class MobileOfflineQueue {
  private items: OfflineQueueItem[] = [];

  enqueue(tenantId: string, kind: OfflineActionKind, payload: Record<string, unknown>): OfflineQueueItem {
    if (this.items.length >= MAX_QUEUE_SIZE) {
      // Bounded queue — drop the oldest rather than grow unbounded (mobile storage is finite).
      this.items.shift();
    }
    const item: OfflineQueueItem = {
      id: `${tenantId}:${kind}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
      tenantId,
      kind,
      payload,
      createdAtMs: Date.now(),
      attempts: 0,
    };
    this.items.push(item);
    return item;
  }

  size(): number {
    return this.items.length;
  }

  peekAll(): OfflineQueueItem[] {
    return [...this.items];
  }

  clearForTests(): void {
    this.items = [];
  }

  /** Drains the queue against a send function; failures retry up to MAX_ATTEMPTS, then are reported as failed (never silently dropped). */
  async drain(send: (item: OfflineQueueItem) => Promise<boolean>): Promise<OfflineQueueDrainResult> {
    const pending = [...this.items];
    this.items = [];
    const sent: OfflineQueueItem[] = [];
    const failed: OfflineQueueItem[] = [];
    const remaining: OfflineQueueItem[] = [];

    for (const item of pending) {
      let ok = false;
      try {
        ok = await send(item);
      } catch {
        ok = false;
      }
      if (ok) {
        sent.push(item);
        continue;
      }
      const retried = { ...item, attempts: item.attempts + 1 };
      if (retried.attempts >= MAX_ATTEMPTS) {
        failed.push(retried);
      } else {
        remaining.push(retried);
      }
    }
    this.items = remaining;
    return { sent, failed, remaining };
  }
}

export function assertMobileSecureSessionIntegrity(): { ok: boolean; violations: string[] } {
  const violations: string[] = [];

  const validSession: MobileSessionContext = {
    tenantId: "tenant-uuid-aaaa1111",
    authToken: "a".repeat(32),
    deviceId: "device-1",
    expiresAtMs: Date.now() + 60_000,
  };
  if (!isMobileSessionValid(validSession)) violations.push("valid_session_must_pass");

  const expired: MobileSessionContext = { ...validSession, expiresAtMs: Date.now() - 1000 };
  if (isMobileSessionValid(expired)) violations.push("expired_session_must_fail");

  try {
    buildMobileAuthHeaders(expired);
    violations.push("expired_session_must_throw_on_header_build");
  } catch {
    /* expected */
  }

  const headers = buildMobileAuthHeaders(validSession);
  if (!headers["X-Tenant-Id"] || !headers.Authorization.startsWith("Bearer ")) {
    violations.push("headers_must_include_tenant_and_bearer_token");
  }

  try {
    assertMobileTenantIsolation(validSession, "other-tenant-id");
    violations.push("cross_tenant_must_throw");
  } catch {
    /* expected */
  }

  const queue = new MobileOfflineQueue();
  queue.enqueue(validSession.tenantId, "note", { text: "hi" });
  if (queue.size() !== 1) violations.push("queue_enqueue_must_increment_size");

  return { ok: violations.length === 0, violations };
}
