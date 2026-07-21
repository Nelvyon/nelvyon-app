/**
 * Allowlist OAuth authorize URLs before browser redirect (open-redirect hardening).
 */
const ALLOWED_HOST_SUFFIXES = [
  "hubspot.com",
  "slack.com",
  "google.com",
  "googleapis.com",
  "accounts.google.com",
  "linkedin.com",
  "facebook.com",
  "meta.com",
  "microsoftonline.com",
  "live.com",
  "tiktok.com",
  "bytedance.com",
  "twitter.com",
  "x.com",
  "stripe.com",
  "github.com",
  "salesforce.com",
  "force.com",
  "zoom.us",
  "nelvyon.com",
];

export function isAllowedOAuthAuthorizeUrl(raw: string): boolean {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const host = url.hostname.toLowerCase();
  return ALLOWED_HOST_SUFFIXES.some((suffix) => host === suffix || host.endsWith(`.${suffix}`));
}
