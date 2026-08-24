/**
 * BLOQUE 3 · apagada significa apagada, y privado significa privado.
 *
 * Dos garantias que sostienen la restriccion de coste cero:
 *
 *   1. Con `NELVYON_AI_ENABLED=0` no se llama a ningun proveedor externo, ni
 *      siquiera para PREGUNTARLE si esta disponible. Sondear ya es red, y la
 *      red de un proveedor de pago puede ser gasto.
 *   2. Con modo privado, un `aiMode` que pida OpenAI o Anthropic NO acaba
 *      llamandolos: se degrada a local. Un interruptor que se pueda esquivar
 *      cambiando un ajuste del inquilino no es un interruptor.
 *
 * La prueba dificil aqui no es la feliz. Es demostrar que el sistema **no
 * intenta** salir: que la cadena de proveedores ni siquiera menciona a los de
 * pago, en vez de mencionarlos y fallar despues.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const ENTORNO = { ...process.env };

/**
 * El router se importa FRESCO en cada caso.
 *
 * `getGlobalPrivateAiConfig()` se lee en el constructor y los modulos se cachean
 * entre pruebas: sin reimportar, la segunda prueba mediria la configuracion de
 * la primera. Es el error que ya costo un falso verde en el Bloque 1 (capturar
 * `process.env` al cargar el modulo y reinyectarlo).
 */
async function routerFresco() {
  const vitest = await import("vitest");
  vitest.vi.resetModules();
  const { PrivateAiRouter } = await import("../core/PrivateAiRouter");
  return new PrivateAiRouter();
}

/** La cadena de proveedores que el router elegiria, sin ejecutarla. */
async function cadena(router: unknown, mode: string, privateOnly: boolean): Promise<string[]> {
  // `pickChain` es privado en TypeScript; en ejecucion es un metodo normal y es
  // justo lo que hay que observar: QUE se iba a intentar, no que devolvio.
  return (router as { pickChain: (m: string, p: boolean) => Promise<string[]> })
    .pickChain(mode, privateOnly);
}

const DE_PAGO = ["openai", "anthropic"];

describe("BLOQUE 3 · interruptor de IA", () => {
  beforeEach(() => {
    process.env.NELVYON_AI_ENABLED = "0";
  });

  afterEach(() => {
    process.env = { ...ENTORNO };
  });

  it("EL CONTROL: encendida, la cadena SI puede incluir proveedores", async () => {
    // Sin este control, un router que devolviera siempre `["unconfigured"]`
    // pasaria todas las pruebas de abajo y dejaria el producto sin IA. "No
    // llama a nadie" no es la propiedad buscada: la propiedad es "no llama a
    // nadie CUANDO esta apagada".
    process.env.NELVYON_AI_ENABLED = "1";
    const r = await routerFresco();
    // Se usa `openai` y no `auto` a proposito: `auto` SONDEA disponibilidad, y
    // sin Ollama ni claves la cadena colapsa a `unconfigured` por si sola. Eso
    // es honesto, pero como control no sirve: mediria la ausencia de
    // infraestructura, no el interruptor.
    const c = await cadena(r, "openai", false);
    expect(c.length).toBeGreaterThan(1);
    expect(c).toContain("openai");
  });

  it.each(["auto", "local", "stub", "openai", "anthropic", "unconfigured"])(
    "apagada, el modo %s no llega a ningun proveedor",
    async (modo) => {
      const r = await routerFresco();
      const c = await cadena(r, modo, false);
      expect(c).toEqual(["unconfigured"]);
      for (const p of DE_PAGO) expect(c, modo).not.toContain(p);
    },
  );

  it("apagada, pedir OpenAI explicitamente no lo saca de la cadena", async () => {
    // El intento de esquive mas obvio: cambiar el ajuste del inquilino.
    const r = await routerFresco();
    const c = await cadena(r, "openai", false);
    expect(c).toEqual(["unconfigured"]);
  });

  it("apagada, el modo resuelto es `unconfigured` mirase por donde se mire", async () => {
    const r = await routerFresco();
    const svc = r as unknown as { resolveMode: (t?: unknown) => string };
    expect(svc.resolveMode()).toBe("unconfigured");
    expect(svc.resolveMode({ aiMode: "openai" })).toBe("unconfigured");
    expect(svc.resolveMode({ aiMode: "anthropic", privateAiOnly: false })).toBe("unconfigured");
  });
});

describe("BLOQUE 3 · modo privado", () => {
  beforeEach(() => {
    process.env.NELVYON_AI_ENABLED = "1";
  });

  afterEach(() => {
    process.env = { ...ENTORNO };
  });

  it("en modo privado, pedir OpenAI se degrada a local", async () => {
    const r = await routerFresco();
    const c = await cadena(r, "openai", true);
    for (const p of DE_PAGO) expect(c).not.toContain(p);
    expect(c.at(-1)).toBe("unconfigured");
  });

  it("en modo privado, pedir Anthropic se degrada a local", async () => {
    const r = await routerFresco();
    const c = await cadena(r, "anthropic", true);
    for (const p of DE_PAGO) expect(c).not.toContain(p);
  });

  it("EL CONTROL: sin modo privado y encendida, OpenAI SI entra en la cadena", async () => {
    // La otra mitad: si nunca entrara, las dos pruebas de arriba no medirian el
    // modo privado, medirian que el proveedor no existe.
    const r = await routerFresco();
    const c = await cadena(r, "openai", false);
    expect(c).toContain("openai");
  });

  it("`resolveMode` en modo privado nunca devuelve un proveedor de pago", async () => {
    const r = await routerFresco();
    const svc = r as unknown as { resolveMode: (t?: unknown) => string };
    for (const m of ["openai", "anthropic"]) {
      expect(svc.resolveMode({ aiMode: m, privateAiOnly: true })).not.toBe(m);
    }
  });
});
