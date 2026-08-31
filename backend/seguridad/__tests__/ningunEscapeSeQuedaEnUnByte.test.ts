/**
 * NINGÚN `\b` SE QUEDA CONVERTIDO EN UN BYTE INVISIBLE.
 *
 * EL ERROR, QUE HA MORDIDO SEIS VECES. Cuando se escribe una expresión
 * regular desde una cadena de Python o desde una plantilla de JavaScript y se
 * pone `\b` en vez de `\\b`, el intérprete no escribe la barra y la b: escribe
 * **el carácter 0x08**, el retroceso. Y 0x08 no se ve. Al abrir el fichero
 * después, la línea parece correcta:
 *
 *     /Minified React error #(418|423)/      <- lo que se lee
 *     /Minified React error #(418|423)\b/    <- lo que se quiso escribir
 *     /Minified React error #(418|423)<08>/  <- lo que hay
 *
 * La expresión pasa a exigir un carácter de retroceso literal, que no aparece
 * jamás. Deja de casar con nada y no da ningún error: simplemente devuelve
 * `false` siempre.
 *
 * DÓNDE HA PASADO EN ESTE REPOSITORIO:
 *
 *   · `nada-de-secretos-en-los-diagnosticos.mjs` — el filtro de proyecciones
 *     seguras no casaba, y el detector señalaba cinco líneas correctas;
 *   · `rechazos-que-se-tragan.mjs` — dos veces: ni respetaba la intención
 *     declarada del autor ni distinguía una llamada de autorización de una
 *     simple mención;
 *   · `saas-sector-benchmark.spec.ts` — ANTERIOR a todo esto y no mío:
 *     `esErrorDeHidratacion` no reconocía los errores #418 ni #423 de React,
 *     que es exactamente lo único que esa función existe para reconocer. El
 *     comentario de la propia función explica que se escribió para evitar «un
 *     mensaje opaco e imposible de diagnosticar»; el arreglo llevaba el mismo
 *     defecto que arreglaba.
 *
 *   · `elErrorDeUnProveedorNoSeGuardaEnCrudo.test.ts` — dentro de un fichero
 *     de PRUEBA, que la primera version de este guardian excluia;
 *   · y la sexta, dentro del comentario de este mismo fichero que explica el
 *     error. Escribiendo la explicacion del fallo, cometi el fallo.
 *
 * Cinco de los seis los produje yo en esta sesion. NINGUNO dio error. Todos se
 * descubrieron por el comportamiento raro que causaban, no por leerlos —
 * porque leyendolos no se ven.
 *
 * POR QUE UNA PRUEBA Y NO «TENER CUIDADO». Tener cuidado se intento cinco
 * veces y fallo cinco veces, la ultima al redactar este parrafo. Un byte
 * invisible es exactamente la clase de cosa que una revision humana no puede
 * atrapar, y una maquina si, en un segundo.
 *
 * (La forma segura de escribirlo desde una capa de generacion es construir la
 * barra aparte —`chr(92) + "b"`— en vez de confiar en el escapado.)
 *
 * COSTE EXTERNO: 0 €. Lee ficheros.
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const RAIZ = path.resolve(__dirname, "..", "..", "..");

/**
 * Caracteres de control que casi siempre son un escape que se quedó a medias.
 *
 * No se incluyen el tabulador (0x09), el salto de línea (0x0A) ni el retorno
 * (0x0D): esos aparecen en cualquier fichero de texto con toda legitimidad.
 */
const SOSPECHOSOS: ReadonlyArray<[number, string]> = [
  [0x08, "\\b"],
  [0x0b, "\\v"],
  [0x0c, "\\f"],
  [0x1b, "\\e"],
];

/**
 * Sólo código, y sólo código que no sea una prueba.
 *
 * QUÉ SE DEJA FUERA Y POR QUÉ. La primera versión miraba todo el árbol y señaló
 * tres cosas legítimas:
 *
 *   · `subrutaDeProxy.test.ts` usa un byte nulo A PROPÓSITO, porque prueba
 *     inyección de byte nulo en rutas. Prohibírselo sería impedir que se pruebe
 *     el ataque;
 *   · `docs/evidence/**` guarda salida capturada tal cual, con los bytes que
 *     trajera;
 *   · `docs/DECISIONS.md` ni siquiera es UTF-8 válido, así que el hallazgo era
 *     un artefacto de decodificación, no un escape roto.
 *
 * Los tres son correctos. Señalarlos sería la forma más rápida de que esta
 * prueba acabe desactivada, y entonces dejaría de proteger también lo que sí
 * importa.
 *
 * También se quitan `\0` y `\a` de la lista: en este repositorio no han
 * producido ningún fallo, y el nulo aparece legítimamente en pruebas de
 * seguridad. Quedan los cuatro que sí han mordido.
 */
