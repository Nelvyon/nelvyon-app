/**
 * NELVYON Private AI — egress policy with strict allowlist.
 * Default PRIVATE_MODE=ON blocks Internet; allows localhost + Docker private networks.
 */
export type OutboundKind =
  | "remote_llm"
  | "openclaw_bridge"
  | "mcp_local"
  | "external_fetch"
  | "telemetry";

export class PrivateModeBlockedError extends Error {
  readonly code = "PRIVATE_MODE_BLOCKED" as const;

  constructor(
    public readonly kind: OutboundKind,
    detail?: string,
  ) {
    super(
      detail ??
        `PRIVATE_MODE blocks ${kind}. Set PRIVATE_MODE_INTERNET_UNTIL for owner-authorized window.`,
    );
    this.name = "PrivateModeBlockedError";
  }
}

const PRIVATE_IPV4_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
];

function parseTruthy(raw: string | undefined): boolean | null {
  if (raw == null || raw === "") return null;
  const v = raw.trim();
  if (v === "0" || v.toUpperCase() === "OFF" || v.toLowerCase() === "false") return false;
  if (v === "1" || v.toUpperCase() === "ON" || v.toLowerCase() === "true") return true;
  return null;
}

export function isPrivateMode(): boolean {
  const explicit =
    parseTruthy(process.env.PRIVATE_MODE) ??
    parseTruthy(process.env.NELVYON_PRIVATE_MODE);
  if (explicit !== null) return explicit;
  return true;
}

export function isInternetTaskAuthorized(): boolean {
  const until = process.env.PRIVATE_MODE_INTERNET_UNTIL?.trim();
  if (!until) return false;
  const ts = Date.parse(until);
  return Number.isFinite(ts) && Date.now() < ts;
}

function extraAllowedHosts(): Set<string> {
  const raw = process.env.PRIVATE_MODE_ALLOWED_HOSTS ?? "";
  return new Set(
    raw
      .split(",")
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** Host allowlist: loopback, Docker internal, .local, host.docker.internal, env extras. */
export function isAllowedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host === "::1") return true;
  if (host === "host.docker.internal") return true;
  if (host.endsWith(".local")) return true;
  if (extraAllowedHosts().has(host)) return true;
  return PRIVATE_IPV4_PATTERNS.some((re) => re.test(host));
}

function isRemoteLlmHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h.includes("openai.com") ||
    h.includes("anthropic.com") ||
    h.includes("api.openai.com") ||
    h.includes("api.anthropic.com")
  );
}

export function assertUrlAllowed(url: string, kind: OutboundKind): void {
  if (!isPrivateMode() || isInternetTaskAuthorized()) return;

  if (kind === "remote_llm" || kind === "telemetry") {
    throw new PrivateModeBlockedError(kind, `${kind} blocked in PRIVATE_MODE=ON.`);
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new PrivateModeBlockedError(kind, `Invalid URL: ${url}`);
  }

  const host = parsed.hostname;
  if (isRemoteLlmHost(host)) {
    throw new PrivateModeBlockedError("remote_llm", `Remote LLM host blocked: ${host}`);
  }

  if (!isAllowedHost(host)) {
    throw new PrivateModeBlockedError(
      kind,
      `Host "${host}" not in PRIVATE_MODE allowlist (localhost/Docker private only).`,
    );
  }
}

export function assertPrivateOutboundAllowed(kind: OutboundKind, detail?: string): void {
  if (!isPrivateMode() || isInternetTaskAuthorized()) return;
  if (kind === "remote_llm" || kind === "telemetry") {
    throw new PrivateModeBlockedError(kind, detail);
  }
}

/** @deprecated use assertUrlAllowed */
export function assertLocalRuntimeUrl(url: string): void {
  assertUrlAllowed(url, "external_fetch");
}

export function getPrivateModeStatus(): {
  privateMode: boolean;
  internetTaskAuthorized: boolean;
  internetUntil: string | null;
  allowedHosts: string[];
} {
  return {
    privateMode: isPrivateMode(),
    internetTaskAuthorized: isInternetTaskAuthorized(),
    internetUntil: process.env.PRIVATE_MODE_INTERNET_UNTIL?.trim() || null,
    allowedHosts: [
      "127.0.0.1",
      "localhost",
      "::1",
      "host.docker.internal",
      "10.0.0.0/8",
      "172.16.0.0/12",
      "192.168.0.0/16",
      ...Array.from(extraAllowedHosts()),
    ],
  };
}

export function resetPrivateModeForTests(): void {
  delete process.env.PRIVATE_MODE;
  delete process.env.NELVYON_PRIVATE_MODE;
  delete process.env.PRIVATE_MODE_INTERNET_UNTIL;
  delete process.env.PRIVATE_MODE_ALLOWED_HOSTS;
}

/** Fetch wrapper — enforces PRIVATE_MODE allowlist on outbound URLs. */
export async function privateModeFetch(
  url: string,
  kind: OutboundKind,
  init?: RequestInit,
): Promise<Response> {
  assertUrlAllowed(url, kind);
  return fetch(url, init);
}
