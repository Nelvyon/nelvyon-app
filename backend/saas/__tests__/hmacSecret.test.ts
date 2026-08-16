import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { requireHmacSecret } from "../hmacSecret";

// Capturado DENTRO del hook: `process.env` es del proceso y vitest aisla
// modulos, no procesos, asi que un valor congelado al cargar el modulo seria
// el que dejo otro fichero del mismo worker.
let ORIGINAL_JWT: typeof process.env.JWT_SECRET;
let ORIGINAL_NEXT: typeof process.env.NEXTAUTH_SECRET;
let ORIGINAL_TRACK: typeof process.env.TRACKING_SECRET;

beforeEach(() => {
  ORIGINAL_JWT = process.env.JWT_SECRET;
  ORIGINAL_NEXT = process.env.NEXTAUTH_SECRET;
  ORIGINAL_TRACK = process.env.TRACKING_SECRET;
});

afterEach(() => {
  if (ORIGINAL_JWT === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = ORIGINAL_JWT;
  if (ORIGINAL_NEXT === undefined) delete process.env.NEXTAUTH_SECRET;
  else process.env.NEXTAUTH_SECRET = ORIGINAL_NEXT;
  if (ORIGINAL_TRACK === undefined) delete process.env.TRACKING_SECRET;
  else process.env.TRACKING_SECRET = ORIGINAL_TRACK;
});

describe("requireHmacSecret", () => {
  it("returns JWT_SECRET when present and long enough", () => {
    process.env.JWT_SECRET = "a".repeat(32);
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.TRACKING_SECRET;
    expect(requireHmacSecret()).toBe("a".repeat(32));
  });

  it("falls back to NEXTAUTH_SECRET when JWT_SECRET missing", () => {
    delete process.env.JWT_SECRET;
    delete process.env.TRACKING_SECRET;
    process.env.NEXTAUTH_SECRET = "b".repeat(32);
    expect(requireHmacSecret()).toBe("b".repeat(32));
  });

  it("preferTracking uses TRACKING_SECRET first", () => {
    process.env.TRACKING_SECRET = "t".repeat(32);
    process.env.JWT_SECRET = "j".repeat(32);
    expect(requireHmacSecret({ preferTracking: true })).toBe("t".repeat(32));
  });

  it("throws when no secret is configured (fail-closed)", () => {
    delete process.env.JWT_SECRET;
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.TRACKING_SECRET;
    expect(() => requireHmacSecret()).toThrow(/required for HMAC/);
  });

  it("throws when secret is shorter than 32 characters", () => {
    process.env.JWT_SECRET = "too-short";
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.TRACKING_SECRET;
    expect(() => requireHmacSecret()).toThrow(/at least 32/);
  });

  it("rejects hardcoded-legacy length secrets used previously as fallbacks", () => {
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.TRACKING_SECRET;
    process.env.JWT_SECRET = "dev-secret";
    expect(() => requireHmacSecret()).toThrow(/at least 32/);
    process.env.JWT_SECRET = "nelvyon-cert-secret";
    expect(() => requireHmacSecret()).toThrow(/at least 32/);
  });
});
