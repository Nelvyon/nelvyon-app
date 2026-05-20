import { afterEach, describe, expect, it, vi } from "vitest";

describe("getAppBaseUrl", () => {
  const original = process.env.NEXT_PUBLIC_APP_URL;

  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = original;
    vi.resetModules();
  });

  it("defaults when unset", async () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    const { getAppBaseUrl } = await import("../appUrl");
    expect(getAppBaseUrl()).toBe("https://nelvyon.com");
  });

  it("keeps https URL", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://nelvyonweb-production.up.railway.app/";
    const { getAppBaseUrl, getAppOrigin } = await import("../appUrl");
    expect(getAppBaseUrl()).toBe("https://nelvyonweb-production.up.railway.app");
    expect(getAppOrigin().href).toBe("https://nelvyonweb-production.up.railway.app/");
  });

  it("adds https when Railway host has no scheme (avoids layout crash)", async () => {
    process.env.NEXT_PUBLIC_APP_URL = "nelvyonweb-production.up.railway.app";
    const { getAppBaseUrl, getAppOrigin } = await import("../appUrl");
    expect(getAppBaseUrl()).toBe("https://nelvyonweb-production.up.railway.app");
    expect(() => getAppOrigin()).not.toThrow();
  });
});
