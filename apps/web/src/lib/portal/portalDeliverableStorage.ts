const OS_DELIVERABLES_BUCKET =
  process.env.OS_DELIVERABLES_BUCKET?.trim() || "os-deliverables";
const DEFAULT_SIGNED_URL_TTL_SEC = Number(process.env.OS_DELIVERABLES_SIGNED_TTL_SEC ?? "600");

const UNSAFE_PATH = /\.\.|\/\/|^\/|\\/;

function supabaseConfig(): { baseUrl: string; serviceKey: string; mock: boolean } {
  const baseUrl = (
    process.env.SUPABASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    ""
  ).replace(/\/$/, "");
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    "";
  return { baseUrl, serviceKey, mock: !baseUrl || !serviceKey };
}

export function isSafeHttpsUrl(url: string | null | undefined): boolean {
  if (!url?.trim()) return false;
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "https:" && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

export function deliverableHasFile(storageKey: string | null | undefined, fileUrl: string | null | undefined): boolean {
  const key = storageKey?.trim();
  if (key && !UNSAFE_PATH.test(key)) return true;
  return isSafeHttpsUrl(fileUrl);
}

export async function resolveDeliverableDownloadUrl(params: {
  storageKey: string | null;
  fileUrl: string | null;
}): Promise<string | null> {
  const key = params.storageKey?.trim();
  if (key) {
    if (UNSAFE_PATH.test(key)) return null;
    const cfg = supabaseConfig();
    const ttl = Math.max(60, Math.min(DEFAULT_SIGNED_URL_TTL_SEC, 3600));
    if (cfg.mock) {
      const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
      return `https://mock.supabase.local/${OS_DELIVERABLES_BUCKET}/${key}?expires=${encodeURIComponent(expiresAt)}`;
    }
    const cleanPath = key.replace(/^\//, "");
    const res = await fetch(
      `${cfg.baseUrl}/storage/v1/object/sign/${OS_DELIVERABLES_BUCKET}/${cleanPath}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfg.serviceKey}`,
          apikey: cfg.serviceKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ expiresIn: ttl }),
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { signedURL?: string; signedUrl?: string };
    const signedPath = data.signedURL ?? data.signedUrl ?? "";
    if (!signedPath) return null;
    if (signedPath.startsWith("http")) return signedPath;
    return `${cfg.baseUrl}${signedPath}`;
  }
  if (isSafeHttpsUrl(params.fileUrl)) return params.fileUrl!.trim();
  return null;
}
