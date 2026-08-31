/**
 * EL CONTEXTO DEL CLIENTE DICE LO QUE HAY, Y CALLA LO QUE NO.
 *
 * QUÉ ES ESTE BLOQUE. `contextoDelCliente` construye el texto que se ANTEPONE a
 * la instrucción de cada agente del lote 2 —doce familias de prompts— con lo
 * que distingue a este cliente de cualquier otro: su objetivo, su propuesta de
 * valor, dónde opera, su presupuesto, lo que ya intentó y sus límites
 * innegociables.
 *
 * POR QUÉ SE PRUEBA. Tenía 16 importadores y ninguna prueba propia. Y su
 * corrección depende de un detalle de una línea:
 *
 *     if (typeof valor === "string" && valor.trim()) lineas.push(...)
 *
 * Ese `&& valor.trim()` es lo único que impide que una cadena vacía produzca
 * «- Presupuesto mensual disponible: » en la instrucción. Es exactamente el
 * tipo de condición que alguien «simplifica» a `if (typeof valor === "string")`
 * en una limpieza, y entonces el prompt empieza a afirmar cosas vacías.
 *
 * Se comprobó: esa mutación sobrevivía a todas las pruebas del repositorio.
 * Ahora no.
 *
 * POR QUÉ IMPORTA QUE CALLE. Un hueco vacío en un prompt es peor que la
 * ausencia de la línea: la ausencia deja al modelo trabajar con lo que sabe;
 * «- Sector: » le dice que el sector existe y está en blanco, que es una
 * afirmación falsa sobre el cliente.
 *
 * COSTE EXTERNO: 0 €. Sólo cadenas.
 */
import { describe, expect, it } from "vitest";

import { contextoDelCliente, eliteCommonIntakeStrings, CLAVE_CONTEXTO } from "../agents/elitePayloadStrings";

describe("un valor vacío no produce una línea vacía", () => {
  it("LA REGLA: la cadena vacía se calla, no se escribe", () => {
    const texto = contextoDelCliente({
      mainGoal: "   ",
      uniqueValue: "",
      location: "Valencia",
    });
    expect(texto).toContain("Valencia");
    expect(texto, "una etiqueta con nada detrás afirma algo falso").not.toMatch(/:\s*$/m);
    expect(texto).not.toContain("Objetivo del cliente");
    expect(texto).not.toContain("Qué le hace distinto");
  });

  it("un presupuesto de cero SÍ entra: es un dato, no una ausencia", () => {
    /**
     * `0` es falsy. Una comprobación escrita como `if (presupuesto)` lo
     * perdería, y «no tiene presupuesto» cambia el plan por completo: es la
     * diferencia entre proponer campañas de pago o no proponerlas.
     *
     * NOTA HONESTA SOBRE QUÉ CUBRE ESTA PRUEBA: el presupuesto tiene su propia
     * rama en `contextoDelCliente`, así que esto NO ejercita la rama numérica
     * de `decir`. Esa rama es defensiva —todas las llamadas a `decir` pasan
     * cadenas— y se comprobó: mutarla no rompe nada porque no hay forma de
     * llegar a ella desde los sitios que la usan. Se deja escrito en vez de
     * inventar un caso retorcido para matar la mutación: eso sería probar la
     * métrica, no el comportamiento.
     */
    expect(contextoDelCliente({ monthlyBudget: 0 })).toContain("0");
  });

  it("EL CONTROL: sin ningún dato, devuelve vacío en vez de una cabecera hueca", () => {
    // Un «### CONTEXTO REAL DEL CLIENTE» seguido de nada sería peor que nada:
    // ocupa sitio en la instrucción y no dice nada.
    expect(contextoDelCliente({})).toBe("");
  });
});

describe("el idioma y el mercado llegan al contexto", () => {
  it("LA REGLA: si el cliente declaró su idioma, aparece", () => {
    // Es el eslabón que faltaba: el dato entraba en `os_clients.language`, el
    // cerebro lo guardaba, y no salía a ninguna parte.
    const texto = contextoDelCliente({ language: "de", country: "DE" });
    expect(texto).toContain("Idioma");
    expect(texto).toContain("de");
    expect(texto).toContain("Mercado");
  });

  it("acepta también `locale` y `market`, que es como llegan a veces", () => {
    const texto = contextoDelCliente({ locale: "pt", market: "BR" });
    expect(texto).toContain("pt");
    expect(texto).toContain("BR");
  });

  it("EL CONTROL: sin idioma declarado no se inventa ninguno", () => {
    // Poner «Idioma: español» por defecto sería afirmar algo que el cliente no
    // ha dicho, y el agente lo trataría como un hecho.
    expect(contextoDelCliente({ location: "Berlín" })).not.toContain("Idioma");
  });
});

describe("los límites van aparte de los datos", () => {
  it("las restricciones salen en su propio bloque y en mayúsculas", () => {
    // Mezcladas entre las viñetas se leen como una preferencia más. Separadas,
    // son lo que son: cosas que el plan no puede saltarse.
    const texto = contextoDelCliente({
      mainGoal: "vender más",
      constraints: ["no se puede prometer resultados"],
    });
    expect(texto).toContain("LÍMITES INNEGOCIABLES");
    expect(texto).toContain("no se puede prometer resultados");
    expect(texto.indexOf("CONTEXTO REAL")).toBeLessThan(texto.indexOf("LÍMITES"));
  });

  it("con sólo restricciones y ningún dato, el bloque sale igual", () => {
    // Un cliente del que sólo se sabe qué NO puede hacerse sigue mereciendo que
    // eso llegue al agente.
    const texto = contextoDelCliente({ restrictions: ["sector regulado"] });
    expect(texto).toContain("LÍMITES INNEGOCIABLES");
    expect(texto).toContain("sector regulado");
  });
});

describe("los valores del brief nunca llegan vacíos", () => {
  it("un campo ausente se sustituye por un texto con significado", () => {
    // No por «», que dejaría al agente rellenando el hueco a su gusto. El
    // texto por defecto dice explícitamente que falta y qué hacer.
    const v = eliteCommonIntakeStrings({});
    expect(v.clientName).not.toBe("");
    expect(v.industry).toMatch(/definir|confirmar|perfilar|acordar|mapear|recabar/i);
  });

  it("una cadena vacía cuenta como ausente, no como valor", () => {
    const v = eliteCommonIntakeStrings({ industry: "   ", clientName: "" });
    expect(v.industry.trim()).not.toBe("");
    expect(v.clientName.trim()).not.toBe("");
  });

  it("EL CONTROL: un valor de verdad se respeta tal cual", () => {
    // Sin esto, devolver siempre el texto por defecto pasaría las de arriba.
    const v = eliteCommonIntakeStrings({ industry: "salud dental", clientName: "Acme" });
    expect(v.industry).toBe("salud dental");
    expect(v.clientName).toBe("Acme");
  });

  it("el contexto del cliente viaja bajo su propia clave", () => {
    // Reconstruir el mapa de variables sin reenviar esta clave fue un defecto
    // real: doce familias de prompts se quedaron sin el presupuesto y sin las
    // restricciones legales del cliente a la vez.
    const v = eliteCommonIntakeStrings({ mainGoal: "vender más en Lisboa" });
    expect(v[CLAVE_CONTEXTO]).toContain("Lisboa");
  });
});
