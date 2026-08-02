/** HTTP security headers (MIG 281). SSOT for next.config + middleware.
 * CSP tuned for PostHog, Stripe Checkout, Sentry, Formspree contact.
 */

export const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://eu.i.posthog.com https://js.stripe.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://eu.i.posthog.com https://eu.posthog.com https://api.stripe.com https://*.sentry.io",
  "frame-src https://js.stripe.com https://hooks.stripe.com https://www.google.com https://maps.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://formspree.io",
  "upgrade-insecure-requests",
].join("; ");

/** SAMEORIGIN: aligns with Stripe Checkout iframes; do not use DENY in middleware. */
export const SECURITY_HEADERS_WITHOUT_CSP = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-XSS-Protection", value: "1; mode=block" },
] as const;

export const SECURITY_HEADERS_WITH_CSP = [
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
  ...SECURITY_HEADERS_WITHOUT_CSP,
] as const;
