/**
 * Lo que NELVYON sabe del cliente llega al agente que trabaja para él.
 *
 * ── EL HUECO QUE CIERRA ─────────────────────────────────────────────────────
 *
 * `backend/cerebro` guarda las dimensiones de negocio de cada cliente con
 * procedencia, confianza y caducidad. Lo consumían el perfil de cliente y el
 * ciclo del cliente. NINGÚN agente Premium lo consultaba.
 *
 * El agente recibía `contextoDelCliente(payload)` —lo que el cliente dijo en
 * ESTE encargo— y nada de lo que NELVYON hubiera aprendido antes. Un cliente de
 * seis meses arrancaba cada trabajo como si fuera el primero.
 *
 * ── LO QUE SE EXIGE AQUÍ ────────────────────────────────────────────────────
 *
 * 1. Que dos clientes distintos produzcan contexto distinto. Si no, el puente
 *    no transporta nada y da igual que exista.
 * 2. Que lo que NO se sabe se NOMBRE. Es la regla que más importa: un prompt
 *    que calla sus huecos invita al modelo a rellenarlos, y un competidor
 *    inventado parece un dato.
 * 3. Que la procedencia viaje. No es lo mismo un objetivo que dijo el cliente
 *    que uno que dedujo un agente, y el modelo debe poder tratarlos distinto.
 * 4. Que sin cerebro NO se produzca un bloque vacío. Un bloque vacío se lee
 *    como «no hay restricciones», que es el peor mensaje posible.
 * 5. Que no pasarlo deje la conducta EXACTAMENTE como estaba. Es lo que permite
 *    conectarlo servicio a servicio en vez de a los veintinueve de golpe.
 *
 * COSTE EXTERNO: 0 EUR. No llama a ningún modelo.
 */
import { describe, expect, it } from "vitest";

import { contextoDeNegocio } from "../contextoDeNegocio";
import { buildPrompt, webPremiumIntakeStrings } from "../agents/webPremiumPrompts";
import { CLAVE_CEREBRO } from "../agents/elitePayloadStrings";
import type { Cerebro, ValorDeDimension } from "../../cerebro/CerebroDeNegocioService";
import { dimensionesDeServicio } from "../../cerebro/dimensiones";

function valor(
  dimension: string,
  v: Record<string, unknown>,
  procedencia: ValorDeDimension["procedencia"] = "cliente_intake",
  confianza = 0.9,
): ValorDeDimension {
  return {
    dimension,
    valor: v,
    procedencia,
    origen: "prueba",
    confianza,
    vigenteHasta: null,
    version: 1,
    actualizado: new Date(),
  };
}

function cerebroDe(entradas: Array<[string, ValorDeDimension]>, caducadas: string[] = []): Cerebro {
  return {
    workspaceId: 1,
    clientId: "cli",
    dimensiones: new Map(entradas),
    caducadas,
  };
}

/** Una dimensión que el servicio de web usa de verdad, sea cual sea su id. */
const DIM_WEB = dimensionesDeServicio("web_premium");

