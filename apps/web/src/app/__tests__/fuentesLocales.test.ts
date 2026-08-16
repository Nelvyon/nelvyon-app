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
 * Y NINGUNA SE DESCARGA EN TIEMPO DE EJECUCION
 * --------------------------------------------
 * El build dejo de salir a Internet, pero quedaba una dependencia remota mas
 * sutil: el certificado del LMS se genera como HTML suelto y llevaba dentro un
 * `@import` a la CSS API de Google. No lo pagaba el build sino el navegador de
 * quien abriera el certificado —o lo imprimiera—, y de paso le anunciaba la
 * visita a un tercero. Ese HTML ya no pasa por el pipeline de Next, asi que no
 * puede usar `next/font/local`: incrusta el woff2 en base64 con
 * `lib/fonts/fuentesEmbebidas.ts`.
 *
 * QUE COMPRUEBA
 * -------------
 *   1. Ningun fichero de `src` importa el cargador remoto.
 *   2. Todo `src` de `localFont` apunta a un fichero que existe y es woff2 de
 *      verdad — una ruta mal escrita rompe el build igual que una descarga
 *      fallida, y un HTML de error renombrado a .woff2 tambien.
 *   3. Ningun fichero de `src` NI de `public` —codigo, estilos o HTML— nombra
 *      los origenes de Google Fonts, que es la forma que toma la dependencia en
 *      tiempo de ejecucion.
 *   4. La CSP ya no los autoriza, y todo woff2 que pide el pack de `public`
 *      existe bajo `public/fonts` y es un woff2 de verdad.
 *
 * POR QUE EL BARRIDO LLEGA A `public`
 * -----------------------------------
 * El ultimo consumidor remoto no estaba en `src`: era el pack estatico —las 19
 * paginas de `public/www` y `public/w3crm/css/style.css`—, que se sirve tal cual
 * en este mismo origen y pedia su tipografia al CDN con `<link>` y `@import`. No
 * pasa por el pipeline de Next, asi que no puede usar `next/font/local`: declara
 * sus `@font-face` contra `public/fonts`. Mientras ese pack uso el CDN, la CSP
 * tuvo que autorizar los dos origenes y `lib/security/headers.ts` figuraba como
 * excepcion. Al autoalojarlo, la CSP se recorto y la excepcion desaparecio; el
 * barrido cubre ahora `public` para que nadie reintroduzca el patron ahi y
 * obligue a reabrirla.
 */

const SRC = path.resolve(__dirname, "../..");
const DIR_FUENTES = path.join(SRC, "fonts");
const PUBLICO = path.resolve(SRC, "../public");
/** Copia de las fuentes que consume el pack estatico: no pasa por el pipeline. */
const DIR_FUENTES_PUBLICAS = path.join(PUBLICO, "fonts");

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

/**
 * Los dos origenes de Google Fonts, montados por partes por el mismo motivo que
 * el especificador: nombrarlos enteros aqui dispararia el barrido contra este
 * fichero. El primero sirve la hoja de estilo (`@import` / `<link>`), el
 * segundo los ficheros de fuente que esa hoja referencia.
 */
const CDN_HOJA = ["fonts", "googleapis", "com"].join(".");
const CDN_FICHEROS = ["fonts", "gstatic", "com"].join(".");
const ORIGENES_REMOTOS = [CDN_HOJA, CDN_FICHEROS];

/** Devuelve los origenes remotos que aparecen en un fuente. Vacio = limpio. */
function origenesRemotosEn(src: string): string[] {
  return ORIGENES_REMOTOS.filter((origen) => src.includes(origen));
}

/**
 * Ficheros que legitimamente pueden nombrar los origenes remotos, con el motivo
 * y la condicion que invalida la excepcion si deja de cumplirse.
 *
 * `lib/security/headers.ts` estuvo aqui mientras la CSP tuvo que autorizar esos
 * dos origenes por el pack estatico de `public/`. Ese pack ya declara sus
 * `@font-face` contra `public/fonts`, la CSP se recorto y la excepcion se
 * retiro: el fichero pasa por el barrido como cualquier otro, asi que volver a
 * abrir la CSP a Google Fonts falla aqui.
 */
