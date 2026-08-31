/**
 * UN CLIENTE ALEMÁN NO RECIBE SU AVISO DE IMPAGO EN ESPAÑOL.
 *
 * CÓMO SE ENCONTRÓ. Justo después de conectar el idioma del cliente hasta los
 * agentes. El trabajo ya salía en alemán; los correos seguían en español.
 *
 * `resolveEmailLocale` comparaba por igualdad EXACTA:
 *
 *     if (locale === "en" || locale === "fr" || …) return locale;
 *     return "es";
 *
 * Así que `"de-DE"`, `"DE"`, `"pt-BR"` y `"de "` caían todos a español. Y no
 * son formas raras: son la forma NORMAL de un locale. `localeDeCliente()` —de
 * donde sale el locale de un cliente— produce exactamente `de-DE`, `pt-BR` y
 * `en-GB`.
 *
 * QUÉ SE ENVIABA MAL. Los catorce catálogos de este fichero más el ciclo de
 * facturación entero: bienvenida, recuperación de contraseña, factura,
 * verificación de correo, plan activado, **impago**, **segundo aviso**,
 * **advertencia final**, **suspensión**, cancelación y offboarding.
 *
 * Un aviso de suspensión por impago en un idioma que el cliente no lee no es un
 * matiz de calidad: es la comunicación que decide si paga o se va.
 *
 * Y ESTE FICHERO —1.082 líneas, catorce catálogos, seis idiomas— NO TENÍA
 * NINGUNA PRUEBA.
 *
 * NO SE ENVÍA NINGÚN CORREO. Se comprueba qué copia se elige, nada más.
 *
 * COSTE EXTERNO: 0 €.
 */
import { describe, expect, it } from "vitest";

import {
  getCancellationCopy,
  getInvoiceCopy,
  getPasswordResetCopy,
  getPaymentFailedCopy,
  getWelcomeCopy,
  resolveEmailLocale,
  type EmailLocale,
} from "../localeCopy";
import { getBillingLifecycleCopy } from "../../billing/billingLifecycleLocale";

/** Los seis que el fichero declara tener traducidos. */
const SOPORTADOS: readonly EmailLocale[] = ["es", "en", "fr", "de", "it", "pt"];

describe("un locale con región resuelve a su idioma", () => {
  it("LA REGLA: `de-DE` es alemán, no español", () => {
    // El caso exacto. `localeDeCliente("de", "DE")` devuelve `de-DE`.
    expect(resolveEmailLocale("de-DE")).toBe("de");
  });

  it("y el resto de combinaciones que produce el sistema", () => {
    expect(resolveEmailLocale("pt-BR")).toBe("pt");
    expect(resolveEmailLocale("en-GB")).toBe("en");
    expect(resolveEmailLocale("fr-FR")).toBe("fr");
    expect(resolveEmailLocale("it-IT")).toBe("it");
    expect(resolveEmailLocale("es-ES")).toBe("es");
  });

  it("da igual cómo esté escrito: mayúsculas, guion bajo, espacios", () => {
    for (const forma of ["DE", "De", "de_DE", "DE_de", " de ", "  de-DE  "]) {
      expect(resolveEmailLocale(forma), `«${forma}»`).toBe("de");
    }
  });

  it("un idioma a secas sigue funcionando", () => {
    // Lo que ya funcionaba tiene que seguir funcionando: es la mitad que
    // impide que el arreglo rompa lo que iba bien.
    for (const l of SOPORTADOS) expect(resolveEmailLocale(l)).toBe(l);
  });
});

describe("lo que no tenemos traducido cae a español", () => {
  it("EL CONTROL: un idioma sin catálogo no se cuela", () => {
    // Devolver un catálogo que no existe sería peor que caer al de por
    // defecto: reventaría al acceder a la copia.
    for (const desconocido of ["zz", "ja", "ja-JP", "klingon", "x"]) {
      expect(resolveEmailLocale(desconocido), desconocido).toBe("es");
    }
  });

  it("sin locale, o con basura, también", () => {
    expect(resolveEmailLocale(undefined)).toBe("es");
    expect(resolveEmailLocale(null)).toBe("es");
    expect(resolveEmailLocale("")).toBe("es");
    expect(resolveEmailLocale("   ")).toBe("es");
    expect(resolveEmailLocale(42 as unknown as string)).toBe("es");
  });
});

describe("la copia que se elige es de verdad la del idioma", () => {
  /**
   * Resolver el código no basta: hay que comprobar que el CATÁLOGO elegido
   * cambia. Un `resolveEmailLocale` perfecto con catorce catálogos que
   * devolvieran siempre lo mismo daría igual.
   */
  it("LA REGLA: `de-DE` y `es` dan textos distintos, no el mismo", () => {
    expect(getWelcomeCopy("de-DE").cta).not.toBe(getWelcomeCopy("es").cta);
    expect(getPasswordResetCopy("de-DE").subject).not.toBe(getPasswordResetCopy("es").subject);
    expect(getPaymentFailedCopy("de-DE").subject).not.toBe(getPaymentFailedCopy("es").subject);
  });

  it("y `de-DE` da exactamente lo mismo que `de`", () => {
    // Es la comprobación que demuestra que la región no cambia el contenido,
    // sólo se ignora para elegir el idioma.
    expect(getWelcomeCopy("de-DE")).toEqual(getWelcomeCopy("de"));
    expect(getInvoiceCopy("pt-BR")).toEqual(getInvoiceCopy("pt"));
    expect(getCancellationCopy("en-GB")).toEqual(getCancellationCopy("en"));
  });

  it("los seis idiomas tienen catálogo propio y ninguno está vacío", () => {
    // Un catálogo a medias haría que un idioma «soportado» enviara asuntos en
    // blanco, que es peor que enviarlo en español.
    for (const l of SOPORTADOS) {
      const w = getWelcomeCopy(l);
      expect(String(w.cta ?? "").trim(), `welcome.cta vacío en ${l}`).not.toBe("");
      expect(String(w.sesSubject ?? "").trim(), `welcome.sesSubject vacío en ${l}`).not.toBe("");
    }
  });
});

describe("el ciclo de facturación viaja por el mismo camino", () => {
  /**
   * `billingLifecycleLocale` importa `resolveEmailLocale` de aquí. Si aquél
   * dejara de usarlo y volviera a comparar por igualdad, los correos de dinero
   * —impago, segundo aviso, advertencia final, suspensión— volverían a salir en
   * español para todo el mundo.
   */
  it("LA REGLA: el impago le llega en alemán a un cliente `de-DE`", () => {
    const aleman = getBillingLifecycleCopy("de-DE");
    const espanol = getBillingLifecycleCopy("es");
    expect(aleman.paymentFailed.subject).not.toBe(espanol.paymentFailed.subject);
    expect(aleman).toEqual(getBillingLifecycleCopy("de"));
  });

  it("y la suspensión también", () => {
    const aleman = getBillingLifecycleCopy("de-DE");
    const espanol = getBillingLifecycleCopy("es");
    expect(aleman.suspension.subject).not.toBe(espanol.suspension.subject);
  });

  it("EL CONTROL: un idioma sin traducir sigue cayendo a español", () => {
    expect(getBillingLifecycleCopy("ja-JP")).toEqual(getBillingLifecycleCopy("es"));
  });
});
