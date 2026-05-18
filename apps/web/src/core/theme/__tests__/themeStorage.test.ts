import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import {
  readExplicitTheme,
  resolveIsDark,
  THEME_STORAGE_KEY,
  writeExplicitTheme,
} from "@/core/theme/themeStorage";

describe("themeStorage", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses THEME_STORAGE_KEY nelvyon namespace", () => {
    expect(THEME_STORAGE_KEY).toBe("nelvyon.theme");
  });

  it("readExplicitTheme returns null when unset", () => {
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    expect(readExplicitTheme()).toBeNull();
  });

  it("readExplicitTheme returns light or dark when stored", () => {
    vi.mocked(localStorage.getItem).mockReturnValue("dark");
    expect(readExplicitTheme()).toBe("dark");
  });

  it("writeExplicitTheme persists choice", () => {
    writeExplicitTheme("light");
    expect(localStorage.setItem).toHaveBeenCalledWith(THEME_STORAGE_KEY, "light");
  });

  it("resolveIsDark respects explicit choice over prefersDark", () => {
    expect(resolveIsDark("light", true)).toBe(false);
    expect(resolveIsDark("dark", false)).toBe(true);
  });

  it("resolveIsDark follows OS when explicit is null", () => {
    expect(resolveIsDark(null, false)).toBe(false);
    expect(resolveIsDark(null, true)).toBe(true);
  });
});
