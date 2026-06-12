/** Trim Railway/UI quotes and whitespace from env values. */
export function sanitizeEnvValue(raw: string | undefined): string {
  if (typeof raw !== "string") return "";
  let s = raw.trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

export function isSupabaseHost(hostname: string): boolean {
  return hostname.includes("supabase.com") || hostname.includes("supabase.co");
}
