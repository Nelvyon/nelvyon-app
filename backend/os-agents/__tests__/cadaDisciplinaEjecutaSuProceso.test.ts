/**
 * Cada disciplina ejecuta SU proceso, no el de otra.
 *
 * ── LO QUE SE ENCONTRÓ ──────────────────────────────────────────────────────
 *
 * `FunnelPremiumAgent` importaba los SEIS prompts de ecommerce enteros. Las
 * descripciones de sus pasos hablaban de embudo —«arquitectura de páginas del
 * funnel»— y la instrucción que llegaba al modelo decía «arquitectura de la
 * tienda».
 *
 * Un servicio de conversión ejecutando el proceso de montar una tienda. Y no es
 * un problema de nombres: una tienda parte del catálogo y llega a la conversión;
 * un embudo parte de la fricción medida y llega a un experimento que la reduzca.
 * Se optimizan al revés.
 *
 * ── POR QUÉ ESTA PRUEBA Y NO UN GREP ────────────────────────────────────────
 *
 * El defecto era invisible desde fuera: el agente tenía seis pasos con nombres
 * correctos, el pipeline funcionaba, las pruebas pasaban. Lo único que estaba
 * mal era QUÉ se le pedía al modelo, y eso sólo se ve leyendo el prompt que sale.
 *
 * Así que esta batería COMPONE el prompt real de cada disciplina y comprueba que
 * habla de lo suyo.
 *
 * COSTE EXTERNO: 0 EUR. No llama a ningún modelo.
 */
import { describe, expect, it } from "vitest";

import {
  promptFunnelArquitectura,
  promptFunnelDecision,
  promptFunnelEvidencia,
  promptFunnelExperimento,
  promptFunnelMedicion,
  promptFunnelOferta,
} from "../agents/funnelPremiumPrompts";

const payload = { clientName: "Acme", industry: "formación online", targetAudience: "opositores" };

describe("cada disciplina ejecuta su proceso", () => {
  // ── EL CICLO DE CRO, PASO A PASO ──────────────────────────────────────────

  it("1 · empieza por la EVIDENCIA, no por una opinión", () => {
    // Es la diferencia entre «el botón debería ser más visible» y «el 68 %
    // abandona en el paso 3».
    const p = promptFunnelEvidencia(payload as never);
    expect(p).toMatch(/evidencia/i);
    expect(p).toMatch(/dondeSePierdeLaGente/);
    // Y distingue lo medido de lo supuesto, que es lo que impide que una
    // corazonada acabe presentada como un dato.
    expect(p).toMatch(/esDatoOEsHipotesis/);
  });

  it("2 · la arquitectura decide cuántos pasos, y no por plantilla", () => {
    const p = promptFunnelArquitectura("evidencia", payload as never);
    expect(p).toMatch(/porQueEsteNumeroDePasos/);
    expect(p).toMatch(/un solo trabajo/i);
  });

  it("3 · la oferta trae HIPÓTESIS falsables, con su porqué", () => {
    // Un cambio que funciona sin saber por qué no se puede repetir en la
    // siguiente página.
    const p = promptFunnelOferta("ev", "arq", payload as never);
    expect(p).toMatch(/hipotesis/);
    expect(p).toMatch(/porque/);
    // Y no se inventa prueba social.
    expect(p).toMatch(/No inventes cifras ni testimonios/);
  });

  it("4 · el experimento fija el criterio ANTES y lleva guardarraíles", () => {
    // Sin criterio previo, el resultado se interpreta después — que es como se
    // declara ganadora cualquier variante. Y sin guardarraíles, un test puede
    // estar hundiendo el negocio mientras gana en la métrica que se mira.
    const p = promptFunnelExperimento("ev", "oferta", payload as never);
    expect(p).toMatch(/criterioDeExito/);
    expect(p).toMatch(/antes de ver un solo dato/i);
    expect(p).toMatch(/metricasDeGuardia/);
    expect(p).toMatch(/UNA variable por experimento/);
  });

  it("5 · la medición se comprueba antes de empezar", () => {
    // Descubrir a mitad que falta un evento invalida el test entero.
    const p = promptFunnelMedicion("exp", payload as never);
    expect(p).toMatch(/instrumentacionQueFalta/);
    expect(p).toMatch(/listoParaEmpezar/);
  });

  it("6 · la política de decisión cubre los cuatro desenlaces, incluido el incómodo", () => {
    // «No hay datos suficientes» NO es «no hay diferencia»: la primera dice que
    // no se sabe, la segunda afirma algo. Confundirlas es como se cierran tests
    // en falso.
    const p = promptFunnelDecision("exp", "med", payload as never);
    for (const caso of [
      "siGanaLaVariante",
      "siGanaElControl",
      "siNoHayDiferencia",
      "siNoHayDatosSuficientes",
      "siSaltaUnGuardarrail",
    ]) {
      expect(p, `la política no cubre ${caso}`).toMatch(new RegExp(caso));
    }
  });

  // ── LO QUE NO PUEDE VOLVER A PASAR ────────────────────────────────────────

  it("LA REGLA: ningún prompt de embudo habla de montar una tienda", () => {
    // El defecto exacto que se corrigió. Un `import` mal puesto lo devolvería
    // sin que nada más se rompiera.
    const todos = [
      promptFunnelEvidencia(payload as never),
      promptFunnelArquitectura("x", payload as never),
      promptFunnelOferta("x", "y", payload as never),
      promptFunnelExperimento("x", "y", payload as never),
      promptFunnelMedicion("x", payload as never),
      promptFunnelDecision("x", "y", payload as never),
    ].join("\n");

    for (const ajeno of ["tienda", "storeArchitecture", "catálogo de productos", "ecommerce"]) {
      expect(todos.toLowerCase(), `el proceso de embudo habla de «${ajeno}»`).not.toContain(
        ajeno.toLowerCase(),
      );
    }
  });

  it("EL CONTROL: y sí habla de lo suyo", () => {
    // Sin esto, un fichero vacío pasaría la prueba anterior sin esfuerzo.
    const todos = [
      promptFunnelEvidencia(payload as never),
      promptFunnelExperimento("x", "y", payload as never),
    ].join("\n");
    expect(todos.toLowerCase()).toContain("embudo");
    expect(todos.toLowerCase()).toContain("experimento");
  });

  it("el agente conserva sus seis llamadas al modelo: la disciplina cambia, el coste no", async () => {
    // Añadir un paso subiría el coste de cada trabajo un 17 %. La mejora no
    // podía pagarse con la factura del cliente.
    const { FunnelPremiumAgent } = await import("../agents/FunnelPremiumAgent");
    const agente = new FunnelPremiumAgent();
    const conModelo = agente.steps.filter((s) => /LLM/.test(s.description));
    expect(conModelo).toHaveLength(6);
    // Y los dos pasos deterministas que generan el HTML siguen ahí.
    expect(agente.steps.length).toBe(8);
  });
});
