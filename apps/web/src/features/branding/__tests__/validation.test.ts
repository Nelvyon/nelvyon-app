import { describe, expect, it } from "vitest";

import { parseHexColor, validateHttpsLogoUrl } from "@/features/branding/validation";

describe("branding v1 validation", () => {
  it("parseHexColor accepts 6-digit hex with or without hash", () => {
    expect(parseHexColor("#aabbcc")).toBe("#aabbcc");
    expect(parseHexColor("aabbcc")).toBe("#aabbcc");
    expect(parseHexColor("  #00FF42  ")).toBe("#00FF42");
  });

  it("parseHexColor rejects invalid values", () => {
    expect(parseHexColor("")).toBeNull();
    expect(parseHexColor("   ")).toBeNull();
    expect(parseHexColor("#fff")).toBeNull();
    expect(parseHexColor("blue")).toBeNull();
  });

  it("validateHttpsLogoUrl allows empty", () => {
    expect(validateHttpsLogoUrl("")).toEqual({ ok: true });
    expect(validateHttpsLogoUrl("  ")).toEqual({ ok: true });
  });

  it("validateHttpsLogoUrl requires https", () => {
    expect(validateHttpsLogoUrl("http://example.com/x.png").ok).toBe(false);
    expect(validateHttpsLogoUrl("https://example.com/x.png").ok).toBe(true);
  });
});
