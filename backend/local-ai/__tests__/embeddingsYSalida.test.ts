/**
 * BLOQUE 3 · embeddings propios y política de salida.
 *
 * El embedding es la pieza donde un fallo silencioso hace más daño y se ve
 * menos. Un vector de dimensión equivocada **se guarda sin error** en una
 * columna de vectores y a partir de ahí la búsqueda semántica devuelve
 * resultados que parecen ordenados y no lo están. Nadie lo nota: hay
 * resultados, salen rápido, están mal.
 *
 * Por eso las pruebas de aquí son casi todas negativas: lo que importa no es que
 * calcule bien un vector, es que **se niegue** cuando no puede.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ENTORNO = { ...process.env };
const fetchOriginal = globalThis.fetch;

beforeEach(() => {
  process.env.LOCAL_AI_EMBEDDING_DIM = "4";
  process.env.LOCAL_AI_EMBEDDING_MODEL = "modelo-de-prueba";
  process.env.PRIVATE_MODE = "0";
});

afterEach(() => {
  process.env = { ...ENTORNO };
  globalThis.fetch = fetchOriginal;
  vi.restoreAllMocks();
});

/** Proveedor recién importado: la config se lee al construir. */
async function proveedorFresco() {
  vi.resetModules();
  const { LocalEmbeddingProvider } = await import("../LocalEmbeddingProvider");
  return new LocalEmbeddingProvider();
}

function respuestaDe(cuerpo: unknown, status = 200) {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("BLOQUE 3 · embeddings propios", () => {
  it("EL CONTROL: un vector de la dimensión correcta se acepta", async () => {
    // Sin esto, un proveedor que rechazara todo pasaría las pruebas de abajo y
    // dejaría el producto sin poder indexar nada.
    globalThis.fetch = vi.fn(async () => respuestaDe({ embedding: [0.1, 0.2, 0.3, 0.4] })) as never;
    const p = await proveedorFresco();
    const r = await p.embed("texto de prueba");
    expect(r.vector).toHaveLength(4);
    expect(r.dim).toBe(4);
    expect(r.model).toBe("modelo-de-prueba");
  });

  it("un texto VACÍO se rechaza en vez de devolver un vector de ceros", async () => {
    // Un vector de ceros se guarda igual de bien que uno real, y luego casa con
    // todo o con nada según la métrica. Es corrupción silenciosa del índice.
    const p = await proveedorFresco();
    await expect(p.embed("   ")).rejects.toThrow(/empty/i);
  });

  it("una dimensión DISTINTA se rechaza, no se recorta ni se rellena", async () => {
    // El fallo grave. Un vector de 3 posiciones en una columna de 4 -o al revés-
    // rompe la búsqueda semántica sin que nada falle a la vista.
    globalThis.fetch = vi.fn(async () => respuestaDe({ embedding: [0.1, 0.2, 0.3] })) as never;
    const p = await proveedorFresco();
    await expect(p.embed("texto")).rejects.toThrow(/dim mismatch/i);
  });

  it("una respuesta sin vector se rechaza", async () => {
    // Devolver `[]` como vector válido sería peor que fallar: quedaría indexado.
    globalThis.fetch = vi.fn(async () => respuestaDe({ algo: "otra cosa" })) as never;
    const p = await proveedorFresco();
    await expect(p.embed("texto")).rejects.toThrow();
  });

  it("una respuesta que no es JSON se rechaza CON contexto", async () => {
    // Un proxy o una página de error devuelven HTML con 200. Sin el contexto en
    // el mensaje, el diagnóstico es adivinar.
    globalThis.fetch = vi.fn(
      async () => new Response("<html>gateway</html>", { status: 200 }),
    ) as never;
    const p = await proveedorFresco();
    await expect(p.embed("texto")).rejects.toThrow(/non-JSON/i);
  });

  it("un error HTTP se propaga, no se convierte en vector", async () => {
    globalThis.fetch = vi.fn(async () => respuestaDe({ error: "modelo no cargado" }, 500)) as never;
    const p = await proveedorFresco();
    await expect(p.embed("texto")).rejects.toThrow(/modelo no cargado/i);
  });

  it("acepta la forma alternativa `embeddings[0]` del proveedor", async () => {
    // Ollama cambió de `embedding` a `embeddings` entre versiones. Soportar las
    // dos no es laxitud: es que la misma instalación puede tener cualquiera.
    globalThis.fetch = vi.fn(async () => respuestaDe({ embeddings: [[1, 2, 3, 4]] })) as never;
    const p = await proveedorFresco();
    expect((await p.embed("texto")).vector).toEqual([1, 2, 3, 4]);
  });

  it("`isAvailable` dice que NO cuando el servicio no responde", async () => {
    // Decir que sí y fallar después convierte un problema de infraestructura en
    // un fallo a mitad de un trabajo del cliente.
    globalThis.fetch = vi.fn(async () => {
      throw new Error("conexion rechazada");
    }) as never;
    const p = await proveedorFresco();
    expect(await p.isAvailable()).toBe(false);
  });
});

describe("BLOQUE 3 · política de salida", () => {
  it("EL CONTROL: sin modo privado, la salida está permitida", async () => {
    vi.resetModules();
    process.env.PRIVATE_MODE = "0";
    const { isPrivateMode } = await import("../../private-ai/privateMode");
    expect(isPrivateMode()).toBe(false);
  });

  it("por DEFECTO el modo privado está encendido", async () => {
    // Fallo cerrado: si nadie lo configura, no se sale a internet. Lo contrario
    // -abierto por defecto- convierte un despliegue olvidado en una fuga.
    vi.resetModules();
    delete process.env.PRIVATE_MODE;
    delete process.env.NELVYON_PRIVATE_MODE;
    const { isPrivateMode } = await import("../../private-ai/privateMode");
    expect(isPrivateMode()).toBe(true);
  });

  it("el modo privado se puede declarar de varias formas equivalentes", async () => {
    for (const valor of ["1", "ON", "true"]) {
      vi.resetModules();
      process.env.PRIVATE_MODE = valor;
      const { isPrivateMode } = await import("../../private-ai/privateMode");
      expect(isPrivateMode(), valor).toBe(true);
    }
    for (const valor of ["0", "OFF", "false"]) {
      vi.resetModules();
      process.env.PRIVATE_MODE = valor;
      const { isPrivateMode } = await import("../../private-ai/privateMode");
      expect(isPrivateMode(), valor).toBe(false);
    }
  });

  it("un valor sin sentido no apaga el modo privado", async () => {
    // Fallo cerrado también ante una configuración mal escrita: `PRIVATE_MODE=si`
    // no puede interpretarse como apagado.
    vi.resetModules();
    process.env.PRIVATE_MODE = "quizas";
    const { isPrivateMode } = await import("../../private-ai/privateMode");
    expect(isPrivateMode()).toBe(true);
  });
});
