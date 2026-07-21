/**
 * Fail-closed HMAC signing secret for SaaS artefacts (quotes, LMS certs, tracking, OAuth, portal).
 * Never fall back to a hardcoded constant — that enables forgeable signatures.
 */
export type HmacSecretOptions = {
  /** Prefer TRACKING_SECRET before JWT_SECRET (email tracking / portal tokens). */
  preferTracking?: boolean;
};

export function requireHmacSecret(opts?: HmacSecretOptions): string {
  const ordered = opts?.preferTracking
    ? [process.env.TRACKING_SECRET, process.env.JWT_SECRET, process.env.NEXTAUTH_SECRET]
    : [process.env.JWT_SECRET, process.env.NEXTAUTH_SECRET, process.env.TRACKING_SECRET];

  const secret = ordered.map((s) => s?.trim() ?? "").find((s) => s.length > 0) ?? "";
  if (!secret) {
    throw new Error(
      opts?.preferTracking
        ? "TRACKING_SECRET or JWT_SECRET is required for HMAC signing"
        : "JWT_SECRET (or NEXTAUTH_SECRET / TRACKING_SECRET) is required for HMAC signing",
    );
  }
  if (secret.length < 32) {
    throw new Error(
      `HMAC signing secret must be at least 32 characters (got ${secret.length})`,
    );
  }
  return secret;
}
