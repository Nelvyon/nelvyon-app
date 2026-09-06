/**
 * Escribir un fichero de evidencia sin ensuciar el arbol cuando nada ha cambiado.
 *
 * ── EL PROBLEMA, QUE PARECE MENOR Y NO LO ES ────────────────────────────────
 *
 * Dos baterias miden algo real —que agentes piden lo mismo, cuanto personaliza
 * cada servicio— y dejan el resultado en un JSON versionado. Las dos escribian
 * el fichero SIEMPRE, con un `generado` nuevo aunque la medicion fuera identica.
 *
 * Consecuencia: pasar las pruebas modificaba dos ficheros del repositorio sin que
 * hubiera cambiado nada medido. Y con eso se pierde la unica senal barata que hay
 * para saber si una certificacion es limpia: «el arbol de trabajo esta a cero».
 * Cuando el arbol siempre esta sucio, deja de mirarse, y el dia que aparezca un
 * cambio de verdad se confundira con el ruido de siempre.
 *
 * ── LA REGLA ────────────────────────────────────────────────────────────────
 *
 * Se compara lo medido IGNORANDO la marca de tiempo. Si es igual, no se toca el
 * fichero: la evidencia sigue siendo la misma y su `generado` sigue diciendo
 * cuando cambio por ultima vez, que es la fecha util. Si cambio algo, se escribe
 * entero con marca nueva.
 *
 * No es cosmetico: `generado` respondia «cuando se ejecutaron las pruebas» y
 * ahora responde «desde cuando el resultado es este», que es la pregunta que se
 * hace de verdad al leer una evidencia.
 *
 * ── LO QUE ESTO NO ARREGLA, NI DEBE ─────────────────────────────────────────
 *
 * `docs/evidence/inferencia_local.json` tambien reescribe en cada pasada, pero
 * ahi lo que cambia es `milisegundos`: cuanto tardo una llamada REAL a un modelo
 * local. Eso no es ruido, es la medicion. Igualarla para no ensuciar el arbol
 * seria falsear una evidencia, asi que ese fichero se queda como esta y su
 * variacion se declara en el informe.
 */
import fs from "node:fs";

/** La clave que lleva la marca de tiempo en los informes de evidencia. */
const MARCA = "generado";

function sinMarca(objeto: Record<string, unknown>): string {
  const copia: Record<string, unknown> = { ...objeto };
  delete copia[MARCA];
  return JSON.stringify(copia);
}

/**
 * Escribe el informe solo si su contenido —sin la marca de tiempo— difiere del
 * que ya hay en disco.
 *
 * @returns `true` si se escribio; `false` si la medicion era identica.
 */
export function escribirEvidencia(ruta: string, informe: Record<string, unknown>): boolean {
  let previo: Record<string, unknown> | null = null;
  try {
    previo = JSON.parse(fs.readFileSync(ruta, "utf8")) as Record<string, unknown>;
  } catch {
    // No existe, o no es JSON legible. En ambos casos hay que escribirlo.
    previo = null;
  }

  if (previo && sinMarca(previo) === sinMarca(informe)) return false;

  fs.writeFileSync(ruta, `${JSON.stringify(informe, null, 2)}\n`, "utf8");
  return true;
}
