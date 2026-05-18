/**
 * Observability Module — Battle-ready client-side metrics collection.
 * Tracks: API latency, error rates, AI call stats, module usage.
 * Flow-level metrics for critical paths: onboarding, CRM→IA→QA, payments, helpdesk.
 * APM hooks prepared for external integration (Datadog, Sentry, New Relic).
 */

export interface MetricEntry {
  timestamp: number;
  endpoint: string;
  module: string;
  latencyMs: number;
  status: "success" | "error" | "timeout";
  statusCode?: number;
  isAI?: boolean;
  flowId?: string;
  userId?: string;
}

export interface ModuleUsage {
  module: string;
  views: number;
  apiCalls: number;
  errors: number;
  lastAccessed: number;
}

/** Critical business flow definitions */
export type CriticalFlow =
  | "onboarding"
  | "crm_ia_qa"
  | "marketing"
  | "payments"
  | "helpdesk";

export interface FlowMetrics {
  flowId: CriticalFlow;
  label: string;
  totalCalls: number;
  successCalls: number;
  errorCalls: number;
  timeoutCalls: number;
  errorRate: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  lastError?: { message: string; timestamp: number; endpoint: string };
  steps: FlowStep[];
}

export interface FlowStep {
  name: string;
  endpoint: string;
  avgLatencyMs: number;
  errorRate: number;
  callCount: number;
}

export interface HealthSummary {
  totalRequests: number;
  successRate: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  errorsByEndpoint: Record<string, number>;
  aiCalls: { total: number; success: number; avgLatencyMs: number };
  moduleUsage: ModuleUsage[];
  uptimeMinutes: number;
  lastUpdated: number;
  flowMetrics: FlowMetrics[];
  recentErrors: ErrorEntry[];
}

/** Structured error entry with full context */
export interface ErrorEntry {
  timestamp: number;
  module: string;
  endpoint: string;
  userId?: string;
  error: string;
  statusCode?: number;
  payloadKeys?: string[];
  flowId?: CriticalFlow;
  severity: "low" | "medium" | "high" | "critical";
}

// ── Flow → endpoint mapping ──
const FLOW_ENDPOINTS: Record<CriticalFlow, { label: string; endpoints: string[] }> = {
  onboarding: {
    label: "Onboarding (Registro → Primer Cliente)",
    endpoints: [
      "auth/register", "auth/login", "user_roles", "nelvyon_user_settings",
      "nelvyon_clients/create", "nelvyon_projects/create",
    ],
  },
  crm_ia_qa: {
    label: "CRM → IA → QA (Flujo Principal)",
    endpoints: [
      "nelvyon_clients", "nelvyon_projects", "orchestrator/generate",
      "aihub/gentxt", "qa/validate", "nelvyon_outputs",
    ],
  },
  marketing: {
    label: "Marketing (Campañas & Contenido)",
    endpoints: [
      "nelvyon_campaigns", "campaigns", "contacts", "nelvyon_assets",
      "segment_results", "orchestrator/generate-social",
      "orchestrator/generate-ads", "orchestrator/generate-email",
    ],
  },
  payments: {
    label: "Pagos & Facturación",
    endpoints: [
      "revenue_records", "subscriptions", "sales_records",
      "stripe", "payment", "billing",
    ],
  },
  helpdesk: {
    label: "Soporte & Helpdesk",
    endpoints: [
      "helpdesk_tickets", "conversations", "messages",
      "activities", "aihub/gentxt",
    ],
  },
};

// ── Internal stores (in-memory, ring buffer) ──
const MAX_ENTRIES = 3000;
const MAX_ERRORS = 500;
const _metrics: MetricEntry[] = [];
const _errors: ErrorEntry[] = [];
const _moduleUsage = new Map<string, ModuleUsage>();
const _startTime = Date.now();

// ── Rate limiter state ──
const _rateLimits = new Map<string, { count: number; windowStart: number }>();

// ── APM Hooks (external integration points) ──
type APMHook = (entry: MetricEntry) => void;
type ErrorHook = (entry: ErrorEntry) => void;
const _apmHooks: APMHook[] = [];
const _errorHooks: ErrorHook[] = [];

/**
 * Register an APM hook for external integration.
 * Called on every metric recording — use for Datadog, Sentry, New Relic, etc.
 *
 * Example (Datadog):
 *   registerAPMHook((entry) => {
 *     window.DD_RUM?.addAction(entry.endpoint, {
 *       latency: entry.latencyMs,
 *       status: entry.status,
 *       module: entry.module,
 *     });
 *   });
 *
 * Example (Sentry):
 *   registerAPMHook((entry) => {
 *     if (entry.status !== 'success') {
 *       Sentry.captureMessage(`API Error: ${entry.endpoint}`, {
 *         level: 'warning',
 *         extra: { latency: entry.latencyMs, module: entry.module },
 *       });
 *     }
 *   });
 */
