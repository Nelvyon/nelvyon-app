/**
 * Cada red recibe criterio propio, y no el del vecino.
 *
 * ── QUE SE PROTEGE ──────────────────────────────────────────────────────────
 *
 * El agente social tenia seis pasos horizontales y, en 129 lineas de
 * instrucciones, mencionaba una plataforma concreta DOS veces. Un plan asi sale
 * igual para Instagram que para LinkedIn.
 *
 * Lo que se comprueba aqui no es que exista un fichero con seis entradas —eso
 * seria contar— sino que las entradas DICEN COSAS DISTINTAS y que el criterio
 * LLEGA al prompt. Un contrato perfecto que no viaja con el encargo no cambia
 * ni una pieza de contenido.
 *
 * COSTE EXTERNO: 0 EUR. No se llama a ningun modelo.
 */
import { describe, expect, it } from "vitest";

import {
  CONTRATO_POR_PLATAFORMA,
  PLATAFORMAS,
  contratoNativoComoTexto,
  type Plataforma,
} from "../nativoPorPlataforma";
import { eliteSocialIntakeStrings } from "../../os-agents/agents/elitePayloadStrings";
import { promptSocialContentStrategy } from "../../os-agents/agents/socialMediaPremiumPrompts";

const encargo = (platforms?: unknown) =>
  ({ clientName: "Cliente", platforms }) as never;

describe("el criterio por plataforma es propio de cada una", () => {
  it("EL CONTROL: hay criterio para las seis redes", () => {
    expect(PLATAFORMAS).toHaveLength(6);
    for (const p of PLATAFORMAS) {
      const c = CONTRATO_POR_PLATAFORMA[p];
      expect(c.formatos.length, `${p} sin formatos`).toBeGreaterThan(0);
      expect(c.nunca.length, `${p} sin prohibiciones`).toBeGreaterThan(0);
    }
  });

  it("NINGUNA red comparte gancho con otra", () => {
    // Es la prueba que impide que esto degenere en seis copias del mismo texto
    // con el nombre cambiado, que es exactamente el punto de partida.
    const ganchos = PLATAFORMAS.map((p) => CONTRATO_POR_PLATAFORMA[p].gancho);
    expect(new Set(ganchos).size, "hay ganchos repetidos entre redes").toBe(ganchos.length);
  });

  it("NINGUNA red comparte sus prohibiciones con otra", () => {
    // Lo que NO se hace es lo que de verdad separa una red de otra: es donde
    // vive el copia-pega.
    const vistas = new Map<string, Plataforma>();
    for (const p of PLATAFORMAS) {
      for (const n of CONTRATO_POR_PLATAFORMA[p].nunca) {
        const previa = vistas.get(n);
        expect(previa, `«${n}» aparece en ${p} y en ${previa}`).toBeUndefined();
        vistas.set(n, p);
      }
    }
  });

  it("pedir una red NO trae el criterio de las demas", () => {
    const soloInstagram = contratoNativoComoTexto(["instagram"]);
    expect(soloInstagram).toContain("Instagram");
    expect(soloInstagram, "se colo criterio de LinkedIn").not.toContain("LinkedIn");
    expect(soloInstagram, "se colo criterio de TikTok").not.toContain("TikTok");
  });

  it("sin redes declaradas se da el criterio de todas, no el de ninguna", () => {
    const texto = contratoNativoComoTexto([...PLATAFORMAS]);
    for (const p of PLATAFORMAS) {
      expect(texto).toContain(CONTRATO_POR_PLATAFORMA[p].nombre);
    }
  });
});

describe("el criterio LLEGA al encargo del agente", () => {
  it("el intake social lo incluye", () => {
    const vars = eliteSocialIntakeStrings(encargo(["Instagram", "LinkedIn"]));
    expect(vars.contratoNativo, "el intake no trae el contrato").toBeTruthy();
    expect(vars.contratoNativo).toContain("Instagram");
    expect(vars.contratoNativo).toContain("LinkedIn");
    expect(vars.contratoNativo, "trajo una red que el cliente no usa").not.toContain("TikTok");
  });

  it("y el prompt de estrategia lo lleva dentro, sin hueco sin rellenar", () => {
    // Lo que de verdad importa: un contrato que no viaja con el encargo no
    // cambia ni una pieza. Y un `{{hueco}}` sin sustituir es peor que nada.
    const prompt = promptSocialContentStrategy("auditoria previa", encargo(["TikTok"]));
    expect(prompt).toContain("CADA RED RECIBE CONTENIDO NATIVO");
    expect(prompt).toContain("TikTok");
    expect(prompt, "quedo un hueco sin rellenar").not.toContain("{{contratoNativo}}");
  });

  it("`twitter` y `meta` se entienden como X y Facebook", () => {
    // Los clientes escriben el nombre que usan, no el del contrato.
    const vars = eliteSocialIntakeStrings(encargo(["twitter", "meta"]));
    expect(vars.contratoNativo).toContain("### X");
    expect(vars.contratoNativo).toContain("Facebook");
  });
});
