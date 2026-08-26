/**
 * Block SSRF via tenant-controlled egress URLs (webhooks, Teams hooks, etc.).
 * Requires https; rejects loopback, link-local, private RFC1918, and cloud metadata.
 */
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.google.com",
]);

function isBlockedIpv4(host: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(host);
  if (!m) return false;
  const octets = m.slice(1).map((x) => Number(x));
  if (octets.some((n) => n > 255)) return true;
  const [a, b] = octets as [number, number, number, number];
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}

/**
 * La IPv4 escondida dentro de una IPv6, si la hay.
 *
 * Node normaliza `[::ffff:127.0.0.1]` a `[::ffff:7f00:1]`, asi que mirar
 * prefijos de texto no basta: ni `7f00:1` ni `a9fe:a9fe` empiezan por `::1`,
 * `fc`, `fd` ni `fe80`, y por ahi se salia al loopback, a los metadatos de la
 * instancia y a la red privada. Se extraen los ultimos 32 bits y se comprueban
 * con la MISMA regla de IPv4 — una sola regla, no dos que diverjan.
 *
 * Cubre las tres formas que llevan una IPv4 dentro:
 *   - `::ffff:a.b.c.d`   mapeada, la que usa todo el mundo
 *   - `::a.b.c.d`        compatible, obsoleta pero aun enrutable
 *   - `64:ff9b::a.b.c.d` el prefijo bien conocido de NAT64
 */
function ipv4DentroDeIpv6(host: string): string | null {
  const h = host.toLowerCase();
  // Con la IPv4 escrita en decimal al final.
  const decimal = /^(?:64:ff9b)?::(?:ffff:)?(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(h);
  if (decimal) return decimal[1] ?? null;
  // Con los ultimos 32 bits en hexadecimal, que es como los normaliza Node.
  const hex = /^(?:64:ff9b)?::(?:ffff:)?([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(h);
  if (!hex) return null;
  const alto = Number.parseInt(hex[1] ?? "", 16);
  const bajo = Number.parseInt(hex[2] ?? "", 16);
  if (!Number.isFinite(alto) || !Number.isFinite(bajo)) return null;
  return [alto >> 8, alto & 0xff, bajo >> 8, bajo & 0xff].join(".");
}

function isBlockedIpv6(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "::1" || h === "::") return true;
  if (h.startsWith("fc") || h.startsWith("fd")) return true; // ULA
  if (h.startsWith("fe80")) return true; // link-local
  const dentro = ipv4DentroDeIpv6(h);
  if (dentro && isBlockedIpv4(dentro)) return true;
  return false;
}

export function assertSafeEgressUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Invalid URL");
  }
  if (url.protocol !== "https:") {
    throw new Error("URL must use HTTPS");
  }
  if (url.username || url.password) {
    throw new Error("URL must not include credentials");
  }
  // El punto final se quita: el DNS trata `localhost.` y `localhost` como el
  // mismo nombre, y la lista de bloqueados comparaba la cadena tal cual.
  const host = url.hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.+$/, "");
  if (BLOCKED_HOSTNAMES.has(host) || host.endsWith(".localhost") || host.endsWith(".local")) {
    throw new Error("URL host is not allowed");
  }
  if (isBlockedIpv4(host) || isBlockedIpv6(host)) {
    throw new Error("URL host is not allowed");
  }
  return url;
}

export function isSafeEgressUrl(raw: string): boolean {
  try {
    assertSafeEgressUrl(raw);
    return true;
  } catch {
    return false;
  }
}