export function registerAPMHook(hook: APMHook) {
  _apmHooks.push(hook);
}

/**
 * Register an error hook for external error tracking.
 * Called on every error — use for Sentry, Bugsnag, etc.
 *
 * Example (Sentry):
 *   registerErrorHook((err) => {
 *     Sentry.captureException(new Error(err.error), {
 *       tags: { module: err.module, flow: err.flowId },
 *       extra: { endpoint: err.endpoint, severity: err.severity },
 *     });
 *   });
 */
export function registerErrorHook(hook: ErrorHook) {
  _errorHooks.push(hook);
}

/** Determine which flow an endpoint belongs to */
function detectFlow(endpoint: string): CriticalFlow | undefined {
  for (const [flowId, config] of Object.entries(FLOW_ENDPOINTS)) {
    if (config.endpoints.some((ep) => endpoint.includes(ep))) {
      return flowId as CriticalFlow;
    }
  }
  return undefined;
}

/** Determine error severity based on context */
function determineSeverity(
  status: string,
  endpoint: string,
  flowId?: CriticalFlow,
): "low" | "medium" | "high" | "critical" {
  // Payment errors are always critical
  if (flowId === "payments" && status !== "success") return "critical";
  // Auth errors are high
  if (endpoint.includes("auth/") && status !== "success") return "high";
  // AI generation failures are medium
  if (endpoint.includes("generate") || endpoint.includes("aihub")) return "medium";
  // Timeouts are medium
  if (status === "timeout") return "medium";
  return "low";
}

/** Record an API call metric */
export function recordMetric(entry: Omit<MetricEntry, "timestamp">) {
  const full: MetricEntry = {
    ...entry,
    timestamp: Date.now(),
    flowId: entry.flowId || detectFlow(entry.endpoint),
  };
  _metrics.push(full);
  if (_metrics.length > MAX_ENTRIES) _metrics.shift();

  // Update module usage
  const mu = _moduleUsage.get(entry.module) ?? {
    module: entry.module,
    views: 0,
    apiCalls: 0,
    errors: 0,
    lastAccessed: 0,
  };
  mu.apiCalls++;
  if (entry.status === "error" || entry.status === "timeout") mu.errors++;
  mu.lastAccessed = Date.now();
  _moduleUsage.set(entry.module, mu);

  // Fire APM hooks
  for (const hook of _apmHooks) {
    try {
      hook(full);
    } catch (err) {

      if (import.meta.env.DEV) console.warn("[observability] Error (/* APM hook failure must never break the app */):", err);

    }
  }
}

/** Record a structured error with full context */
export function recordError(entry: Omit<ErrorEntry, "timestamp" | "severity">) {
  const full: ErrorEntry = {
    ...entry,
    timestamp: Date.now(),
    severity: determineSeverity(
      "error",
      entry.endpoint,
      entry.flowId,
    ),
  };
  _errors.push(full);
  if (_errors.length > MAX_ERRORS) _errors.shift();

  // Fire error hooks
  for (const hook of _errorHooks) {
    try {
      hook(full);
    } catch (err) {

      if (import.meta.env.DEV) console.warn("[observability] Error (/* Error hook failure must never break the app */):", err);

    }
  }
}

/** Record a page view for a module */
export function recordPageView(module: string) {
  const mu = _moduleUsage.get(module) ?? {
    module,
    views: 0,
    apiCalls: 0,
    errors: 0,
    lastAccessed: 0,
  };
  mu.views++;
  mu.lastAccessed = Date.now();
  _moduleUsage.set(module, mu);
}

/** Client-side rate limiter: returns true if request should be BLOCKED */
export function isRateLimited(
  key: string,
  maxRequests: number = 30,
  windowMs: number = 60_000,
): boolean {
  const now = Date.now();
  const entry = _rateLimits.get(key);

  if (!entry || now - entry.windowStart > windowMs) {
    _rateLimits.set(key, { count: 1, windowStart: now });
    return false;
  }

  entry.count++;
  if (entry.count > maxRequests) return true;
  return false;
}

