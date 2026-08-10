import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Flags de la cookie de sesión. Vive en `apps/web/src` porque `next/server` solo
 * resuelve dentro del alias de la app; desde `backend/` no existe.
 */
describe("cookie de sesión — flags seguros", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("en producción la cookie es httpOnly, secure, sameSite strict", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
    const { NextResponse } = await import("next/server");
    const { applyNelvyonAuthCookie, NELVYON_AUTH_COOKIE } = await import("@/lib/authCookies");

    const res = NextResponse.json({ ok: true });
    applyNelvyonAuthCookie(res, "token-de-prueba");
    const c = res.cookies.get(NELVYON_AUTH_COOKIE);

    expect(c?.httpOnly).toBe(true);
    expect(c?.secure).toBe(true);
    expect(c?.sameSite).toBe("strict");
    expect(c?.path).toBe("/");
  });

  it("logout borra la cookie conservando los mismos atributos", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();
    const { NextResponse } = await import("next/server");
    const { clearNelvyonAuthCookie, NELVYON_AUTH_COOKIE } = await import("@/lib/authCookies");

    const res = NextResponse.json({ ok: true });
    clearNelvyonAuthCookie(res);
    const c = res.cookies.get(NELVYON_AUTH_COOKIE);

    // Atributos idénticos: si difieren, el navegador no sustituye la cookie
    // original y la sesión sobreviviría al logout.
    expect(c?.value).toBe("");
    expect(c?.maxAge).toBe(0);
    expect(c?.httpOnly).toBe(true);
    expect(c?.secure).toBe(true);
    expect(c?.sameSite).toBe("strict");
    expect(c?.path).toBe("/");
  });
});