const PERMITIDOS_ORIGEN: Record<string, { motivo: string; comprueba: (src: string) => boolean }> = {
  "app/__tests__/fuentesLocales.test.ts": {
    motivo:
      "Este guard. Los nombra en la prosa que explica por que estan prohibidos " +
      "y los monta por partes para buscarlos sin dispararse contra si mismo. La " +
      "excepcion cubre la mencion, no la carga: sigue prohibido escribir una URL " +
      "a esos origenes, que es lo unico que provoca una peticion.",
    comprueba: (src) => ORIGENES_REMOTOS.every((origen) => !src.includes(`//${origen}`)),
  },
};

const EXTENSIONES = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts"]);

/**
 * Para los origenes remotos se mira ademas hoja de estilo y HTML: un `@import`
 * o un `<link>` no necesitan pasar por un fichero de codigo para salir a la red.
 */
const EXTENSIONES_CON_ESTILOS = new Set([...EXTENSIONES, ".css", ".scss", ".html"]);

function ficherosDeCodigo(dir: string, extensiones = EXTENSIONES): string[] {
  const salida: string[] = [];
  for (const entrada of fs.readdirSync(dir, { withFileTypes: true })) {
    const completa = path.join(dir, entrada.name);
    if (entrada.isDirectory()) {
      if (entrada.name === "node_modules") continue;
      salida.push(...ficherosDeCodigo(completa, extensiones));
    } else if (extensiones.has(path.extname(entrada.name))) {
      salida.push(completa);
    }
  }
  return salida;
}

const TODOS = ficherosDeCodigo(SRC);

/**
 * El barrido de origenes remotos cubre `src` y tambien `public`. El pack
 * estatico no pasa por el pipeline de Next —se sirve tal cual, en este mismo
 * origen— asi que puede salir a la red sin que ningun fichero de `src` lo
 * delate: era justo lo que obligaba a mantener los dos origenes en la CSP.
 * Ahora que tambien esta autoalojado, `public` entra en el barrido para que
 * nadie reintroduzca el patron por ahi y vuelva a hacer falta abrir la CSP.
 */
const TODOS_CON_ESTILOS = [
  ...ficherosDeCodigo(SRC, EXTENSIONES_CON_ESTILOS),
  ...ficherosDeCodigo(PUBLICO, EXTENSIONES_CON_ESTILOS),
];

/** Ruta relativa a `src`; los ficheros de `public` salen como `../public/...`. */
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

