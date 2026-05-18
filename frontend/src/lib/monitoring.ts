/**
 * Monitoring Service — Real Sentry integration + lightweight fallback.
 * 
 * When VITE_SENTRY_DSN is set, uses the real @sentry/react SDK for:
 * - Error tracking with full stack traces
 * - Performance monitoring (LCP, FID, CLS, TTFB)
 * - Session replay breadcrumbs
 * - Release tracking
 * 
 * When no DSN is configured, falls back to an in-memory buffer
 * that stores errors in sessionStorage for the Platform Health dashboard.
 */

import * as Sentry from "@sentry/react";

// ─── Types ───
interface ErrorEvent {
  id: string;
  timestamp: string;
  level: "error" | "warning" | "info";
  message: string;
  stack?: string;
  tags: Record<string, string>;
  breadcrumbs: Breadcrumb[];
  context: Record<string, unknown>;
  url: string;
  userAgent: string;
}

interface Breadcrumb {
  timestamp: string;
  category: string;
  message: string;
  level: "info" | "warning" | "error";
  data?: Record<string, unknown>;
}

interface PerformanceEntry {
  name: string;
  value: number;
  timestamp: string;
  tags: Record<string, string>;
}

const MAX_BREADCRUMBS = 50;
const MAX_EVENTS = 100;
const FLUSH_INTERVAL = 30_000;

class MonitoringService {
  private breadcrumbs: Breadcrumb[] = [];
  private events: ErrorEvent[] = [];
  private performanceEntries: PerformanceEntry[] = [];
  private tags: Record<string, string> = {};
  private userId: string | null = null;
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private initialized = false;
  private sentryEnabled = false;