describe("el cerebro de negocio llega al agente", () => {
  it("EL DENOMINADOR: el servicio de web declara dimensiones que usa", () => {
    // Sin esto, todo lo de abajo mediría sobre una lista vacía y pasaría solo.
    expect(DIM_WEB.length, "web_premium no declara ninguna dimensión").toBeGreaterThan(0);
  });

  it("dos clientes distintos producen contexto distinto", () => {
    const texto = DIM_WEB.find((d) => d.forma === "texto");
    expect(texto, "no hay ninguna dimensión de texto que comparar").toBeDefined();

    const a = contextoDeNegocio(
      "web_premium",
      cerebroDe([[texto!.id, valor(texto!.id, { texto: "Clínica dental en Bilbao" })]]),
    );
    const b = contextoDeNegocio(
      "web_premium",
      cerebroDe([[texto!.id, valor(texto!.id, { texto: "SaaS B2B de logística" })]]),
    );

    expect(a.bloque).toContain("Clínica dental en Bilbao");
    expect(b.bloque).toContain("SaaS B2B de logística");
    expect(a.bloque, "el contexto no cambia entre clientes: el puente no transporta nada")
      .not.toBe(b.bloque);
  });

  it("LA REGLA: lo que no se sabe se NOMBRA, y se prohíbe inventarlo", () => {
    const vacio = contextoDeNegocio("web_premium", cerebroDe([]));

    expect(vacio.huecos.length, "no declaró ningún hueco con el cerebro vacío")
      .toBe(DIM_WEB.length);
    expect(vacio.bloque).toContain("LO QUE NO SE SABE");
    expect(vacio.bloque.toLowerCase()).toContain("no debes inventar");
    // Y cada hueco aparece por su nombre, no como un total.
    for (const d of DIM_WEB.slice(0, 3)) {
      expect(vacio.bloque, `el hueco ${d.id} no se nombra`).toContain(d.id);
    }
  });

  it("la procedencia viaja con el dato: deducido no es lo mismo que dicho", () => {
    const texto = DIM_WEB.find((d) => d.forma === "texto")!;
    const dicho = contextoDeNegocio(
      "web_premium",
      cerebroDe([[texto.id, valor(texto.id, { texto: "X" }, "cliente_intake")]]),
    );
    const deducido = contextoDeNegocio(
      "web_premium",
      cerebroDe([[texto.id, valor(texto.id, { texto: "X" }, "agente_deducido")]]),
    );

    expect(dicho.bloque).toContain("lo dijo el cliente");
    expect(deducido.bloque).toContain("NO está confirmado por el cliente");
    expect(dicho.bloque).not.toBe(deducido.bloque);
  });

  it("un dato CADUCADO cuenta como hueco, no como conocimiento", () => {
    const texto = DIM_WEB.find((d) => d.forma === "texto")!;
    const c = contextoDeNegocio(
      "web_premium",
      cerebroDe([[texto.id, valor(texto.id, { texto: "dato viejo" })]], [texto.id]),
    );
    expect(c.presentes, "un dato caducado se contó como presente").not.toContain(texto.id);
    expect(c.huecos).toContain(texto.id);
    expect(c.bloque, "un dato caducado llegó al prompt como si fuera fiable")
      .not.toContain("dato viejo");
  });

  it("FALLA CERRADO: sin cerebro dice que no sabe nada, no calla", () => {
    const sin = contextoDeNegocio("web_premium", null);
    expect(sin.bloque.trim().length, "devolvió un bloque vacío").toBeGreaterThan(60);
    expect(sin.bloque).toContain("no hay ninguno registrado");
    expect(sin.bloque).toContain("NO inventes");
    expect(sin.presentes).toEqual([]);
  });

  it("el bloque llega al prompt final, PREPUESTO", () => {
    const texto = DIM_WEB.find((d) => d.forma === "texto")!;
    const vars = webPremiumIntakeStrings(
      { clientName: "Acme" } as never,
      cerebroDe([[texto.id, valor(texto.id, { texto: "Clínica dental en Bilbao" })]]),
    );
    const prompt = buildPrompt("PLANTILLA para {clientName}", vars);

    expect(prompt).toContain("Clínica dental en Bilbao");
    expect(prompt).toContain("PLANTILLA para Acme");
    // La clave no puede quedarse como un hueco sin sustituir en el texto.
    expect(prompt).not.toContain(CLAVE_CEREBRO);
    expect(prompt).not.toContain(`{${CLAVE_CEREBRO}}`);
  });

  it("NO PASARLO deja la conducta exactamente como estaba", () => {
    // Es lo que permite conectarlo servicio a servicio. Si al omitirlo el
    // prompt ya cambiara, conectar el primero cambiaría los veintinueve.
    const antes = buildPrompt("X {clientName}", webPremiumIntakeStrings({ clientName: "Acme" } as never));
    const conNull = buildPrompt(
      "X {clientName}",
      webPremiumIntakeStrings({ clientName: "Acme" } as never, undefined),
    );
    expect(conNull).toBe(antes);
  });

  it("y pasar `null` SÍ cambia: es un cliente sin cerebro, no un servicio sin conectar", () => {
    // La distinción importa. `undefined` = este servicio todavía no usa el
    // cerebro. `null` = este servicio lo usa y este cliente no tiene nada.
    const sinConectar = buildPrompt("X", webPremiumIntakeStrings({} as never));
    const clienteVacio = buildPrompt("X", webPremiumIntakeStrings({} as never, null));
    expect(clienteVacio).not.toBe(sinConectar);
    expect(clienteVacio).toContain("NO inventes");
  });
});