describe("fuentes — el navegador tampoco sale a Internet a por ellas", () => {
  it("el barrido cubre codigo, estilos y el pack estatico de public", () => {
    // Control positivo: el barrido ancho tiene que ver, como minimo, todo lo que
    // ve el de codigo; si se quedara corto, lo de abajo daria verde sin mirar.
    const nombres = TODOS_CON_ESTILOS.map(rel);
    expect(TODOS_CON_ESTILOS.length).toBeGreaterThan(TODOS.length);
    expect(nombres).toContain("app/api/saas/lms/cert/[id]/route.ts");
    // Y alcanza en concreto el pack estatico, que es lo que mantenia abierta la
    // CSP: la hoja de W3CRM y las paginas de `public/www`.
    expect(nombres).toContain("../public/w3crm/css/style.css");
    expect(nombres).toContain("../public/www/index.html");
    expect(nombres.filter((n) => /^\.\.\/public\/www\/.+\.html$/.test(n)).length).toBeGreaterThan(15);
  });

  it("el detector reconoce una carga remota y no se dispara con una local", () => {
    // Control negativo: la deteccion se prueba contra muestras sinteticas, no
    // contra el arbol, para no depender de que exista una infraccion real. La
    // primera es literalmente lo que llevaba dentro el certificado.
    const remota = `@import url('https://${CDN_HOJA}/css2?family=Playfair+Display:wght@400;700');`;
    const remotaFichero = `src: url(https://${CDN_FICHEROS}/s/inter/v13/inter.woff2) format('woff2');`;
    const local = "@font-face{font-family:'Inter';src:url(data:font/woff2;base64,d09GMgAB) format('woff2')}";

    expect(origenesRemotosEn(remota)).toEqual([CDN_HOJA]);
    expect(origenesRemotosEn(remotaFichero)).toEqual([CDN_FICHEROS]);
    expect(origenesRemotosEn(local)).toEqual([]);
  });

  it("ni src ni public nombran los origenes de Google Fonts", () => {
    const culpables = TODOS_CON_ESTILOS.filter((f) => {
      if (PERMITIDOS_ORIGEN[rel(f)]) return false;
      return origenesRemotosEn(lee(f)).length > 0;
    }).map(rel);

    expect(
      culpables,
      `${culpables.length} ficheros hacen que el navegador pida tipografia a un CDN ` +
        `de terceros. Autoalojala: con next/font/local si el HTML lo renderiza Next, ` +
        `incrustandola con lib/fonts/fuentesEmbebidas.ts si es HTML generado suelto, ` +
        `o con un @font-face contra /fonts si es del pack estatico de public:\n  ` +
        `${culpables.join("\n  ")}`,
    ).toEqual([]);
  });

  it("la CSP no autoriza ya esos origenes", () => {
    // El barrido de arriba ya cubre `headers.ts` —dejo de estar excepcionado al
    // autoalojar el pack de `public/`—, pero eso solo prohibe nombrarlos. Esto
    // fija lo que de verdad importa: que las dos directivas quedaron recortadas.
    const csp = lee(path.join(SRC, "lib/security/headers.ts"));
    expect(csp).toContain(`"style-src 'self' 'unsafe-inline'"`);
    expect(csp).toContain(`"font-src 'self' data:"`);
  });

  it("las excepciones de origen existen y siguen justificadas", () => {
    for (const [nombre, { comprueba }] of Object.entries(PERMITIDOS_ORIGEN)) {
      const completa = path.join(SRC, nombre);
      expect(fs.existsSync(completa), `excepcion declarada e inexistente: ${nombre}`).toBe(true);
      expect(
        comprueba(lee(completa)),
        `${nombre} ya no cumple el supuesto que justificaba su excepcion`,
      ).toBe(true);
    }
  });

  it("cada woff2 que pide el pack estatico existe y es un woff2 de verdad", () => {
    // El pack no pasa por Next: nadie resuelve sus rutas en build, asi que una
    // ruta mal escrita no rompe nada visible — la pagina se limita a caer en el
    // fallback y perder su tipografia sin avisar.
    const rotos: string[] = [];
    const paginas: string[] = [];
    const enUso = new Set<string>();

    for (const fichero of ficherosDeCodigo(PUBLICO, EXTENSIONES_CON_ESTILOS)) {
      for (const [, nombre] of lee(fichero).matchAll(/["']\/fonts\/([^"')]+\.woff2)["']/g)) {
        const resuelta = path.join(DIR_FUENTES_PUBLICAS, nombre);
        enUso.add(resuelta);
        if (!fs.existsSync(resuelta)) rotos.push(`${rel(fichero)} -> /fonts/${nombre}`);
        else if (!esWoff2(resuelta)) paginas.push(`${rel(fichero)} -> /fonts/${nombre}`);
      }
    }

    expect(enUso.size, "public/ no declara ningun @font-face local").toBeGreaterThan(5);
    expect(rotos, `rutas de fuente inexistentes bajo public/fonts:\n  ${rotos.join("\n  ")}`).toEqual(
      [],
    );
    expect(paginas, `ficheros sin cabecera wOF2:\n  ${paginas.join("\n  ")}`).toEqual([]);

    // Y sin huerfanos, por el mismo motivo que en `src/fonts`.
    const huerfanos = fs
      .readdirSync(DIR_FUENTES_PUBLICAS)
      .filter((n) => n.endsWith(".woff2"))
      .filter((n) => !enUso.has(path.join(DIR_FUENTES_PUBLICAS, n)));
    expect(huerfanos, `woff2 sin ningun consumidor:\n  ${huerfanos.join("\n  ")}`).toEqual([]);
  });

  it("el certificado del LMS incrusta la fuente en vez de pedirla", () => {
    // El arreglo se puede deshacer sin reintroducir el dominio: bastaria con
    // borrar la llamada y dejar el documento sin tipografia propia.
    const ruta = path.join(SRC, "app/api/saas/lms/cert/[id]/route.ts");
    const src = lee(ruta);
    expect(src).toContain('cssFuentesEmbebidas("Playfair Display", "Inter")');
    // Y con las mismas familias que declara su CSS, no otras.
    expect(src).toContain("font-family: 'Playfair Display', serif");
    expect(src).toContain("font-family: 'Inter', sans-serif");
  });
});
