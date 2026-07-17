/**
 * Shared Memory content security — reuse SecurityGuard patterns (no duplicate policy engine).
 * Blocks prompt injection / secret extraction; redacts credential-like strings on write.
 */

import { evaluateSecurityGuard } from "../local-ai/specialization/SecurityGuard";

export class SharedMemoryContentRejectedError extends Error {
  constructor(
    public readonly category: string,
    message?: string,
  ) {
    super(message ?? `SharedMemory content rejected: ${category}`);
    this.name = "SharedMemoryContentRejectedError";
  }
}

const REDACT_PATTERNS: Array<{ re: RegExp; replace: string }> = [
  { re: /\b(sk_live_|sk_test_)[a-zA-Z0-9]+/g, replace: "[REDACTED_STRIPE_KEY]" },
  { re: /\b(AKIA)[0-9A-Z]{16}\b/g, replace: "[REDACTED_AWS_KEY]" },
  { re: /\bBearer\s+[A-Za-z0-9\-._~+/]+=*/gi, replace: "Bearer [REDACTED_TOKEN]" },
  { re: /\b(eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)\b/g, replace: "[REDACTED_JWT]" },
  {
    re: /(postgres(?:ql)?:\/\/)([^:\s]+):([^@\s]+)@/gi,
    replace: "$1$2:[REDACTED_PASSWORD]@",
  },
];

/** Redact secrets; return sanitized content. */
export function redactMemorySecrets(content: string): string {
  let out = content;
  for (const { re, replace } of REDACT_PATTERNS) {
    out = out.replace(re, replace);
  }
  return out;
}

/**
 * Validate content before persist.
 * @throws SharedMemoryContentRejectedError on injection / secret extraction attempts
 */
export function assertSafeMemoryContent(content: string, title = ""): string {
  const combined = `${title}\n${content}`.slice(0, 20_000);
  const guard = evaluateSecurityGuard(combined);
  if (guard.blocked) {
    throw new SharedMemoryContentRejectedError(guard.category, guard.response);
  }
  return redactMemorySecrets(content);
}

export function isUsefulMemoryContent(content: string): boolean {
  const t = content.trim();
  if (t.length < 8) return false;
  if (/^(ok|yes|no|test|asdf|lorem ipsum)\.?$/i.test(t)) return false;
  return true;
}
