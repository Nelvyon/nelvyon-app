import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Ninguna fuente se descarga en tiempo de build: todas van autoalojadas.
 *
 * EL FALLO QUE ESTO IMPIDE
 * ------------------------
 * El build de produccion —CI y local— se cayo con:
 *
 *     Failed to fetch `Manrope` from Google Fonts
 *
 * No fue un corte generico. `fonts.googleapis.com` respondia 200 y las otras
 * quince familias descargaban bien; lo que fallaba eran los ficheros del
 * subconjunto latin de Manrope, que devolvian 404 mientras la hoja de estilo
 * seguia anunciandolos. Una incoherencia del lado de Google, imposible de
 * arreglar desde aqui.
 *
 * Que aquel dia solo fallara una familia fue suerte. `next/font/google`
 * descarga la fuente durante el build, asi que cada import era un punto de
 * fallo remoto capaz de tumbar un despliegue sin previo aviso. Las dieciseis
 * familias viven ahora en `src/fonts` y se cargan con `next/font/local`.
 *
 * POR QUE UN GUARD Y NO SOLO EL ARREGLO
 * -------------------------------------
 * Reintroducir la fragilidad cuesta una linea: alguien añade una pagina nueva,
 * copia del ejemplo de la documentacion el import del cargador remoto, y el
 * build vuelve a depender de un CDN de terceros. El sintoma no aparece hasta
 * que Google falla, que es justo el peor momento para descubrirlo.
 *
 * QUE COMPRUEBA
 * -------------
 *   1. Ningun fichero de `src` importa el cargador remoto.
 *   2. Todo `src` de `localFont` apunta a un fichero que existe y es woff2 de
 *      verdad — una ruta mal escrita rompe el build igual que una descarga
 *      fallida, y un HTML de error renombrado a .woff2 tambien.
 */

const SRC = path.resolve(__dirname, "../..");
const DIR_FUENTES = path.join(SRC, "fonts");

/** El especificador prohibido, montado por partes para no autodelatarse. */
const CARGADOR_REMOTO = ["next", "font", "google"].join("/");

/** La forma que de verdad dispara la descarga: importarlo, no nombrarlo. */
const IMPORTA_CARGADOR_REMOTO = new RegExp(`from\\s*["']${CARGADOR_REMOTO}["']`);

/**
 * Ficheros que legitimamente pueden nombrar el cargador remoto, con el motivo y
 * una comprobacion que invalida la excepcion si deja de cumplirse el supuesto.
 */
const PERMITIDOS: Record<string, { motivo: string; comprueba: (src: string) => boolean }> = {
  "app/__tests__/fuentesLocales.test.ts": {
    motivo:
      "Este guard. Nombra el especificador en la prosa que explica por que esta " +
      "prohibido, y lo monta por partes para buscarlo sin dispararse contra si " +
      "mismo. La excepcion cubre solo la mencion: sigue prohibido importarlo, " +
      "que es lo unico que provocaria una descarga.",
    comprueba: (src) => !IMPORTA_CARGADOR_REMOTO.test(src),
  },
};

const EXTENSIONES = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts"]);

function ficherosDeCodigo(dir: string): string[] {
  const salida: string[] = [];
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const completa = path.join(dir, entrada.name);
    if (entrada.isDirectory()) {
      if (entrada.name === "node_modules") continue;
      salida.push(...ficherosDeCodigo(completa));
    } else if (EXTENSIONES.has(path.extname(entrada.name))) {
      salida.push(completa);
    }
  }
  return salida;
}

const TODOS = ficherosDeCodigo(SRC);
const rel = (f: string) => path.relative(SRC, f).split(path.sep).join("/");
const lee = (f: string) => fs.readFileSync(f, "utf8");

/** Firma de un woff2: las cuatro primeras letras del fichero son `wOF2`. */
function esWoff2(fichero: string): boolean {
  const cabecera = Buffer.alloc(4);
  const fd = fs.openSync(fichero, "r");
  try {
    fs.readSync(fd, cabecera, 0, 4, 0);
  } finally {
    fs.closeSync(fd);
  }
  return cabecera.toString("latin1") === "wOF2";
}