/** Calculate flow-level metrics */
function calculateFlowMetrics(
  windowMinutes: number,
): FlowMetrics[] {
  const cutoff = Date.now() - windowMinutes * 60_000;
  const recent = _metrics.filter((m) => m.timestamp >= cutoff);

  return (Object.entries(FLOW_ENDPOINTS) as [CriticalFlow, typeof FLOW_ENDPOINTS[CriticalFlow]][]).map(
    ([flowId, config]) => {
      const flowMetrics = recent.filter(
        (m) => m.flowId === flowId || config.endpoints.some((ep) => m.endpoint.includes(ep)),
      );

      const total = flowMetrics.length;
      const success = flowMetrics.filter((m) => m.status === "success").length;
      const errors = flowMetrics.filter((m) => m.status === "error").length;
      const timeouts = flowMetrics.filter((m) => m.status === "timeout").length;
      const latencies = flowMetrics.map((m) => m.latencyMs).sort((a, b) => a - b);
      const avgLatency = total > 0 ? latencies.reduce((a, b) => a + b, 0) / total : 0;
      const p95Index = Math.floor(latencies.length * 0.95);

      // Last error for this flow
      const flowErrors = _errors.filter((e) => e.flowId === flowId);
      const lastError = flowErrors.length > 0
        ? flowErrors[flowErrors.length - 1]
        : undefined;

      // Per-step breakdown
      const steps: FlowStep[] = config.endpoints.map((ep) => {
        const stepMetrics = flowMetrics.filter((m) => m.endpoint.includes(ep));
        const stepTotal = stepMetrics.length;
        const stepErrors = stepMetrics.filter((m) => m.status !== "success").length;
        const stepLatencies = stepMetrics.map((m) => m.latencyMs);
        return {
          name: ep.split("/").pop() || ep,
          endpoint: ep,
          avgLatencyMs: stepTotal > 0
            ? Math.round(stepLatencies.reduce((a, b) => a + b, 0) / stepTotal)
            : 0,
          errorRate: stepTotal > 0 ? (stepErrors / stepTotal) * 100 : 0,
          callCount: stepTotal,
        };
      }).filter((s) => s.callCount > 0);

      return {
        flowId,
        label: config.label,
        totalCalls: total,
        successCalls: success,
        errorCalls: errors,
        timeoutCalls: timeouts,
        errorRate: total > 0 ? (errors / total) * 100 : 0,
        avgLatencyMs: Math.round(avgLatency),
        p95LatencyMs: latencies[p95Index] ?? 0,
        lastError: lastError
          ? { message: lastError.error, timestamp: lastError.timestamp, endpoint: lastError.endpoint }
          : undefined,
        steps,
      };
    },
  );
}

/** Get comprehensive health summary */
export function getHealthSummary(windowMinutes: number = 60): HealthSummary {
  const cutoff = Date.now() - windowMinutes * 60_000;
  const recent = _metrics.filter((m) => m.timestamp >= cutoff);

  const total = recent.length;
  const successes = recent.filter((m) => m.status === "success").length;
  const latencies = recent.map((m) => m.latencyMs).sort((a, b) => a - b);
  const avgLatency = total > 0 ? latencies.reduce((a, b) => a + b, 0) / total : 0;
  const p95Index = Math.floor(latencies.length * 0.95);
  const p95Latency = latencies[p95Index] ?? 0;

  // Errors by endpoint
  const errorsByEndpoint: Record<string, number> = {};
  recent
    .filter((m) => m.status !== "success")
    .forEach((m) => {
      errorsByEndpoint[m.endpoint] = (errorsByEndpoint[m.endpoint] || 0) + 1;
    });

  // AI stats
  const aiMetrics = recent.filter((m) => m.isAI);
  const aiSuccess = aiMetrics.filter((m) => m.status === "success").length;
  const aiLatencies = aiMetrics.map((m) => m.latencyMs);
  const aiAvgLatency =
    aiLatencies.length > 0
      ? aiLatencies.reduce((a, b) => a + b, 0) / aiLatencies.length
      : 0;

  return {
    totalRequests: total,
    successRate: total > 0 ? (successes / total) * 100 : 100,
    avgLatencyMs: Math.round(avgLatency),
    p95LatencyMs: Math.round(p95Latency),
    errorsByEndpoint,
    aiCalls: {
      total: aiMetrics.length,
      success: aiSuccess,
      avgLatencyMs: Math.round(aiAvgLatency),
    },
    moduleUsage: Array.from(_moduleUsage.values()),
    uptimeMinutes: Math.round((Date.now() - _startTime) / 60_000),
    lastUpdated: Date.now(),
    flowMetrics: calculateFlowMetrics(windowMinutes),
    recentErrors: _errors.slice(-50),
  };
}

/** Get raw metrics for charting (last N minutes) */
export function getRecentMetrics(windowMinutes: number = 30): MetricEntry[] {
  const cutoff = Date.now() - windowMinutes * 60_000;
  return _metrics.filter((m) => m.timestamp >= cutoff);
}

/** Get recent errors with full context */
export function getRecentErrors(limit: number = 50): ErrorEntry[] {
  return _errors.slice(-limit);
}

/** Get flow metrics for a specific flow */
export function getFlowMetrics(flowId: CriticalFlow, windowMinutes: number = 60): FlowMetrics | undefined {
  return calculateFlowMetrics(windowMinutes).find((f) => f.flowId === flowId);
}

/** Reset all metrics (for testing) */
export function resetMetrics() {
  _metrics.length = 0;
  _errors.length = 0;
  _moduleUsage.clear();
  _rateLimits.clear();
}