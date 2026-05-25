import type { WhitelabelApplyConfig } from "@/core/whitelabel/types";

const DEFAULT_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "nelvyon.com",
  "www.nelvyon.com",
  "app.nelvyon.com",
]);

export function normalizeHost(host: string): string {
  return host.split(":")[0].trim().toLowerCase();
}

export function isDefaultWhitelabelHost(host: string): boolean {
  const h = normalizeHost(host);
  if (DEFAULT_HOSTS.has(h)) return true;
  if (h.endsWith(".vercel.app")) return true;
  return false;
}

export async function fetchWhitelabelByHost(host: string): Promise<WhitelabelApplyConfig | null> {
  const normalized = normalizeHost(host);
  if (isDefaultWhitelabelHost(normalized)) return null;

  const backend = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";
  try {
    const res = await fetch(`${backend}/api/whitelabel/resolve?host=${encodeURIComponent(normalized)}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { found?: boolean } & WhitelabelApplyConfig;
    if (!data.found) return null;
    return data;
  } catch {
    return null;
  }
}

export function encodeWhitelabelHeader(config: WhitelabelApplyConfig): string {
  return Buffer.from(JSON.stringify(config)).toString("base64url");
}

export function decodeWhitelabelHeader(value: string | null): WhitelabelApplyConfig | null {
  if (!value) return null;
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as WhitelabelApplyConfig;
  } catch {
    return null;
  }
}