describe("fuentes — el build no sale a Internet a por ellas", () => {
  it("el barrido encuentra los ficheros de src", () => {
    // Control positivo: sin esto, una ruta mal resuelta daria verde con cero
    // ficheros y el guard no vigilaria nada.
    expect(fs.existsSync(SRC)).toBe(true);
    expect(TODOS.length).toBeGreaterThan(500);
    // Y encuentra en concreto los layouts que motivaron el cambio.
    expect(TODOS.filter((f) => /os\/.+-premium\/layout\.tsx$/.test(rel(f))).length).toBeGreaterThan(20);
  });

  it("el barrido sabe reconocer el import prohibido", () => {
    // Segundo control positivo: la deteccion se prueba contra una muestra
    // sintetica, no contra el arbol, para que no dependa de que exista una
    // infraccion real.
    const muestra = `import { Inter } from "${CARGADOR_REMOTO}";`;
    expect(muestra.includes(CARGADOR_REMOTO)).toBe(true);
  });

  it("ningun fichero de src importa el cargador remoto de fuentes", () => {
    const culpables = TODOS.filter((f) => {
      if (PERMITIDOS[rel(f)]) return false;
      return lee(f).includes(CARGADOR_REMOTO);
    }).map(rel);

    expect(
      culpables,
      `${culpables.length} ficheros descargan la fuente de Google durante el build ` +
        `en vez de usar next/font/local con un woff2 de src/fonts:\n  ${culpables.join("\n  ")}`,
    ).toEqual([]);
  });

  it("hay consumidores de localFont — el cambio no se deshizo por la via facil", () => {
    // Si alguien quitase los imports remotos borrando las fuentes en vez de
    // autoalojarlas, lo anterior seguiria en verde. Esto no.
    const consumidores = TODOS.filter((f) => lee(f).includes("next/font/local")).map(rel);
    expect(consumidores.length).toBeGreaterThan(20);
    expect(consumidores).toContain("app/fonts.ts");
  });

  it("cada woff2 referenciado existe y es un woff2 de verdad", () => {
    const rotos: string[] = [];
    const paginas: string[] = [];

    for (const fichero of TODOS) {
      const src = lee(fichero);
      if (!src.includes("next/font/local")) continue;
      for (const [, ruta] of src.matchAll(/src:\s*"([^"]+\.woff2)"/g)) {
        const resuelta = path.resolve(path.dirname(fichero), ruta);
        if (!fs.existsSync(resuelta)) rotos.push(`${rel(fichero)} -> ${ruta}`);
        else if (!esWoff2(resuelta)) paginas.push(`${rel(fichero)} -> ${ruta}`);
      }
    }

    expect(rotos, `rutas de fuente inexistentes:\n  ${rotos.join("\n  ")}`).toEqual([]);
    expect(
      paginas,
      `ficheros que no son woff2 —una pagina de error descargada por equivocacion ` +
        `tiene extension .woff2 pero no cabecera wOF2:\n  ${paginas.join("\n  ")}`,
    ).toEqual([]);
  });

  it("todo woff2 de src/fonts esta en uso", () => {
    // Evita que el directorio acumule ficheros de familias ya retiradas.
    const enUso = new Set<string>();
    for (const fichero of TODOS) {
      for (const [, ruta] of lee(fichero).matchAll(/src:\s*"([^"]+\.woff2)"/g)) {
        enUso.add(path.resolve(path.dirname(fichero), ruta));
      }
    }
    const huerfanos = fs
      .readdirSync(DIR_FUENTES)
      .filter((n) => n.endsWith(".woff2"))
      .filter((n) => !enUso.has(path.join(DIR_FUENTES, n)));

    expect(huerfanos, `woff2 sin ningun consumidor:\n  ${huerfanos.join("\n  ")}`).toEqual([]);
  });

  it("las excepciones declaradas existen y siguen justificadas", () => {
    // Si una excepcion se renombra o cambia de conducta, hay que revisarla en
    // vez de arrastrarla.
    for (const [nombre, { comprueba }] of Object.entries(PERMITIDOS)) {
      const completa = path.join(SRC, nombre);
      expect(fs.existsSync(completa), `excepcion declarada e inexistente: ${nombre}`).toBe(true);
      expect(
        comprueba(lee(completa)),
        `${nombre} ya no cumple el supuesto que justificaba su excepcion`,
      ).toBe(true);
    }
  });
});
