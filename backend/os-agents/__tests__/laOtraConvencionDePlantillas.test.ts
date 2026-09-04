/**
 * LA SEGUNDA CONVENCIÓN DE PLANTILLAS: `{{CLAVE}}`.
 *
 * EN ESTE REPOSITORIO CONVIVEN DOS FORMAS de componer una instrucción:
 *
 *     {loQueSea}      `fillPromptTemplate`, biblioteca élite
 *     {{LO_QUE_SEA}}  `buildPrompt`, plantillas del lote 2
 *
 * La primera ya tiene pruebas —y tenía dos defectos reales: alcanzaba las
 * propiedades de `Object.prototype` y dejaba viajar huecos sin avisar—. Ésta
 * era el módulo de backend con más dependientes y ninguna prueba propia: 23
 * importadores.
 *
 * LO QUE HACE DISTINTO A `buildPrompt`, y es una decisión deliberada que
 * conviene fijar: el contexto del cliente **no se interpola en ningún hueco,
 * se ANTEPONE**. La razón está escrita en su propio comentario: son
 * veinticuatro plantillas, y confiar en que las veinticuatro se acuerden de
 * colocar una variable es exactamente cómo se perdió el 60 % de lo que
 * distingue a un cliente —restricciones legales incluidas—. La cobertura
 * medida entonces era 0,40.
 *
 * Una plantilla que se olvide de `{{CONTEXTO}}` sigue recibiéndolo. Eso no es
 * un detalle de estilo: es la diferencia entre que el mecanismo garantice algo
 * y que dependa de que nadie se despiste.
 *
 * COSTE EXTERNO: 0 €. Sólo cadenas.
 */
import { describe, expect, it } from "vitest";

import { buildPrompt, eliteLote2CommonVars } from "../agents/lote2PromptUtils";
import { CLAVE_CEREBRO, CLAVE_CONTEXTO } from "../agents/elitePayloadStrings";

describe("rellenar la plantilla", () => {
  it("sustituye cada hueco por su valor", () => {
    expect(buildPrompt("CLIENTE: {{CLIENT_NAME}} SECTOR: {{INDUSTRY}}", {
      CLIENT_NAME: "Acme",
      INDUSTRY: "salud",
    })).toBe("CLIENTE: Acme SECTOR: salud");
  });

  it("un hueco repetido se rellena todas las veces", () => {
    expect(buildPrompt("{{X}} y otra vez {{X}}", { X: "uno" })).toBe("uno y otra vez uno");
  });

  it("un hueco sin variable se queda A LA VISTA", () => {
    // Borrarlo dejaría «CLIENTE: » y el fallo sería invisible también al leer.
    // Dejarlo puesto es lo que permite que `ningunPromptSaleConHuecos` lo
    // detecte midiendo el texto que sale hacia el modelo.
    expect(buildPrompt("CLIENTE: {{FALTA}}", {})).toBe("CLIENTE: {{FALTA}}");
  });

  it("EL CONTROL: una plantilla sin huecos sale igual que entró", () => {
    // Una función que «rellena» destrozando el texto pasaría las de arriba.
    const t = "Eres el mejor especialista del mundo. Responde con secciones.";
    expect(buildPrompt(t, { X: "algo" })).toBe(t);
  });
});

