/**
 * Supabase browser client configuration (MIG 279).
 * No @supabase/supabase-js dependency in v1 — helpers only.
 * When adding the SDK, use createBrowserClient(url, getSupabaseAnonKey()).
 */

export function getSupabaseUrl(): string | undefined {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return url && url.trim().length > 0 ? url.trim() : undefined;
}

/** Anon key only — safe for browser. Never use service_role here. */
export function getSupabaseAnonKey(): string | undefined {
  if (typeof window !== "undefined") {
    assertNoServiceRoleKeyExposedInBrowser();
  }
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return key && key.trim().length > 0 ? key.trim() : undefined;
}

export function assertNoServiceRoleKeyExposedInBrowser(): void {
  const leaked =
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (leaked && leaked.length > 0) {
    throw new Error(
      "SUPABASE service_role key must not be exposed to the browser. Use NEXT_PUBLIC_SUPABASE_ANON_KEY only.",
    );
  }
}

export function isSupabaseBrowserConfigured(): boolean {
  return Boolean(getSupabaseUrl() && getSupabaseAnonKey());
}
