import { afterEach, describe, expect, it, vi } from "vitest";

import { isVoiceAllowedForPlan, parseVoicePlanAllowlist } from "@/features/voice/planAccess";

describe("voice v1 plan access", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("parseVoicePlanAllowlist returns empty set when unset", () => {
    vi.stubEnv("NEXT_PUBLIC_VOICE_V1_PLAN_IDS", "");
    expect(parseVoicePlanAllowlist().size).toBe(0);
  });

  it("parseVoicePlanAllowlist splits and trims comma list", () => {
    vi.stubEnv("NEXT_PUBLIC_VOICE_V1_PLAN_IDS", " pro , enterprise ");
    const set = parseVoicePlanAllowlist();
    expect(set.has("pro")).toBe(true);
    expect(set.has("enterprise")).toBe(true);
    expect(set.has("starter")).toBe(false);
  });

  it("isVoiceAllowedForPlan is false when allowlist empty", () => {
    vi.stubEnv("NEXT_PUBLIC_VOICE_V1_PLAN_IDS", "");
    expect(isVoiceAllowedForPlan("pro")).toBe(false);
  });

  it("isVoiceAllowedForPlan matches configured ids", () => {
    vi.stubEnv("NEXT_PUBLIC_VOICE_V1_PLAN_IDS", "pro");
    expect(isVoiceAllowedForPlan("pro")).toBe(true);
    expect(isVoiceAllowedForPlan("starter")).toBe(false);
    expect(isVoiceAllowedForPlan(null)).toBe(false);
  });
});