  /** Initialize monitoring with Sentry SDK + fallback */
  init(config?: { userId?: string; tags?: Record<string, string>; flushEndpoint?: string }) {
    if (this.initialized) return;
    this.initialized = true;

    if (config?.userId) this.userId = config.userId;
    if (config?.tags) this.tags = { ...this.tags, ...config.tags };

    // ─── Initialize real Sentry if DSN is available ───
    const dsn = import.meta.env.VITE_SENTRY_DSN;
    if (dsn) {
      try {
        Sentry.init({
          dsn,
          environment: import.meta.env.MODE || "production",
          release: `nelvyon@${import.meta.env.VITE_APP_VERSION || "1.0.0"}`,
          integrations: [
            Sentry.browserTracingIntegration(),
            Sentry.replayIntegration({
              maskAllText: false,
              blockAllMedia: false,
            }),
          ],
          // Performance monitoring
          tracesSampleRate: import.meta.env.PROD ? 0.2 : 1.0,
          // Session replay — capture 10% of sessions, 100% on error
          replaysSessionSampleRate: 0.1,
          replaysOnErrorSampleRate: 1.0,
          // Filter out noise
          ignoreErrors: [
            "ResizeObserver loop",
            "Non-Error promise rejection",
            "Loading chunk",
            "dynamically imported module",
          ],
          beforeSend(event) {
            // Store in sessionStorage for Platform Health dashboard
            try {
              const stored = JSON.parse(sessionStorage.getItem("nelvyon_errors") || "[]");
              stored.push({
                id: event.event_id,
                ts: new Date().toISOString(),
                msg: event.message || event.exception?.values?.[0]?.value || "Unknown error",
                url: event.request?.url || window.location.href,
              });
              if (stored.length > 50) stored.splice(0, stored.length - 50);
              sessionStorage.setItem("nelvyon_errors", JSON.stringify(stored));
            } catch {
              // sessionStorage full or unavailable
            }
            return event;
          },
        });

        // Set initial tags
        if (config?.tags) {
          Sentry.setTags(config.tags);
        }

        this.sentryEnabled = true;
        if (import.meta.env.DEV) {
          console.log("[Monitoring] Sentry initialized with DSN");
        }
      } catch (err) {
        console.warn("[Monitoring] Sentry init failed, using fallback:", err);
        this.sentryEnabled = false;
      }
    }

    // ─── Fallback: Global error handlers (when Sentry is NOT active) ───
    if (!this.sentryEnabled) {
      window.addEventListener("error", (event) => {
        this.captureError(event.error || new Error(event.message), {
          source: event.filename,
          line: event.lineno,
          col: event.colno,
        });
      });

      window.addEventListener("unhandledrejection", (event) => {
        const error = event.reason instanceof Error
          ? event.reason
          : new Error(String(event.reason));
        this.captureError(error, { type: "unhandled_rejection" });
      });
    }

    // ─── Navigation breadcrumbs (always active) ───
    const originalPushState = history.pushState.bind(history);
    history.pushState = (...args) => {
      originalPushState(...args);
      const url = String(args[2] || "");
      this.addBreadcrumb("navigation", `Navigate to ${url}`, "info");
      if (this.sentryEnabled) {
        Sentry.addBreadcrumb({ category: "navigation", message: url, level: "info" });
      }
    };

    // ─── Network breadcrumbs (always active) ───
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (...args) => {
      const url = typeof args[0] === "string" ? args[0] : (args[0] as Request).url;
      const start = performance.now();
      try {
        const response = await originalFetch(...args);
        const duration = Math.round(performance.now() - start);
        this.addBreadcrumb("http", `${response.status} ${url}`, response.ok ? "info" : "warning", { duration, status: response.status });

        // Track slow requests
        if (duration > 3000) {
          this.trackPerformance("slow_request", duration, { url, status: String(response.status) });
        }

        return response;
      } catch (err) {
        this.addBreadcrumb("http", `FAILED ${url}`, "error", { error: String(err) });
        throw err;
      }
    };

    // ─── Web Vitals via PerformanceObserver ───
    if ("PerformanceObserver" in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === "largest-contentful-paint") {
              this.trackPerformance("lcp", entry.startTime);
            } else if (entry.entryType === "first-input") {
              this.trackPerformance("fid", (entry as PerformanceEventTiming).processingStart - entry.startTime);
            } else if (entry.entryType === "layout-shift" && !(entry as LayoutShift).hadRecentInput) {
              this.trackPerformance("cls", (entry as LayoutShift).value);
            }
          }
        });
        observer.observe({ type: "largest-contentful-paint", buffered: true });
        observer.observe({ type: "first-input", buffered: true });
        observer.observe({ type: "layout-shift", buffered: true });
      } catch {
        // Observer not supported
      }
    }

    // Auto-flush periodically (fallback mode)
    if (!this.sentryEnabled) {
      this.flushTimer = setInterval(() => this.flush(), FLUSH_INTERVAL);
    }

    // Flush on page unload
    window.addEventListener("beforeunload", () => this.flush());

    this.addBreadcrumb("lifecycle", "Monitoring initialized", "info");
  }

  /** Set the current user for error context */
  setUser(userId: string | null) {
    this.userId = userId;
    if (this.sentryEnabled) {
      if (userId) {
        Sentry.setUser({ id: userId });
      } else {
        Sentry.setUser(null);
      }
    }
    if (userId) {
      this.addBreadcrumb("user", `User identified: ${userId}`, "info");
    }
  }

  /** Add a breadcrumb for context */
  addBreadcrumb(category: string, message: string, level: Breadcrumb["level"] = "info", data?: Record<string, unknown>) {
    this.breadcrumbs.push({
      timestamp: new Date().toISOString(),
      category,
      message,
      level,
      data,
    });
    if (this.breadcrumbs.length > MAX_BREADCRUMBS) {
      this.breadcrumbs = this.breadcrumbs.slice(-MAX_BREADCRUMBS);
    }
  }

  /** Capture an error — sends to Sentry if available, otherwise buffers locally */
  captureError(error: Error, context?: Record<string, unknown>) {
    if (this.sentryEnabled) {
      Sentry.withScope((scope) => {
        if (context) {
          scope.setExtras(context);
        }
        if (this.userId) {
          scope.setUser({ id: this.userId });
        }
        Sentry.captureException(error);
      });
    }

    // Always store locally for Platform Health dashboard
    const event: ErrorEvent = {
      id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: new Date().toISOString(),
      level: "error",
      message: error.message,
      stack: error.stack,
      tags: { ...this.tags, ...(this.userId ? { userId: this.userId } : {}) },
      breadcrumbs: [...this.breadcrumbs],
      context: context || {},
      url: window.location.href,
      userAgent: navigator.userAgent,
    };

    this.events.push(event);
    if (this.events.length > MAX_EVENTS) {
      this.events = this.events.slice(-MAX_EVENTS);
    }

    // Store in sessionStorage for Platform Health dashboard
    if (!this.sentryEnabled) {
      try {
        const stored = JSON.parse(sessionStorage.getItem("nelvyon_errors") || "[]");
        stored.push({ id: event.id, ts: event.timestamp, msg: event.message, url: event.url });
        if (stored.length > 50) stored.splice(0, stored.length - 50);
        sessionStorage.setItem("nelvyon_errors", JSON.stringify(stored));
      } catch {
        // sessionStorage full or unavailable
      }
    }

    if (import.meta.env.DEV) {
      console.error("[Monitoring]", error.message, context);
    }
  }

  /** Capture a warning */
  captureWarning(message: string, context?: Record<string, unknown>) {
    if (this.sentryEnabled) {
      Sentry.withScope((scope) => {
        scope.setLevel("warning");
        if (context) scope.setExtras(context);
        Sentry.captureMessage(message);
      });
    }

    this.events.push({
      id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: new Date().toISOString(),
      level: "warning",
      message,
      tags: { ...this.tags },
      breadcrumbs: [...this.breadcrumbs],
      context: context || {},
      url: window.location.href,
      userAgent: navigator.userAgent,
    });
  }

  /** Track a performance metric */
  trackPerformance(name: string, value: number, tags?: Record<string, string>) {
    this.performanceEntries.push({
      name,
      value,
      timestamp: new Date().toISOString(),
      tags: { ...this.tags, ...tags },
    });

    // Store Web Vitals in sessionStorage for Platform Health
    if (["lcp", "fid", "cls"].includes(name)) {
      try {
        const vitals = JSON.parse(sessionStorage.getItem("nelvyon_vitals") || "{}");
        vitals[name] = value;
        sessionStorage.setItem("nelvyon_vitals", JSON.stringify(vitals));
      } catch {
        // ignore
      }
    }
  }

  /** Get all captured events (for Platform Health dashboard) */
  getEvents(): ErrorEvent[] {
    return [...this.events];
  }

  /** Get performance entries */
  getPerformanceEntries(): PerformanceEntry[] {
    return [...this.performanceEntries];
  }

  /** Get current breadcrumbs */
  getBreadcrumbs(): Breadcrumb[] {
    return [...this.breadcrumbs];
  }

  /** Whether Sentry SDK is active */
  isSentryActive(): boolean {
    return this.sentryEnabled;
  }

  /** Flush events to backend (if configured) */
  async flush(): Promise<void> {
    if (this.events.length === 0 && this.performanceEntries.length === 0) return;

    // If Sentry is active, it handles its own flushing
    if (this.sentryEnabled) {
      await Sentry.flush(2000);
      this.events = [];
      this.performanceEntries = [];
      return;
    }

    const payload = {
      events: [...this.events],
      performance: [...this.performanceEntries],
      sessionId: sessionStorage.getItem("nelvyon_session_id") || "unknown",
    };

    this.events = [];
    this.performanceEntries = [];

    try {
      const endpoint = import.meta.env.VITE_MONITORING_ENDPOINT;
      if (endpoint) {
        await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true,
        });
      }
    } catch {
      // Silently fail — monitoring should never break the app
    }
  }

  /** Cleanup */
  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.flush();
    this.initialized = false;
  }
}

// Singleton instance
export const monitoring = new MonitoringService();

// Re-export Sentry for advanced usage (ErrorBoundary, etc.)
export { Sentry };

// Type declarations for Web Vitals
interface LayoutShift extends PerformanceEntry {
  value: number;
  hadRecentInput: boolean;
}

interface PerformanceEventTiming extends PerformanceEntry {
  processingStart: number;
}