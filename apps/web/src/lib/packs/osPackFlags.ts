/**
 * Feature flags for new OS packs — default OFF outside staging/dev.
 * Explicit NELVYON_*_PACK=0 always wins (prod rollback).
 */

function envFlag(name: string): boolean | null {
  const v = process.env[name]?.trim();
  if (v == null || v === "") return null;
  if (v === "0" || v.toUpperCase() === "OFF" || v.toLowerCase() === "false") return false;
  if (v === "1" || v.toUpperCase() === "ON" || v.toLowerCase() === "true") return true;
  return null;
}

function isStagingOrDevRuntime(): boolean {
  const railway = (
    process.env.RAILWAY_ENVIRONMENT_NAME ??
    process.env.RAILWAY_ENVIRONMENT ??
    ""
  ).toLowerCase();
  if (railway.includes("staging") || railway.includes("develop")) return true;
  const node = process.env.NODE_ENV ?? "";
  return node === "development" || node === "test";
}

/** Returns true when pack kickoff is allowed in this runtime. */
export function isOsPackFeatureEnabled(envKey: string): boolean {
  const explicit = envFlag(envKey);
  if (explicit !== null) return explicit;
  return isStagingOrDevRuntime();
}

export const OS_PACK_FLAG_KEYS = {
  strategy: "NELVYON_STRATEGY_PACK",
  funnel: "NELVYON_FUNNEL_PACK",
  retention: "NELVYON_RETENTION_PACK",
  automationsOps: "NELVYON_AUTOMATIONS_OPS_PACK",
  reputationOps: "NELVYON_REPUTATION_OPS_PACK",
  influencersPr: "NELVYON_INFLUENCERS_PR_PACK",
} as const;

export function flagKeyForPackId(packId: string): string | null {
  if (packId === "strategy-pack") return OS_PACK_FLAG_KEYS.strategy;
  if (packId === "funnel-growth-pack") return OS_PACK_FLAG_KEYS.funnel;
  if (packId === "retention-pack") return OS_PACK_FLAG_KEYS.retention;
  if (packId === "automations-ops-pack") return OS_PACK_FLAG_KEYS.automationsOps;
  if (packId === "reputation-ops-pack") return OS_PACK_FLAG_KEYS.reputationOps;
  if (packId === "influencers-pr-pack") return OS_PACK_FLAG_KEYS.influencersPr;
  return null;
}
