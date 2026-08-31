/**
 * UN CORREO EN ALEMÁN NO LLEVA EL BOTÓN EN ESPAÑOL.
 *
 * QUÉ MIDE, Y POR QUÉ NO BASTA CON LO ANTERIOR. La prueba de
 * `resolveEmailLocale` comprueba que se ELIGE el catálogo correcto. No dice
 * nada de si el catálogo está bien: un `de` cuyo asunto esté en alemán y cuyo
 * botón se quedó en español pasaría esa prueba tan tranquilo.
 *
 * Y es un defecto que no se ve hasta que lo ve un cliente. Nadie lee los
 * catorce catálogos en seis idiomas buscando una cadena que se quedó sin
 * traducir.
 *
 * CÓMO SE MIDE SIN UN TRADUCTOR. Con `detectLanguageFromText`, el mismo
 * detector que se corrigió en esta sesión —del 57 % al 100 % sobre un corpus de
 * 36 frases—. Se le pasa cada texto del catálogo y se comprueba que coincide
 * con el idioma que ese catálogo dice ser.
 *
 * LO QUE NO PUEDE HACER, y se dice: el detector necesita texto suficiente. Un
 * CTA de dos palabras —«Ir al panel»— no da señal para decidir, y forzarlo
 * daría falsos positivos a montones. Así que sólo se juzgan los textos con
 * suficiente materia, y los cortos se cuentan aparte para que el denominador
 * sea honesto.
 *
 * COSTE EXTERNO: 0 €. No se envía ningún correo.
 */
import { describe, expect, it } from "vitest";

import {
  getCancellationCopy,
  getEmailVerifyCopy,
  getInvoiceCopy,
  getJobCompletedCopy,
  getOnboardingCompleteCopy,
  getPasswordResetCopy,
  getPaymentFailedCopy,
  getPlanActivatedCopy,
  getWelcomeCopy,
  type EmailLocale,
} from "../localeCopy";
import { detectLanguageFromText } from "../../os-agents/agentLanguage";

const IDIOMAS: readonly EmailLocale[] = ["es", "en", "fr", "de", "it", "pt"];

/** Los catálogos que se auditan, cada uno con su función de acceso. */
const CATALOGOS: ReadonlyArray<[string, (l: string) => Record<string, unknown>]> = [
  ["welcome", getWelcomeCopy as never],
  ["passwordReset", getPasswordResetCopy as never],
  ["invoice", getInvoiceCopy as never],
  ["jobCompleted", getJobCompletedCopy as never],
  ["onboardingComplete", getOnboardingCompleteCopy as never],
  ["paymentFailed", getPaymentFailedCopy as never],
  ["cancellation", getCancellationCopy as never],
  ["emailVerify", getEmailVerifyCopy as never],
  ["planActivated", getPlanActivatedCopy as never],
];

/**
 * Los textos legibles de un catálogo.
 *
 * Se descartan las funciones —muchas copias son `(name) => string` y llamarlas
 * con datos inventados metería palabras que no son del catálogo— y se
 * descartan las cadenas cortas, que no dan señal suficiente al detector.
 */
function textosDe(copia: Record<string, unknown>): string[] {
  return Object.values(copia)
    .filter((v): v is string => typeof v === "string")
    .map((s) => s.replace(/<[^>]+>/g, " ").trim())
    .filter((s) => s.split(/\s+/).length >= 6);
}

describe("cada catálogo habla un solo idioma", () => {
  it("hay catálogos y textos que juzgar: el denominador no es cero", () => {
    // Sin esto, «0 textos en otro idioma» podría significar «0 textos
    // examinados», que es el aprobado falso de siempre.
    let textos = 0;
    for (const [, get] of CATALOGOS) for (const l of IDIOMAS) textos += textosDe(get(l)).length;
    expect(CATALOGOS.length).toBeGreaterThanOrEqual(9);
    expect(textos).toBeGreaterThan(50);
  });

  it("LA REGLA: el texto de cada catálogo está en el idioma que dice ser", () => {
    /**
     * El umbral es del 80 %, no del 100 %, y a propósito. El detector es una
     * heurística sobre palabras funcionales: un texto corto o muy técnico
     * —«NELVYON OS», nombres de plan, cifras— no da señal, y exigir el máximo
     * convertiría esta prueba en una fuente de falsos positivos que acabaría
     * desactivada.
     *
     * Lo que sí detecta es lo que importa: una cadena entera que se quedó sin
     * traducir.
     */
    const fallos: string[] = [];
    let juzgados = 0;

    for (const [nombre, get] of CATALOGOS) {
      for (const idioma of IDIOMAS) {
        for (const texto of textosDe(get(idioma))) {
          juzgados += 1;
          const detectado = detectLanguageFromText(texto, idioma);
          if (detectado !== idioma) {
            fallos.push(`${nombre}[${idioma}] detectado como ${detectado}: «${texto.slice(0, 70)}»`);
          }
        }
      }
    }

    const acierto = (juzgados - fallos.length) / juzgados;
    expect(
      acierto,
      `${fallos.length} de ${juzgados} textos parecen estar en otro idioma:\n  ${fallos.slice(0, 12).join("\n  ")}`,
    ).toBeGreaterThanOrEqual(0.8);
  });

  it("EL CONTROL: una cadena sin traducir SÍ se detectaría", () => {
    /**
     * Sin esto, la prueba de arriba podría estar pasando porque el detector no
     * distingue nada. Se le da un texto español declarado como alemán: tiene
     * que verlo.
     */
    const sinTraducir = "Gracias por confiar en nosotros, tu cuenta ya esta lista para empezar";
    expect(detectLanguageFromText(sinTraducir, "de")).toBe("es");
  });

  it("ningún catálogo tiene un texto vacío en ningún idioma", () => {
    // Un asunto en blanco se envía igual, y llega como un correo sin asunto.
    const vacios: string[] = [];
    for (const [nombre, get] of CATALOGOS) {
      for (const idioma of IDIOMAS) {
        for (const [clave, valor] of Object.entries(get(idioma))) {
          if (typeof valor === "string" && valor.trim() === "") {
            vacios.push(`${nombre}[${idioma}].${clave}`);
          }
        }
      }
    }
    expect(vacios, `textos vacios: ${vacios.join(", ")}`).toEqual([]);
  });

  it("los seis idiomas tienen las mismas claves: ninguno está a medias", () => {
    /**
     * Una clave que falta en un idioma es un `undefined` en la plantilla, y eso
     * llega al cliente como «undefined» impreso en el correo. Comparar las
     * claves lo detecta sin necesidad de leer los textos.
     */
    for (const [nombre, get] of CATALOGOS) {
      const referencia = Object.keys(get("es")).sort();
      for (const idioma of IDIOMAS) {
        expect(Object.keys(get(idioma)).sort(), `${nombre}[${idioma}] no tiene las mismas claves que es`).toEqual(
          referencia,
        );
      }
    }
  });
});
