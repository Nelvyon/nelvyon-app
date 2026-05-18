import { describe, expect, it } from "vitest";

import { validateSynthText, VOICE_SYNTH_MAX_CHARS } from "@/features/voice/synthPolicy";

describe("voice v2 synth policy", () => {
  it("rejects empty", () => {
    expect(validateSynthText("   ").ok).toBe(false);
  });

  it("rejects over max length", () => {
    const long = "a".repeat(VOICE_SYNTH_MAX_CHARS + 1);
    expect(validateSynthText(long).ok).toBe(false);
  });

  it("accepts within limit", () => {
    const r = validateSynthText("  Hello world  ");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.text).toBe("Hello world");
  });
});
