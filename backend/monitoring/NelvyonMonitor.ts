import * as Sentry from "@sentry/node";
import type { Scope } from "@sentry/node";

type MonitorContext = {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
};

type MonitorLevel = "info" | "warning" | "error";

export class NelvyonMonitor {
  private static initialized = false;
  private static enabled = false;

  private static ensureInit(): void {
    if (this.initialized) return;
    this.initialized = true;
    const dsn = process.env.SENTRY_DSN;
    if (!dsn) {
      this.enabled = false;
      return;
    }
    try {
      Sentry.init({
        dsn,
        environment: process.env.NODE_ENV,
        tracesSampleRate: 0.1,
      });
      this.enabled = true;
    } catch {
      this.enabled = false;
    }
  }

  static resetForTests(): void {
    this.initialized = false;
    this.enabled = false;
  }

  static captureError(error: unknown, context?: MonitorContext): void {
    this.ensureInit();
    if (!this.enabled) {
      console.error("[MONITOR MOCK] error", error, context ?? {});
      return;
    }
    try {
      Sentry.withScope((scope: Scope) => {
        if (context?.tags) {
          Object.entries(context.tags).forEach(([k, v]) => scope.setTag(k, v));
        }
        if (context?.extra) {
          Object.entries(context.extra).forEach(([k, v]) => scope.setExtra(k, v));
        }
        Sentry.captureException(error);
      });
    } catch {
      // Fire-and-forget: monitoring must not block business flow.
    }
  }

  static captureMessage(msg: string, level: MonitorLevel = "info"): void {
    this.ensureInit();
    if (!this.enabled) {
      console.log("[MONITOR MOCK] message", level, msg);
      return;
    }
    try {
      Sentry.captureMessage(msg, level);
    } catch {
      // Fire-and-forget: monitoring must not block business flow.
    }
  }

  static trackJobFailed(jobId: string, serviceId: string, error: unknown): void {
    this.captureError(error, {
      tags: { jobId, serviceId },
      extra: { type: "job_failed" },
    });
  }

  static trackAgentError(agentName: string, step: string, error: unknown): void {
    this.captureError(error, {
      tags: { agentName, step },
      extra: { type: "agent_error" },
    });
  }

  static trackBillingError(tenantId: string, error: unknown): void {
    this.captureError(error, {
      tags: { tenantId, type: "billing" },
    });
  }

  static trackAuthError(email: string, error: unknown): void {
    this.captureError(error, {
      tags: { type: "auth" },
      extra: { email },
    });
  }

  static setUserContext(userId: string, email: string, tenantId: string): void {
    this.ensureInit();
    if (!this.enabled) return;
    try {
      Sentry.setUser({ id: userId, email, tenantId });
    } catch {
      // Fire-and-forget: monitoring must not block business flow.
    }
  }
}
