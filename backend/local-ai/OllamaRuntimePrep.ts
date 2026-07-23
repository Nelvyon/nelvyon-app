/**
 * Safe prep helpers for private Ollama runtime — fail-closed.
 * Mesh Option A: Tailscale CGNAT / MagicDNS only. No Funnel/Serve/public bind.
 * Cost 0. Does not install Tailscale.
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

/** Tailscale CGNAT IPv4 (100.64.0.0/10). */
export function isTailscaleCgnatIpv4(hostname: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(hostname.trim());
  if (!m) return false;
  const a = Number(m[1]);
  const b = Number(m[2]);
  if (![a, b, Number(m[3]), Number(m[4])].every((n) => Number.isInteger(n) && n >= 0 && n <= 255)) {
    return false;
  }
  // 100.64.0.0 – 100.127.255.255
  return a === 100 && b >= 64 && b <= 127;
}

/** Tailscale MagicDNS (*.ts.net). */
export function isTailscaleMagicDns(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/\.$/, "");
  return h.endsWith(".ts.net");
}

export function isPrivateMeshOllamaHost(hostname: string): boolean {
  return isTailscaleCgnatIpv4(hostname) || isTailscaleMagicDns(hostname);
}

/**
 * Staging/production must not point Ollama at the CEO laptop loopback.
 * Remote runtimes must use Tailscale CGNAT / MagicDNS only (Option A).
 * Local/dev may use loopback (Option C).
 */
export function assertOllamaHostSafeForRuntime(opts?: {
  /** When true, loopback is allowed (local cert/dev). */
  allowLoopback?: boolean;
  /** When true (default on Railway/production), require Tailscale mesh host. */
  requirePrivateMesh?: boolean;
}): OllamaHostSafety {
  const allowLoopback =
    opts?.allowLoopback ??
    (process.env.NODE_ENV !== "production" && process.env.RAILWAY_ENVIRONMENT !== "production");
  const requirePrivateMesh =
    opts?.requirePrivateMesh ??
    (process.env.RAILWAY_ENVIRONMENT === "production" ||
      process.env.RAILWAY_ENVIRONMENT === "staging" ||
      process.env.NELVYON_MESH_OPTION_A?.trim() === "1" ||
      (!allowLoopback && process.env.NODE_ENV === "production"));
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
  if (requirePrivateMesh && !isLoopbackHostname(url.hostname) && !isPrivateMeshOllamaHost(url.hostname)) {
    return {
      ok: false,
      host,
      reason: "OLLAMA_HOST_not_tailscale_mesh",
      allowsLoopback: allowLoopback,
    };
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
  probeTimeoutMsDefault: number;
  rollbackHints: string[];
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
      "CEO mesh Option A: staging only — see docs/ops/MESH_OPTION_A_STAGING.md",
      "Do not set OLLAMA_HOST=localhost from Railway",
      "Do not set AUTONOMOUS_ALLOW_OPENAI=1 by default",
      "Do not enable Funnel/Serve/exit-node/subnet-routing",
      "Do not install Tailscale on production",
    ],
    probeTimeoutMsDefault: 5_000,
    rollbackHints: [
      "Unset OLLAMA_HOST / OLLAMA_BASE_URL / OLLAMA_CONFIGURED / TS_AUTHKEY",
      "Set NELVYON_MESH_OPTION_A=0 · NELVYON_AI_ENABLED=0",
      "Set AUTONOMOUS_QUALITY_ROUTING=0 · NELVYON_LOCAL_ROUTER_ENABLED=0",
      "Verify /api/health/ready after env rollback",
    ],
  };
}

/** Ops metrics-shaped probe (fail-closed) — safe when IA OFF. */
export async function collectLocalAiPrepMetrics(opts?: {
  timeoutMs?: number;
  allowLoopback?: boolean;
}): Promise<{
  prepared: boolean;
  qualityRouting: boolean;
  hostOk: boolean;
  probeOk: boolean;
  latencyMs: number;
  reason: string;
}> {
  const snap = getLocalAiRuntimePrepSnapshot();
  const probe = await probeOllamaHealth({
    timeoutMs: opts?.timeoutMs ?? snap.probeTimeoutMsDefault,
    allowLoopback: opts?.allowLoopback,
  });
  return {
    prepared: snap.hostSafety.ok && !snap.qualityRouting,
    qualityRouting: snap.qualityRouting,
    hostOk: snap.hostSafety.ok,
    probeOk: probe.ok,
    latencyMs: probe.latencyMs,
    reason: probe.ok ? "ok" : probe.reason || snap.hostSafety.reason,
  };
}
