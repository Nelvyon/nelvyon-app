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
  // Tailscale CGNAT (Option A mesh) — private overlay, not public Internet
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
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

function isTailscaleMagicDns(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/\.$/, "");
  return h.endsWith(".ts.net");
}

/** Host allowlist: loopback, Docker internal, Tailscale mesh, .local, env extras. */
export function isAllowedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host === "::1") return true;
  if (host === "host.docker.internal") return true;
  if (host.endsWith(".local")) return true;
  if (isTailscaleMagicDns(host)) return true;
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
      "100.64.0.0/10",
      "*.ts.net",
      ...Array.from(extraAllowedHosts()),
    ],
  };
}

export function resetPrivateModeForTests(): void {
  delete process.env.PRIVATE_MODE;
  delete process.env.NELVYON_PRIVATE_MODE;
  delete process.env.PRIVATE_MODE_INTERNET_UNTIL;
  delete process.env.PRIVATE_MODE_ALLOWED_HOSTS;
  delete process.env.NELVYON_MESH_OPTION_A;
  delete process.env.NELVYON_MESH_HTTP_PROXY;
  delete process.env.HTTP_PROXY;
  delete process.env.ALL_PROXY;
}

function meshHttpProxyUrl(): string | null {
  if (process.env.NELVYON_MESH_OPTION_A?.trim() !== "1") return null;
  const raw =
    process.env.NELVYON_MESH_HTTP_PROXY?.trim() ||
    process.env.HTTP_PROXY?.trim() ||
    (process.env.ALL_PROXY?.trim()?.startsWith("http")
      ? process.env.ALL_PROXY.trim()
      : "");
  return raw || null;
}

function hostNeedsMeshProxy(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (isTailscaleMagicDns(host)) return true;
  return /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./.test(host);
}

/**
 * HTTP via an HTTP forward proxy (Tailscale `--http-proxy` on :1055).
 * Absolute-form requests — matches Option A Ollama over Tailscale CGNAT (http://100.x:11434).
 * Uses Node builtins only (no undici). HTTPS mesh targets are out of scope for Option A.
 */
async function fetchViaHttpProxy(
  targetUrl: string,
  proxyUrl: string,
  init?: RequestInit,
): Promise<Response> {
  const http = await import("node:http");
  const { URL } = await import("node:url");

  const target = new URL(targetUrl);
  if (target.protocol !== "http:") {
    throw new Error(
      `privateModeFetch: mesh HTTP proxy supports http:// only (got ${target.protocol})`,
    );
  }
  const proxy = new URL(proxyUrl);
  const method = (init?.method ?? "GET").toUpperCase();
  const headers: Record<string, string> = {
    Host: target.host,
  };
  if (init?.headers) {
    const h = new Headers(init.headers);
    h.forEach((value, key) => {
      if (key.toLowerCase() === "host") return;
      headers[key] = value;
    });
  }

  let body: Buffer | undefined;
  if (init?.body != null) {
    if (typeof init.body === "string") body = Buffer.from(init.body);
    else if (init.body instanceof Uint8Array) body = Buffer.from(init.body);
    else if (init.body instanceof ArrayBuffer) body = Buffer.from(init.body);
    else {
      throw new Error(
        "privateModeFetch: unsupported body type through mesh HTTP proxy",
      );
    }
    if (!headers["Content-Length"] && !headers["content-length"]) {
      headers["Content-Length"] = String(body.length);
    }
  }

  const proxyPort = Number(proxy.port || (proxy.protocol === "https:" ? 443 : 80));

  return new Promise<Response>((resolve, reject) => {
    const req = http.request(
      {
        host: proxy.hostname,
        port: proxyPort,
        method,
        path: targetUrl,
        headers,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(Buffer.from(c)));
        res.on("end", () => {
          const buf = Buffer.concat(chunks);
          const outHeaders = new Headers();
          for (const [k, v] of Object.entries(res.headers)) {
            if (v == null || k.toLowerCase() === "transfer-encoding") continue;
            if (Array.isArray(v)) v.forEach((item) => outHeaders.append(k, item));
            else outHeaders.set(k, v);
          }
          resolve(
            new Response(buf, {
              status: res.statusCode ?? 502,
              statusText: res.statusMessage ?? "",
              headers: outHeaders,
            }),
          );
        });
      },
    );
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

/** Fetch wrapper — enforces PRIVATE_MODE allowlist; mesh hosts via Tailscale HTTP proxy. */
export async function privateModeFetch(
  url: string,
  kind: OutboundKind,
  init?: RequestInit,
): Promise<Response> {
  assertUrlAllowed(url, kind);
  let hostname = "";
  try {
    hostname = new URL(url).hostname;
  } catch {
    return fetch(url, init);
  }
  const proxy = meshHttpProxyUrl();
  if (proxy && hostNeedsMeshProxy(hostname)) {
    return fetchViaHttpProxy(url, proxy, init);
  }
  return fetch(url, init);
}