const EXTENSIONES = /\.(ts|tsx|mjs|cjs|js|jsx|sql|py)$/;
/**
 * QUE SE DEJA FUERA: solo la documentacion y la evidencia capturada.
 *
 * LOS FICHEROS DE PRUEBA SI SE MIRAN, y esto se corrigio despues de que el
 * error apareciera por QUINTA vez —dentro de un fichero de prueba, que la
 * version anterior excluia—. Un `\b` colapsado en un comentario de una prueba
 * es igual de invisible que en cualquier otro sitio.
 *
 * Lo que se excluia por las pruebas era el byte nulo, que `subrutaDeProxy`
 * usa A PROPOSITO para probar inyeccion. Ese ya no esta en la lista de
 * sospechosos, asi que no hace falta excluir las pruebas enteras: los cuatro
 * que quedan —0x08, 0x0B, 0x0C, 0x1B— no tienen uso legitimo en ningun sitio.
 */
const FUERA = /^docs\//;

function ficherosDeTexto(): string[] {
  return execFileSync("git", ["ls-files"], {
    cwd: RAIZ,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  })
    .split("\n")
    .filter((f) => f && EXTENSIONES.test(f) && !FUERA.test(f));
}

describe("los escapes llegan enteros al fichero", () => {
  const ficheros = ficherosDeTexto();

  it("el denominador no es cero: un cero aquí sería un aprobado falso", () => {
    // Si `git ls-files` devolviera vacío, la prueba de abajo pasaría sin haber
    // abierto un solo fichero.
    expect(ficheros.length).toBeGreaterThan(1000);
  });

  it("EL ALCANCE INCLUYE LOS FICHEROS DE PRUEBA", () => {
    /**
     * Esto se comprueba aparte, y por una razón concreta. La primera versión
     * excluía las pruebas, y el error apareció justo ahí: en un comentario de
     * `elErrorDeUnProveedorNoSeGuardaEnCrudo.test.ts`.
     *
     * Y una vez limpiado el árbol, volver a excluirlas NO rompe la prueba de
     * abajo —no queda ningún byte que encontrar—, así que encoger el alcance
     * sería un cambio invisible. Un alcance sin comprobar es un alcance que se
     * encoge solo. Aquí se afirma directamente.
     */
    expect(ficheros.some((f) => /__tests__|\.test\.ts$/.test(f))).toBe(true);
    expect(ficheros.some((f) => f.startsWith("backend/"))).toBe(true);
    expect(ficheros.some((f) => f.startsWith("scripts/"))).toBe(true);
    // La documentación sí queda fuera: `docs/evidence/**` guarda salida
    // capturada con los bytes que trajera, y no es código.
    expect(ficheros.some((f) => f.startsWith("docs/"))).toBe(false);
  });

  it("LA REGLA: ningún fichero de código lleva un carácter de control colado", () => {
    const hallazgos: string[] = [];
    for (const rel of ficheros) {
      const abs = path.join(RAIZ, rel);
      if (!fs.existsSync(abs)) continue;
      let texto: string;
      try {
        texto = fs.readFileSync(abs, "utf8");
      } catch {
        continue;
      }
      for (const [codigo, nombre] of SOSPECHOSOS) {
        const ch = String.fromCharCode(codigo);
        let desde = texto.indexOf(ch);
        while (desde !== -1) {
          const linea = texto.slice(0, desde).split("\n").length;
          hallazgos.push(
            `${rel}:${linea}  hay un 0x${codigo.toString(16).padStart(2, "0")} — ` +
              `probablemente se quiso escribir «${nombre}»`,
          );
          desde = texto.indexOf(ch, desde + 1);
        }
      }
    }
    expect(
      hallazgos,
      `escapes que se quedaron en un byte invisible:\n${hallazgos.join("\n")}`,
    ).toEqual([]);
  });
});

describe("el detector detecta de verdad", () => {
  it("EL CONTROL POSITIVO: encuentra un 0x08 plantado", () => {
    // Sin esto, un lector roto daría «0 ficheros afectados» y el repositorio
    // parecería limpio sin haber mirado nada.
    const mutante = `const re = /error #(418|423)${String.fromCharCode(8)}/;`;
    expect(mutante.includes(String.fromCharCode(8))).toBe(true);

    const encontrados = SOSPECHOSOS.filter(([c]) => mutante.includes(String.fromCharCode(c)));
    expect(encontrados.map(([, n]) => n)).toEqual(["\\b"]);
  });

  it("EL CONTROL NEGATIVO: un `\\b` bien escrito no se señala", () => {
    // Dos caracteres —barra y b— son lo correcto y no deben marcarse. Si esta
    // prueba fallara, la de arriba estaría prohibiendo el uso legítimo.
    const correcto = String.raw`const re = /error #(418|423)\b/;`;
    const encontrados = SOSPECHOSOS.filter(([c]) => correcto.includes(String.fromCharCode(c)));
    expect(encontrados).toEqual([]);
  });

  it("no se prohíben los caracteres de texto normales", () => {
    // Tabulador, salto de línea y retorno aparecen en cualquier fichero.
    const normal = "linea uno\n\tsangrada\r\nfin";
    const encontrados = SOSPECHOSOS.filter(([c]) => normal.includes(String.fromCharCode(c)));
    expect(encontrados).toEqual([]);
  });
});
