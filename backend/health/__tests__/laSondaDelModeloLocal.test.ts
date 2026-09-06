/**
 * El modelo local se mira desde donde importa, y se dice la verdad de lo que se ve.
 *
 * ── POR QUÉ EXISTE ESTA SONDA ───────────────────────────────────────────────
 *
 * `checkOpenAI` mira al proveedor de PAGO, que en producción está apagado a
 * propósito. Del modelo que NELVYON usa de verdad —Ollama, autoalojado, coste
 * cero— no había ninguna sonda.
 *
 * Y no es un detalle: en producción el modelo vive al otro lado de una red
 * privada. «Está configurado» y «se alcanza» son dos cosas distintas, y sólo se
 * pueden distinguir DESDE EL RUNTIME. Sin esto, encender la IA era un acto de
 * fe: poner la variable a 1 y esperar a que el primer trabajo real descubriera
 * si había alguien al otro lado.
 *
 * ── LA DISTINCIÓN QUE MÁS IMPORTA ───────────────────────────────────────────
 *
 * Un servidor vivo SIN modelos instalados no puede inferir. Decir `ok` ahí sería
 * exactamente el «configurado que parece verificado» que esta sonda existe para
 * impedir.
 *
 * COSTE EXTERNO: 0 EUR. `fetch` es un doble; y en producción, listar modelos es
 * una lectura de metadatos contra un servidor propio.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { checkNelvyonAi } from "../healthChecks";

/**
 * Una IP del rango de Tailscale, como en produccion.
 *
 * No es cosmetico: `privateModeFetch` solo deja salir a la lista blanca de
 * PRIVATE_MODE —localhost, IP privadas y el CGNAT 100.64/10 del tailnet—. Un
 * host inventado no pasa el filtro, asi que la prueba mediria el filtro en vez
 * de la sonda.
 */
const HOST = "http://100.102.207.30:11434";

function fetchQueDevuelve(cuerpo: unknown, status = 200) {
  return vi.fn(async () => new Response(JSON.stringify(cuerpo), { status })) as unknown as typeof fetch;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("con la IA apagada no se llama a nadie", () => {
  it("lo dice, y no toca la red", async () => {
    vi.stubEnv("NELVYON_AI_ENABLED", "0");
    const red = vi.fn();
    global.fetch = red as unknown as typeof fetch;
    const r = await checkNelvyonAi();
    expect(r.status).toBe("degraded");
    expect(r.error).toMatch(/NELVYON_AI_ENABLED=0/);
    expect(red, "se sondeó el modelo con el interruptor apagado").not.toHaveBeenCalled();
  });
});

describe("con la IA encendida, se mira de verdad", () => {
  it("sin dirección de modelo, lo dice con su nombre", async () => {
    vi.stubEnv("NELVYON_AI_ENABLED", "1");
    vi.stubEnv("OLLAMA_HOST", "");
    vi.stubEnv("OLLAMA_BASE_URL", "");
    vi.stubEnv("NELVYON_LOCAL_AI_URL", "");
    const r = await checkNelvyonAi();
    expect(r.status).toBe("degraded");
    expect(r.error).toContain("OLLAMA_HOST");
  });

  it("alcanzable y con modelos: ok, y dice cuántos", async () => {
    vi.stubEnv("NELVYON_AI_ENABLED", "1");
    vi.stubEnv("OLLAMA_HOST", HOST);
    global.fetch = fetchQueDevuelve({ models: [{ name: "llama3.1:8b" }, { name: "llama3.2:3b" }] });
    const r = await checkNelvyonAi();
    expect(r.status).toBe("ok");
    expect(r.detail).toContain("2");
  });

  it("VIVO PERO SIN MODELOS no es ok", async () => {
    // La distinción que da sentido a la sonda: un servidor que responde y no
    // tiene nada que ejecutar no puede inferir. Un `ok` aquí sería mentira.
    vi.stubEnv("NELVYON_AI_ENABLED", "1");
    vi.stubEnv("OLLAMA_HOST", HOST);
    global.fetch = fetchQueDevuelve({ models: [] });
    const r = await checkNelvyonAi();
    expect(r.status).toBe("degraded");
    expect(r.error).toMatch(/sin modelos/i);
  });

  it("si responde con error HTTP, lo dice", async () => {
    vi.stubEnv("NELVYON_AI_ENABLED", "1");
    vi.stubEnv("OLLAMA_HOST", HOST);
    global.fetch = fetchQueDevuelve({}, 503);
    const r = await checkNelvyonAi();
    expect(r.status).toBe("degraded");
    expect(r.error).toContain("503");
  });

  it("si no se alcanza, es `down` y NO revela la dirección interna", async () => {
    // La sonda la puede llamar cualquiera con el secreto de cron. La dirección
    // del modelo es topología de red privada: no sale en el mensaje.
    vi.stubEnv("NELVYON_AI_ENABLED", "1");
    vi.stubEnv("OLLAMA_HOST", HOST);
    global.fetch = vi.fn(async () => {
      throw new Error(`connect ECONNREFUSED ${HOST}`);
    }) as unknown as typeof fetch;
    const r = await checkNelvyonAi();
    expect(r.status).toBe("down");
    expect(r.error ?? "").not.toContain("100.102.207.30");
    expect(r.error ?? "").not.toContain("11434");
  });
});

describe("no se llama a ningún proveedor de pago", () => {
  it("la sonda sólo habla con la dirección del modelo local", async () => {
    vi.stubEnv("NELVYON_AI_ENABLED", "1");
    vi.stubEnv("OLLAMA_HOST", HOST);
    const espia = vi.fn(async () => new Response(JSON.stringify({ models: [{ name: "m" }] })));
    global.fetch = espia as unknown as typeof fetch;
    await checkNelvyonAi();
    for (const [url] of espia.mock.calls as unknown as Array<[string]>) {
      expect(String(url)).toContain("100.102.207.30");
      expect(String(url)).not.toMatch(/openai|anthropic|googleapis/i);
    }
  });
});
