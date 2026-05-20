const DEFAULT_APP_URL = "https://nelvyon.com";

/**
 * Canonical app origin for metadata, sitemap, OG URLs.
 * Railway often sets NEXT_PUBLIC_APP_URL to a host without scheme — `new URL(host)` throws.
 */
export function getAppBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!raw) return DEFAULT_APP_URL;
  const withoutTrailing = raw.replace(/\/$/, "");
  if (/^https?:\/\//i.test(withoutTrailing)) return withoutTrailing;
  return `https://${withoutTrailing}`;
}

export function getAppOrigin(): URL {
  return new URL(`${getAppBaseUrl()}/`);
}
