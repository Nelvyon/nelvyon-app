/**
 * BLOQUE 4 · un verde tiene que significar lo que dice.
 *
 * Un healthcheck que devuelve `ok` con la base caída es peor que no tener
 * healthcheck: el balanceador sigue mandando tráfico, las alertas callan, y el
 * primero en enterarse es un cliente.
 *
 * Tres propiedades:
 *
 *   - **Un componente roto no aparece sano.** Ni por `catch`, ni por defecto, ni
 *     por tiempo de espera agotado.
 *   - **La sonda no cuesta dinero.** Con la IA apagada no sale una sola petición
 *     a un proveedor: `NELVYON_AI_ENABLED=0` significa cero, también aquí.
 *   - **El error público no filtra nada.** Quien mira `/health` desde fuera no
 *     tiene por qué saber la cadena de conexión ni el mensaje del motor.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ENTORNO = { ...process.env };
const fetchOriginal = globalThis.fetch;

beforeEach(() => {
  process.env.NELVYON_AI_ENABLED = "0";
});

afterEach(() => {
  process.env = { ...ENTORNO };
  globalThis.fetch = fetchOriginal;
  vi.restoreAllMocks();
  vi.resetModules();
});

async function salud() {
  vi.resetModules();
  return import("../healthChecks");
}

describe("BLOQUE 4 · la sonda no cuesta dinero", () => {
  it("con la IA APAGADA no se hace ninguna petición al proveedor", async () => {
    // La sonda es un HEAD y no gasta tokens, pero sigue siendo una llamada
    // externa a un proveedor de pago. Y revela que esta instancia habla con
    // OpenAI a quien mire el tráfico saliente.
    const espia = vi.fn(async () => new Response(null, { status: 200 }));
    globalThis.fetch = espia as never;

    process.env.NELVYON_AI_ENABLED = "0";
    process.env.OPENAI_API_KEY = "sk-una-clave-que-no-debe-usarse";

    const { checkOpenAI } = await salud();
    const r = await checkOpenAI();

    expect(espia, "salio una peticion con la IA apagada").not.toHaveBeenCalled();
    expect(r.status).not.toBe("ok");
    expect(r.error).toMatch(/desactivada|NELVYON_AI_ENABLED/i);
  });

  it("apagada, NO se devuelve `ok` inventado", async () => {
    // Lo cómodo sería decir «ok, no aplica». Eso pintaría verde un componente
    // que nadie ha comprobado.
    process.env.NELVYON_AI_ENABLED = "0";
    const { checkOpenAI } = await salud();
    expect((await checkOpenAI()).status).toBe("degraded");
  });

  it("sin configuración tampoco se inventa un `ok`", async () => {
    process.env.NELVYON_AI_ENABLED = "1";
    delete process.env.OPENAI_API_KEY;
    const { checkOpenAI } = await salud();
    const r = await checkOpenAI();
    expect(r.status).toBe("degraded");
    expect(r.error).toBeTruthy();
  });
});

describe("BLOQUE 4 · un componente roto no aparece sano", () => {
  it("EL CONTROL: con la base respondiendo, el estado es `ok`", async () => {
    // Sin esto, una comprobación que devolviera siempre `down` pasaría las
    // pruebas de abajo y dejaría el servicio permanentemente fuera de rotación.
    vi.resetModules();
    vi.doMock("../../db/DbClient", () => ({
      DbClient: { getInstance: () => ({ query: async () => [{ "?column?": 1 }] }) },
    }));
    const { checkDatabase } = await import("../healthChecks");
    expect((await checkDatabase()).status).toBe("ok");
  });

  it("con la base CAÍDA el estado es `down`, no `ok`", async () => {
    // El fallo que hace inútil un healthcheck. Si devolviera `ok`, el
    // balanceador seguiría mandando tráfico a una instancia que no puede servir.
    vi.resetModules();
    vi.doMock("../../db/DbClient", () => ({
      DbClient: {
        getInstance: () => ({
          query: async () => {
            throw new Error("ECONNREFUSED 10.0.0.5:5432 password=secreto123");
          },
        }),
      },
    }));
    const { checkDatabase } = await import("../healthChecks");
    const r = await checkDatabase();
    expect(r.status).toBe("down");
  });

  it("el error público NO filtra la cadena de conexión ni la credencial", async () => {
    // `/health` lo mira cualquiera. El mensaje del motor lleva host, puerto y a
    // veces la contraseña.
    vi.resetModules();
    vi.doMock("../../db/DbClient", () => ({
      DbClient: {
        getInstance: () => ({
          query: async () => {
            throw new Error("ECONNREFUSED 10.0.0.5:5432 password=secreto123 user=nelvyon_app");
          },
        }),
      },
    }));
    const { checkDatabase } = await import("../healthChecks");
    const r = await checkDatabase();

    const texto = JSON.stringify(r);
    expect(texto).not.toContain("secreto123");
    expect(texto).not.toContain("10.0.0.5");
    expect(texto).not.toContain("nelvyon_app");
    expect(r.error).toBeTruthy(); // pero SÍ dice que algo falla
  });

  it("sin secreto de firma, la comprobación de auth está `down`", async () => {
    // Un secreto ausente no es una anécdota de configuración: sin él no se
    // pueden verificar sesiones. Aparecer sano sería mentir.
    delete process.env.JWT_SECRET;
    delete process.env.NEXTAUTH_SECRET;
    const { checkAuthConfig } = await salud();
    expect((await checkAuthConfig()).status).toBe("down");
  });

  it("un secreto demasiado corto también es `down`", async () => {
    // Un HMAC con un secreto de ocho caracteres es criptografía de adorno.
    process.env.JWT_SECRET = "corto";
    const { checkAuthConfig } = await salud();
    expect((await checkAuthConfig()).status).toBe("down");
  });

  it("EL CONTROL: con un secreto suficiente, `ok`", async () => {
    process.env.JWT_SECRET = "un-secreto-suficientemente-largo-para-firmar-de-verdad";
    const { checkAuthConfig } = await salud();
    expect((await checkAuthConfig()).status).toBe("ok");
  });
});

describe("BLOQUE 4 · liveness y readiness no son lo mismo", () => {
  it("`live` no depende de la base: un proceso vivo con base caída sigue vivo", async () => {
    // Confundirlas provoca reinicios en cadena: si la base cae y `live` lo
    // reporta, el orquestador mata instancias sanas que solo estaban esperando.
    const { readFileSync, existsSync } = await import("node:fs");
    const { dirname, join } = await import("node:path");
    let d = process.cwd();
    for (let i = 0; i < 8; i++) {
      if (existsSync(join(d, "apps", "web", "vitest.config.ts"))) break;
      d = dirname(d);
    }
    const live = readFileSync(
      join(d, "apps", "web", "src", "app", "api", "health", "live", "route.ts"),
      "utf8",
    );
    expect(live, "liveness consulta la base").not.toMatch(/checkDatabase|checkRedis/);

    const ready = readFileSync(
      join(d, "apps", "web", "src", "app", "api", "health", "ready", "route.ts"),
      "utf8",
    );
    expect(ready, "readiness no consulta la base").toMatch(/checkDatabase/);
  });
});
