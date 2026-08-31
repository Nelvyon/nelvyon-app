/**
 * UNA PLANTILLA CON HUECOS NO SE VA AL MODELO EN SILENCIO.
 *
 * CÓMO SE ENCONTRÓ. `elitePromptLibrary.ts` salió el segundo en la lista de
 * módulos de los que depende mucha gente y que no prueba nadie: **168
 * importadores y cero pruebas**. Es donde se construye la instrucción que se le
 * manda al modelo.
 *
 * DOS DEFECTOS, LOS DOS COMPROBADOS SOBRE EL CÓDIGO ANTERIOR:
 *
 *   1. `vars[key] ?? "{key}"` alcanzaba las propiedades heredadas de
 *      `Object.prototype`. Como no son nulas, el `??` no saltaba y
 *      `{constructor}` metía «function Object() { [native code] }» en el
 *      prompt.
 *
 *   2. UN HUECO SIN RELLENAR VIAJABA AL MODELO TAL CUAL. Una plantilla con
 *      `{clientDomain}` sin valor le llegaba al modelo con las llaves puestas y
 *      nada, en ningún sitio, decía que el dato del cliente no había llegado.
 *
 * POR QUÉ EL SEGUNDO IMPORTA TANTO. Este sistema se juzga por no ser genérico.
 * La forma exacta de producir un entregable genérico es que los datos que
 * distinguen a este cliente de los demás no lleguen a la instrucción. Eso
 * ocurría sin ruido, y lo que no hace ruido no se arregla.
 *
 * LO QUE ESTAS PRUEBAS NO PERMITEN CAMBIAR: que la función lance. Ciento
 * sesenta y ocho sitios dependen de que no lo haga; un prompt a medias es peor
 * que uno completo pero mejor que ninguno.
 *
 * COSTE EXTERNO: 0 €. Sólo cadenas.
 */
import { describe, expect, it } from "vitest";

import {
  fillPromptTemplate,
  observarHuecosSinRellenar,
  variablesDeLaPlantilla,
  variablesQueFaltan,
  SEO_AUDIT_ELITE_PROMPT,
  type HuecosSinRellenar,
} from "../prompts/elitePromptLibrary";

/** Recoge los avisos, para comprobarlos en vez de mirar la consola. */
function conObservador() {
  const vistos: HuecosSinRellenar[] = [];
  const restaurar = observarHuecosSinRellenar((a) => vistos.push(a));
  return { vistos, restaurar };
}

/** Rellena sin que el aviso por defecto ensucie la salida de las pruebas. */
function rellenarCallando(plantilla: string, vars: Record<string, string>): string {
  const restaurar = observarHuecosSinRellenar(() => {});
  try {
    return fillPromptTemplate(plantilla, vars);
  } finally {
    restaurar();
  }
}

describe("rellenar lo que hay", () => {
  it("sustituye cada hueco por su valor", () => {
    expect(fillPromptTemplate("CLIENTE: {a} SECTOR: {b}", { a: "Acme", b: "salud" })).toBe(
      "CLIENTE: Acme SECTOR: salud",
    );
  });

  it("un hueco repetido se rellena todas las veces", () => {
    expect(fillPromptTemplate("{x} y otra vez {x}", { x: "uno" })).toBe("uno y otra vez uno");
  });

  it("EL CONTROL: un texto sin huecos sale igual que entró", () => {
    // Una función que «rellena» destrozando el texto pasaría las de arriba.
    const t = "Eres el mejor auditor SEO del mundo. Analiza y responde.";
    expect(fillPromptTemplate(t, { a: "x" })).toBe(t);
  });
});

