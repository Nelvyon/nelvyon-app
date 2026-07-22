/**
 * Safe prep helpers for private Ollama runtime — fail-closed, no mesh install.
 * Does NOT activate Tailscale/WireGuard/remote Ollama. Cost 0.
 */
export type OllamaHostSafety = {
  ok: boolean;
  host: string | null;
  reason: string;
  allowsLoopback: boolean;
};

function readOllamaBaseUrl(): string | null {
  const raw =
    process.env.OLLAMA_HOST?.trim() ||
    process.env.OLLAMA_BASE_URL?.trim() ||
    process.env.NELVYON_LOCAL_AI_URL?.trim() ||
    process.env.LOCAL_AI_BASE_URL?.trim() ||
    "";
  return raw ? raw.replace(/\/$/, "") : null;
}

function isLoopbackHostname(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "0.0.0.0";
}

/**
 * Staging/production must not point Ollama at the CEO laptop loopback.
 * Local/dev may use loopback (Option C).
 */
export function assertOllamaHostSafeForRuntime(opts?: {
  /** When true, loopback is allowed (local cert/dev). */
  allowLoopback?: boolean;
}): OllamaHostSafety {
  const allowLoopback =
    opts?.allowLoopback ??
    (process.env.NODE_ENV !== "production" && process.env.RAILWAY_ENVIRONMENT !== "production");
  const host = readOllamaBaseUrl();
  if (!host) {
    return { ok: false, host: null, reason: "OLLAMA_HOST_unset", allowsLoopback: allowLoopback };
  }
  let url: URL;
  try {
    url = new URL(host);
  } catch {
    return { ok: false, host, reason: "OLLAMA_HOST_invalid_url", allowsLoopback: allowLoopback };
  }
  if (isLoopbackHostname(url.hostname) && !allowLoopback) {
    return {
      ok: false,
      host,
      reason: "OLLAMA_HOST_loopback_forbidden_on_remote_runtime",
      allowsLoopback: allowLoopback,
    };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, host, reason: "OLLAMA_HOST_bad_protocol", allowsLoopback: allowLoopback };
  }
  return { ok: true, host, reason: "ok", allowsLoopback: allowLoopback };
}

export type OllamaHealthResult = {
  ok: boolean;
  status: number | null;
  latencyMs: number;
  reason: string;
  host: string | null;
};

/**
 * Probe Ollama /api/tags with timeout. Fail-closed on any error.
 * Safe to call when IA OFF — does not enable flags.
 */
export async function probeOllamaHealth(opts?: {
  timeoutMs?: number;
  allowLoopback?: boolean;
}): Promise<OllamaHealthResult> {
  const safety = assertOllamaHostSafeForRuntime({ allowLoopback: opts?.allowLoopback });
  if (!safety.ok || !safety.host) {
    return {
      ok: false,
      status: null,
      latencyMs: 0,
      reason: safety.reason,
      host: safety.host,
    };
  }
  const timeoutMs = Math.max(500, opts?.timeoutMs ?? 5_000);
  const started = Date.now();
  try {
    const res = await fetch(`${safety.host}/api/tags`, {
      method: "GET",
      signal: AbortSignal.timeout(timeoutMs),
    });
    const latencyMs = Date.now() - started;
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        latencyMs,
        reason: `http_${res.status}`,
        host: safety.host,
      };
    }
    return { ok: true, status: res.status, latencyMs, reason: "ok", host: safety.host };
  } catch (e) {
    return {
      ok: false,
      status: null,
      latencyMs: Date.now() - started,
      reason: e instanceof Error ? e.message.slice(0, 120) : "probe_failed",
      host: safety.host,
    };
  }
}

/** Snapshot for ops / canary prep — never enables IA. */
export function getLocalAiRuntimePrepSnapshot(): {
  qualityRouting: boolean;
  ollamaConfiguredFlag: boolean;
  hostSafety: OllamaHostSafety;
  strategyModel: string | null;
  fastModel: string | null;
  neoActivationBlocked: string[];
} {
  const hostSafety = assertOllamaHostSafeForRuntime();
  return {
    qualityRouting: process.env.AUTONOMOUS_QUALITY_ROUTING?.trim() === "1",
    ollamaConfiguredFlag:
      process.env.OLLAMA_CONFIGURED?.trim() === "1" ||
      process.env.NELVYON_LOCAL_AI_CONFIGURED?.trim() === "1",
    hostSafety,
    strategyModel: process.env.OLLAMA_STRATEGY_MODEL?.trim() || null,
    fastModel: process.env.OLLAMA_MODEL?.trim() || null,
    neoActivationBlocked: [
      "CEO must approve Option A/B in ARCHITECTURE_LOCAL_AI_RUNTIME.md",
      "Do not set OLLAMA_HOST=localhost from Railway",
      "Do not set AUTONOMOUS_ALLOW_OPENAI=1 by default",
      "Do not install Tailscale/WireGuard without CEO approval",
    ],
  };
}
