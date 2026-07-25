import { describe, expect, it } from "vitest";

import { resolveBootstrapLocale } from "../resolveBootstrapLocale";

describe("resolveBootstrapLocale", () => {
  it("prefers workspace/tenant locale over user language and cookie", () => {
    expect(
      resolveBootstrapLocale({
        workspaceLocale: "de",
        userLanguage: "en",
        cookieLocale: "fr",
      }),
    ).toBe("de");
  });

  it("falls back to user language when workspace locale is missing/unsupported", () => {
    expect(
      resolveBootstrapLocale({
        workspaceLocale: null,
        userLanguage: "fr",
        cookieLocale: "en",
      }),
    ).toBe("fr");
    expect(
      resolveBootstrapLocale({
        workspaceLocale: "xx",
        userLanguage: "it",
        cookieLocale: "en",
      }),
    ).toBe("it");
  });

  it("falls back to cookie locale, then es", () => {
    expect(resolveBootstrapLocale({ cookieLocale: "pt" })).toBe("pt");
    expect(resolveBootstrapLocale({})).toBe("es");
    expect(resolveBootstrapLocale({ workspaceLocale: "nope", userLanguage: "nope" })).toBe("es");
  });
});