describe("las propiedades heredadas ya no se cuelan", () => {
  it("LA REGLA: {constructor} no mete código nativo en el prompt", () => {
    // Era literal: «Cliente: function Object() { [native code] }».
    const salida = rellenarCallando("Cliente: {constructor}", { sector: "salud" });
    expect(salida).not.toContain("native code");
    expect(salida).toBe("Cliente: {constructor}");
  });

  it("y tampoco toString, valueOf ni hasOwnProperty", () => {
    for (const clave of ["toString", "valueOf", "hasOwnProperty", "__proto__"]) {
      const salida = rellenarCallando(`X: {${clave}}`, {});
      expect(salida, `${clave} se cuela`).not.toContain("native code");
    }
  });

  it("pero una clave propia que se llame igual SÍ se usa", () => {
    // No se trata de prohibir nombres: se trata de exigir que el valor sea
    // propio del objeto y no heredado.
    expect(fillPromptTemplate("X: {toString}", { toString: "un valor de verdad" })).toBe(
      "X: un valor de verdad",
    );
  });
});

describe("un hueco sin rellenar deja rastro", () => {
  it("LA REGLA: se avisa de cuáles faltan", () => {
    const { vistos, restaurar } = conObservador();
    try {
      fillPromptTemplate("CLIENTE: {clientDomain}\nSECTOR: {sector}\nMERCADO: {targetMarket}", {
        sector: "salud dental",
      });
    } finally {
      restaurar();
    }
    expect(vistos).toHaveLength(1);
    expect(vistos[0].faltan).toEqual(["clientDomain", "targetMarket"]);
  });

  it("el hueco se queda a la vista en la salida, no se borra", () => {
    // Borrarlo dejaría «CLIENTE: » y el fallo sería invisible también al leer.
    const salida = rellenarCallando("CLIENTE: {clientDomain}", {});
    expect(salida).toBe("CLIENTE: {clientDomain}");
  });

  it("una cadena vacía cuenta como hueco, no como valor", () => {
    // «SECTOR: » no es mejor que «SECTOR: {sector}»: es peor, porque parece
    // que el dato llegó.
    const { vistos, restaurar } = conObservador();
    try {
      fillPromptTemplate("SECTOR: {sector}", { sector: "   " });
    } finally {
      restaurar();
    }
    expect(vistos[0]?.faltan).toEqual(["sector"]);
  });

  it("EL CONTROL: si no falta nada, NO se avisa", () => {
    // Un aviso que salta siempre es ruido, y el ruido se acaba ignorando.
    const { vistos, restaurar } = conObservador();
    try {
      fillPromptTemplate("CLIENTE: {a}", { a: "Acme" });
    } finally {
      restaurar();
    }
    expect(vistos).toEqual([]);
  });

  it("y NO lanza: 168 sitios dependen de que no rompa su encargo", () => {
    const restaurar = observarHuecosSinRellenar(() => {
      throw new Error("hasta el observador falla");
    });
    try {
      expect(() => fillPromptTemplate("X: {falta}", {})).not.toThrow();
    } finally {
      restaurar();
    }
  });
});

describe("saber qué pide una plantilla antes de rellenarla", () => {
  it("los huecos se derivan de la plantilla, no de una lista a mano", () => {
    expect(variablesDeLaPlantilla("a {uno} b {dos} c {uno}")).toEqual(["uno", "dos"]);
  });

  it("sobre una plantilla real de la biblioteca", () => {
    // Si alguien edita el prompt de auditoría SEO y añade un hueco, esto lo ve
    // solo. Una lista escrita a mano no.
    const pide = variablesDeLaPlantilla(SEO_AUDIT_ELITE_PROMPT);
    expect(pide).toContain("clientDomain");
    expect(pide).toContain("sector");
  });

  it("variablesQueFaltan permite comprobar ANTES de llamar al modelo", () => {
    // Es la pieza que deja al motor de calidad rechazar un encargo incompleto
    // en vez de descubrirlo en el entregable.
    expect(variablesQueFaltan(SEO_AUDIT_ELITE_PROMPT, { sector: "salud" })).toContain(
      "clientDomain",
    );
    expect(
      variablesQueFaltan("CLIENTE: {a} SECTOR: {b}", { a: "Acme", b: "salud" }),
    ).toEqual([]);
  });
});
