import { describe, expect, it } from "vitest";
import {
  MobileOfflineQueue,
  assertMobileSecureSessionIntegrity,
  assertMobileTenantIsolation,
  buildMobileAuthHeaders,
  isMobileSessionValid,
  type MobileSessionContext,
} from "../MobileSecureSession";

function makeSession(overrides: Partial<MobileSessionContext> = {}): MobileSessionContext {
  return {
    tenantId: "tenant-uuid-aaaa1111",
    authToken: "a".repeat(32),
    deviceId: "device-1",
    expiresAtMs: Date.now() + 60_000,
    ...overrides,
  };
}

describe("MobileSecureSession", () => {
  it("passes its own integrity assertion", () => {
    expect(assertMobileSecureSessionIntegrity()).toEqual({ ok: true, violations: [] });
  });

  it("validates a well-formed, non-expired session", () => {
    expect(isMobileSessionValid(makeSession())).toBe(true);
  });

  it("rejects an expired session", () => {
    expect(isMobileSessionValid(makeSession({ expiresAtMs: Date.now() - 1 }))).toBe(false);
  });

  it("rejects sessions with short tenant id, short token, or empty device id", () => {
    expect(isMobileSessionValid(makeSession({ tenantId: "short" }))).toBe(false);
    expect(isMobileSessionValid(makeSession({ authToken: "short" }))).toBe(false);
    expect(isMobileSessionValid(makeSession({ deviceId: "" }))).toBe(false);
  });

  it("builds auth headers with tenant + bearer token for a valid session", () => {
    const session = makeSession();
    const headers = buildMobileAuthHeaders(session);
    expect(headers["X-Tenant-Id"]).toBe(session.tenantId);
    expect(headers["X-Device-Id"]).toBe(session.deviceId);
    expect(headers.Authorization).toBe(`Bearer ${session.authToken}`);
  });

  it("throws when building headers for an invalid/expired session", () => {
    const expired = makeSession({ expiresAtMs: Date.now() - 1 });
    expect(() => buildMobileAuthHeaders(expired)).toThrow(/mobile_session_invalid_or_expired/);
  });

  it("enforces hard tenant isolation — throws on cross-tenant requests", () => {
    const session = makeSession();
    expect(() => assertMobileTenantIsolation(session, session.tenantId)).not.toThrow();
    expect(() => assertMobileTenantIsolation(session, "different-tenant")).toThrow(
      /mobile_tenant_isolation_violation/,
    );
  });

  describe("MobileOfflineQueue", () => {
    it("enqueues items and reports size", () => {
      const queue = new MobileOfflineQueue();
      queue.enqueue("tenant-a", "note", { text: "hi" });
      queue.enqueue("tenant-a", "lead_status", { status: "won" });
      expect(queue.size()).toBe(2);
      expect(queue.peekAll()).toHaveLength(2);
    });

    it("caps queue size by dropping the oldest item", () => {
      const queue = new MobileOfflineQueue();
      for (let i = 0; i < 205; i += 1) {
        queue.enqueue("tenant-a", "note", { i });
      }
      expect(queue.size()).toBe(200);
      const first = queue.peekAll()[0];
      expect((first.payload as { i: number }).i).toBeGreaterThan(0);
    });

    it("drains successfully sent items and clears the queue", async () => {
      const queue = new MobileOfflineQueue();
      queue.enqueue("tenant-a", "note", { text: "hi" });
      queue.enqueue("tenant-a", "task_update", { id: 1 });
      const result = await queue.drain(async () => true);
      expect(result.sent).toHaveLength(2);
      expect(result.failed).toHaveLength(0);
      expect(result.remaining).toHaveLength(0);
      expect(queue.size()).toBe(0);
    });

    it("retries failed items up to MAX_ATTEMPTS then reports them as failed (never silently dropped)", async () => {
      const queue = new MobileOfflineQueue();
      queue.enqueue("tenant-a", "note", { text: "hi" });

      let result = await queue.drain(async () => false);
      expect(result.remaining).toHaveLength(1);
      expect(result.remaining[0].attempts).toBe(1);

      // Re-drain is implicit: drain() already re-inserted remaining items into the queue.
      // 4 more failing drains bring attempts from 1 -> 5, at which point the item moves to `failed`.
      for (let i = 0; i < 4; i += 1) {
        result = await queue.drain(async () => false);
      }
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].attempts).toBe(5);
      expect(queue.size()).toBe(0);
    });

    it("treats a throwing send function as a failure, not a crash", async () => {
      const queue = new MobileOfflineQueue();
      queue.enqueue("tenant-a", "message_draft", { text: "hi" });
      const result = await queue.drain(async () => {
        throw new Error("network down");
      });
      expect(result.sent).toHaveLength(0);
      expect(result.remaining).toHaveLength(1);
    });

    it("clearForTests empties the queue", () => {
      const queue = new MobileOfflineQueue();
      queue.enqueue("tenant-a", "note", { text: "hi" });
      queue.clearForTests();
      expect(queue.size()).toBe(0);
    });
  });
});
