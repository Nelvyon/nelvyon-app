/**
 * La desactivacion del limitador para la suite E2E no debe poder aplicarse en
 * produccion por accidente. Estos tests fijan esa garantia.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { checkIpRateLimit, isRateLimitDisabledForTests } from "../rateLimit";

const REGLA = {
  id: "test-rule",
  match: () => true,
  limit: 2,
  windowSec: 60,
} as const;

const NODE_ENV_ORIGINAL = process.env.NODE_ENV;
const FLAG_ORIGINAL = process.env.RATE_LIMIT_DISABLED;

function fijarEntorno(nodeEnv: string | undefined, flag: string | undefined) {
  if (nodeEnv === undefined) delete (process.env as Record<string, string | undefined>).NODE_ENV;
  else (process.env as Record<string, string | undefined>).NODE_ENV = nodeEnv;
  if (flag === undefined) delete process.env.RATE_LIMIT_DISABLED;
  else process.env.RATE_LIMIT_DISABLED = flag;
}

beforeEach(() => {
  delete process.env.RATE_LIMIT_DISABLED;
});

afterEach(() => {
  fijarEntorno(NODE_ENV_ORIGINAL, FLAG_ORIGINAL);
});

describe("rate limit — desactivacion solo en test", () => {
  it("en produccion la variable NO desactiva el limitador", () => {
    fijarEntorno("production", "1");
    expect(isRateLimitDisabledForTests()).toBe(false);
  });

  it("en produccion sigue limitando aunque la variable este puesta", async () => {
    fijarEntorno("production", "1");
    const ip = `1.2.3.${Math.floor(Math.random() * 1000)}`;
    // La regla permite 2: la tercera peticion debe quedar bloqueada.
    await checkIpRateLimit({ ip, rule: REGLA });
    await checkIpRateLimit({ ip, rule: REGLA });
    const tercera = await checkIpRateLimit({ ip, rule: REGLA });
    expect(tercera.allowed).toBe(false);
  });

  it("en test la variable si desactiva el limitador", () => {
    fijarEntorno("test", "1");
    expect(isRateLimitDisabledForTests()).toBe(true);
  });

  it("en test sin la variable el limitador sigue activo", async () => {
    fijarEntorno("test", undefined);
    expect(isRateLimitDisabledForTests()).toBe(false);
    const ip = `4.5.6.${Math.floor(Math.random() * 1000)}`;
    await checkIpRateLimit({ ip, rule: REGLA });
    await checkIpRateLimit({ ip, rule: REGLA });
    const tercera = await checkIpRateLimit({ ip, rule: REGLA });
    expect(tercera.allowed).toBe(false);
  });

  it("un valor distinto de '1' no desactiva nada", () => {
    for (const valor of ["0", "true", "yes", ""]) {
      fijarEntorno("test", valor);
      expect(isRateLimitDisabledForTests()).toBe(false);
    }
  });

  it("en desarrollo con la variable puesta, permite sin limite", async () => {
    fijarEntorno("development", "1");
    const ip = "7.8.9.10";
    for (let i = 0; i < 10; i++) {
      const r = await checkIpRateLimit({ ip, rule: REGLA });
      expect(r.allowed).toBe(true);
    }
  });
});