describe("el contexto del cliente se antepone, no se interpola", () => {
  it("LA REGLA: llega aunque la plantilla no lo pida", () => {
    // Es la garantía por construcción. Veinticuatro plantillas no pueden
    // depender de acordarse de una variable.
    const salida = buildPrompt("Escribe un plan.", {
      [CLAVE_CONTEXTO]: "### CONTEXTO REAL DEL CLIENTE\n- Objetivo: vender más",
    });
    expect(salida).toContain("CONTEXTO REAL DEL CLIENTE");
    expect(salida).toContain("Escribe un plan.");
    expect(salida.indexOf("CONTEXTO")).toBeLessThan(salida.indexOf("Escribe un plan."));
  });

  it("y NO se cuela como si fuera un hueco más", () => {
    // Si se interpolara, una plantilla que escribiera `{{__contextoDelCliente}}`
    // lo pondría en medio y el resto lo perdería.
    const salida = buildPrompt(`Antes {{${CLAVE_CONTEXTO}}} despues`, {
      [CLAVE_CONTEXTO]: "EL CONTEXTO",
    });
    expect(salida).toContain(`{{${CLAVE_CONTEXTO}}}`);
    expect(salida.startsWith("EL CONTEXTO")).toBe(true);
  });

  it("EL CONTROL: sin contexto no se antepone nada ni se abren huecos", () => {
    // Un bloque vacío arriba ocuparía sitio en la instrucción y no diría nada.
    expect(buildPrompt("Escribe un plan.", {})).toBe("Escribe un plan.");
    expect(buildPrompt("Escribe un plan.", { [CLAVE_CONTEXTO]: "   " })).toBe("Escribe un plan.");
  });
});

describe("el mapa de variables del lote 2 reenvía el contexto", () => {
  it("LA REGLA: la clave del contexto sobrevive al cambio de nombres", () => {
    /**
     * ESTE FUE UN DEFECTO REAL. `eliteLote2CommonVars` reconstruye el mapa con
     * los nombres en mayúsculas —`CLIENT_NAME`, `INDUSTRY`…— y al hacerlo
     * descartaba el contexto del cliente. Doce familias de prompts pasan por
     * aquí: era el único sitio por el que el presupuesto y las restricciones
     * legales dejaban de llegar a doce servicios A LA VEZ.
     */
    const v = eliteLote2CommonVars({ mainGoal: "llenar la sala de martes a jueves" });
    expect(v[CLAVE_CONTEXTO]).toContain("martes a jueves");
  });

  it("y los nombres en mayúsculas llevan los valores del brief", () => {
    const v = eliteLote2CommonVars({ clientName: "Acme", industry: "salud dental" });
    expect(v.CLIENT_NAME).toBe("Acme");
    expect(v.INDUSTRY).toBe("salud dental");
  });

  it("EL CONTROL: ninguna variable INTERPOLADA sale vacía", () => {
    // Un `{{INDUSTRY}}` sustituido por «» le afirma al modelo que el sector
    // existe y está en blanco, que es peor que no decir nada.
    //
    // Las claves que empiezan por `__` son otra cosa: no se interpolan en
    // ningún hueco, se PREPONEN. Vacías significan «no prepongas nada», que es
    // lo correcto cuando no hay contexto del encargo ni cerebro del cliente.
    // Se excluye la CONVENCIÓN y no cada clave, para que la tercera no vuelva a
    // tropezar con esta prueba.
    const v = eliteLote2CommonVars({});
    for (const [k, valor] of Object.entries(v)) {
      if (k.startsWith("__")) continue;
      expect(String(valor).trim(), `${k} sale vacía`).not.toBe("");
    }
  });

  it("y la convención se cumple: lo que empieza por `__` NO se interpola", () => {
    // Es lo que sostiene la exclusión de arriba. Si una clave `__` acabara
    // sustituyéndose en un hueco, vaciarla dejaría el hueco en blanco y la
    // prueba anterior habría dejado de proteger.
    const salida = buildPrompt("cuerpo {{__contextoDelCliente}} {{__contextoDeNegocio}}", {
      [CLAVE_CONTEXTO]: "CONTEXTO",
      [CLAVE_CEREBRO]: "CEREBRO",
    });
    expect(salida, "una clave prepuesta se interpoló en un hueco").toContain(
      "{{__contextoDelCliente}}",
    );
    // Y se prepone: el cerebro después del encargo, la plantilla al final.
    expect(salida.indexOf("CONTEXTO")).toBeLessThan(salida.indexOf("CEREBRO"));
    expect(salida.indexOf("CEREBRO")).toBeLessThan(salida.indexOf("cuerpo"));
  });
});
