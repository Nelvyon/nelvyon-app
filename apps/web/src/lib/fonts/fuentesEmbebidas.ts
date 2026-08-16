import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Fuentes autoalojadas incrustadas como data URI, para el HTML que el servidor
 * escribe a mano y sirve suelto.
 *
 * POR QUE EXISTE ESTO
 * -------------------
 * Documentos como el certificado del LMS se generan como una cadena de HTML y
 * salen tal cual por la respuesta: no pasan por el pipeline de Next, asi que no
 * pueden usar `next/font/local` —no hay componente que emita el `<link>` ni URL
 * generada a la que apuntar—. Resolvian la tipografia con un `@import` a la CSS
 * API de Google, y eso convertia cada apertura del documento en una peticion a
 * un tercero: el mismo punto de fallo remoto que se elimino del build (ver
 * `src/fonts/README.md`), solo que desplazado al navegador de quien abre el
 * certificado, donde ademas filtra su visita a Google.
 *
 * COMO LO EVITA
 * -------------
 * Se lee el woff2 que ya vive en el repositorio y se emite un `@font-face` con
 * la fuente en base64 dentro del propio documento. No hay peticion externa, no
 * depende de que ninguna ruta estatica resuelva en produccion, y no toca el
 * bundle del cliente: la lectura y el encoding ocurren en el servidor y el
 * resultado viaja dentro del HTML que ya se estaba enviando.
 *
 * Son las mismas familias variables del subconjunto latin que usa el resto del
 * producto, asi que cubren de sobra los pesos que pedia la version remota.
 */

/** Familias disponibles, con su fichero y el eje de peso del variable. */
const FAMILIAS = {
  "Playfair Display": { fichero: "playfair-display-latin-variable.woff2", pesos: "400 900" },
  Inter: { fichero: "inter-latin-variable.woff2", pesos: "100 900" },
} as const;

export type FamiliaEmbebida = keyof typeof FAMILIAS;

/**
 * Raices candidatas. Al servir, `process.cwd()` es `apps/web` —igual que en las
 * demas rutas que leen ficheros del repositorio en tiempo de ejecucion—, pero
 * un test o un script lanzado desde la raiz del monorepo tiene otro cwd.
 */
const RAICES = ["src/fonts", "apps/web/src/fonts"];

/**
 * Una regla por familia, cacheada en el modulo: leer y codificar decenas de KB
 * en cada peticion seria trabajo repetido sobre un fichero que no cambia.
 */
const cache = new Map<FamiliaEmbebida, string>();

function leeBase64(fichero: string): string | null {
  for (const raiz of RAICES) {
    try {
      return readFileSync(path.join(process.cwd(), raiz, fichero)).toString("base64");
    } catch {
      // Raiz que no aplica en este cwd: se prueba la siguiente.
    }
  }
  return null;
}

function reglaFontFace(familia: FamiliaEmbebida): string {
  const cacheada = cache.get(familia);
  if (cacheada !== undefined) return cacheada;

  const { fichero, pesos } = FAMILIAS[familia];
  const base64 = leeBase64(fichero);
  // Si el fichero faltara, se emite regla vacia: el documento cae en el fallback
  // declarado en su `font-family` (`serif` / `sans-serif`) en vez de romperse
  // —y sin volver a salir a Internet, que es justo lo que se quiere evitar—.
  const regla = base64
    ? `@font-face{font-family:'${familia}';` +
      `src:url(data:font/woff2;base64,${base64}) format('woff2');` +
      `font-weight:${pesos};font-style:normal;font-display:swap}`
    : "";

  cache.set(familia, regla);
  return regla;
}

/** CSS listo para incrustar en un `<style>`: un `@font-face` por familia. */
export function cssFuentesEmbebidas(...familias: FamiliaEmbebida[]): string {
  return familias
    .map(reglaFontFace)
    .filter((regla) => regla !== "")
    .join("\n");
}
