/**
 * VOZ NELVYON v1 — plan gate (no telephony APIs yet).
 * When `NEXT_PUBLIC_VOICE_V1_PLAN_IDS` is empty, voice stays off for every plan until ops configure allowlist.
 */

export function parseVoicePlanAllowlist(): ReadonlySet<string> {
  const raw = process.env.NEXT_PUBLIC_VOICE_V1_PLAN_IDS ?? "";
  const ids = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return new Set(ids);
}

export function isVoiceAllowedForPlan(planId: string | null | undefined): boolean {
  const allow = parseVoicePlanAllowlist();
  if (allow.size === 0) return false;
  if (!planId || !planId.trim()) return false;
  return allow.has(planId.trim());
}
