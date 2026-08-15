import * as matchers from "@testing-library/jest-dom/matchers";
import React from "react";
import { afterAll, expect, vi } from "vitest";

expect.extend(matchers);

vi.stubGlobal("React", React);

class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin = "";
  readonly thresholds: ReadonlyArray<number> = [];
  constructor(private readonly callback: IntersectionObserverCallback) {}
  observe(target: Element) {
    this.callback([{ isIntersecting: true, target } as IntersectionObserverEntry], this);
  }
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal("ResizeObserver", MockResizeObserver);

if (typeof window !== "undefined") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes("dark"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

vi.mock("next/font/google", () => {
  const mockFont = () => ({
    className: "mock-font",
    variable: "--mock-font",
    style: { fontFamily: "mock" },
  });
  return new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === "__esModule") return true;
        return mockFont;
      },
    },
  );
});

process.env.JWT_SECRET ??= "super-secret-key-min-32-chars-change-in-production";
/** Unit tests only — real launch gate stays fail-closed outside NODE_ENV=test/VITEST. */
process.env.NELVYON_CAMPAIGN_LAUNCH_TEST_BYPASS ??= "1";

/**
 * Developer shells often export OLLAMA_HOST / LOCAL_AI URLs (sometimes host-only, no scheme).
 * That makes isAutonomousOllamaConfigured / isOsOllamaConfigured true and fail-closes unit
 * pilots that expect the mock LLM path. Dedicated Ollama/OpenAI tests re-set these in beforeEach.
 */
for (const key of [
  "OLLAMA_HOST",
  "OLLAMA_BASE_URL",
  "OLLAMA_CONFIGURED",
  "NELVYON_LOCAL_AI_URL",
  "LOCAL_AI_BASE_URL",
] as const) {
  delete process.env[key];
}

/** Fire-and-forget usage metering must not hit real DbClient in unit tests. */
vi.mock("../../backend/saas/SaasUsageMeterService", () => ({
  getSaasUsageMeterService: () => ({
    increment: vi.fn().mockResolvedValue(undefined),
    incrementWithSubcuentaMirror: vi.fn().mockResolvedValue(undefined),
    getUsageSnapshot: vi.fn().mockResolvedValue({
      usage: { contacts: 0, deals: 0, campanias: 0, workflows: 0, users: 0 },
      limits: {},
    }),
  }),
}));

/**
 * Enterprise security control plane (custom ACL + IP allowlist) is fail-closed in prod.
 * API route unit tests mock auth/tenant but not DbClient — without this stub they get 503
 * SECURITY_UNAVAILABLE from missing DATABASE_URL. Dedicated security tests override via vi.mock
 * or construct SaasSecurityEnterpriseService({ db }) directly.
 */
vi.mock("../../backend/saas/SaasSecurityEnterpriseService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../backend/saas/SaasSecurityEnterpriseService")>();
  return {
    ...actual,
    getSaasSecurityEnterpriseService: () => ({
      getCustomPermissions: vi.fn().mockResolvedValue(null),
      getIpAllowlist: vi.fn().mockResolvedValue({ enabled: false, cidrs: [] }),
      assertIpAllowed: vi.fn(),
      listCustomRoles: vi.fn().mockResolvedValue([]),
      upsertCustomRole: vi.fn(),
      assignCustomRole: vi.fn(),
      upsertIpAllowlist: vi.fn(),
      listTerritories: vi.fn().mockResolvedValue([]),
      upsertTerritory: vi.fn(),
      listSandboxes: vi.fn().mockResolvedValue([]),
      createSandbox: vi.fn(),
      getMfaStatus: vi.fn().mockResolvedValue({ enabled: false, enforced: false }),
      enrollMfa: vi.fn(),
      verifyMfa: vi.fn().mockResolvedValue(true),
    }),
  };
});


/**
 * AISLAMIENTO DE `process.env` ENTRE FICHEROS DEL MISMO WORKER
 * ------------------------------------------------------------
 * Vitest aisla modulos, pero NO el proceso: los ficheros que comparten worker
 * comparten `process.env`. Y que ficheros comparten worker —y en que orden—
 * cambia entre corridas, porque depende de la planificacion.
 *
 * El resultado era una suite que fallaba una de cada nueve corridas, siempre en
 * tests que pasaban aislados. Medido sobre el arbol: SETENTA Y CINCO variables
 * de entorno escritas por mas de un fichero de test; `OPENAI_API_KEY` por 17,
 * `STRIPE_SECRET_KEY` por 14, `JWT_SECRET` por 6. Cualquier pareja de esas
 * podia cruzarse.
 *
 * Arreglarlo fichero a fichero seria interminable y volveria a romperse con el
 * siguiente test que escriba una variable. Se arregla donde el problema existe:
 * este fichero corre UNA VEZ POR FICHERO DE TEST, asi que aqui se fotografia el
 * entorno y al terminar se restaura. Lo que un fichero toque, deja de existir
 * para el siguiente.
 *
 * La foto se toma DESPUES de la normalizacion de arriba, para que la linea base
 * sea la que los tests esperan y no la del shell del desarrollador.
 *
 * No es un reintento ni un skip: es la garantia que todo autor de test ya daba
 * por supuesta.
 */
const _entornoBase: NodeJS.ProcessEnv = { ...process.env };

afterAll(() => {
  for (const clave of Object.keys(process.env)) {
    if (!(clave in _entornoBase)) delete process.env[clave];
  }
  for (const [clave, valor] of Object.entries(_entornoBase)) {
    if (process.env[clave] !== valor) process.env[clave] = valor as string;
  }
});
