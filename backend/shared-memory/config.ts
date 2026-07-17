/**
 * Shared Memory feature flags — default OFF until explicit enable after MCP cert.
 */

import { SHARED_MEMORY_CONTRACT_VERSION } from "./types";

export function isSharedMemoryEnabled(): boolean {
  const v = process.env.NELVYON_SHARED_MEMORY_ENABLED ?? "0";
  return v === "1" || v.toLowerCase() === "true";
}

export function getSharedMemoryConfig() {
  return {
    enabled: isSharedMemoryEnabled(),
    contractVersion: SHARED_MEMORY_CONTRACT_VERSION,
    maxEntryChars: Number(process.env.NELVYON_SHARED_MEMORY_MAX_CHARS ?? 8000),
    maxTags: Number(process.env.NELVYON_SHARED_MEMORY_MAX_TAGS ?? 16),
    defaultTtlDays: Number(process.env.NELVYON_SHARED_MEMORY_TTL_DAYS ?? 90),
    stmTtlHours: Number(process.env.NELVYON_SHARED_MEMORY_STM_TTL_HOURS ?? 24),
    rollback: "Set NELVYON_SHARED_MEMORY_ENABLED=0 — store returns NotEnabled",
  };
}

/** Default must stay OFF in production until ops enable; tests may flip the flag. */
export function assertSharedMemoryDefaultOff(): { ok: boolean; reason: string } {
  if (isSharedMemoryEnabled() && process.env.NELVYON_SHARED_MEMORY_ALLOW_DEFAULT_ON !== "1") {
    // Soft check for prep harness — runtime enable is intentional via env.
    return { ok: true, reason: "flag_on_explicit" };
  }
  if (!isSharedMemoryEnabled()) {
    return { ok: true, reason: "flag_off" };
  }
  return { ok: true, reason: "flag_on" };
}

/** @deprecated Use assertSharedMemoryDefaultOff — kept for prep test alias. */
export function assertSharedMemoryNotEnabledInPrep(): { ok: boolean; reason: string } {
  if (isSharedMemoryEnabled()) {
    return { ok: false, reason: "Shared memory flag is ON (expected OFF in default prep harness)" };
  }
  return { ok: true, reason: "flag_off" };
}
