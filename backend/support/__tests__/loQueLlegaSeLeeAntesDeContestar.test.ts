/**
 * El triaje decide bien lo que importa, y ante la duda no contesta solo.
 *
 * ── LO QUE SE PROTEGE ───────────────────────────────────────────────────────
 *
 * Sin triaje, o clasifica una persona uno por uno, o el agente contesta todo por
 * igual: incluida una cancelacion, una reclamacion legal o un aviso de que han
 * entrado en la cuenta de alguien.
 *
 * Lo que mas importa aqui NO es acertar la categoria: es que las cuatro
 * decisiones sean independientes y que la de «puede contestar un agente» falle
 * cerrada.
 *
 * COSTE EXTERNO: 0 EUR. Analisis de texto, sin modelo.
 */
import { describe, expect, it } from "vitest";

import {
  triarTicket,
  unAgentePuedeContestarlo,
  type CategoriaDeTicket,
} from "../triajeDeTicket";

const categoriaDe = (t: string): CategoriaDeTicket => triarTicket(t).categoria;

describe("lee de que va", () => {
  it("reconoce las categorias que no admiten equivocacion", () => {
    expect(categoriaDe("Creo que me han hackeado la cuenta")).toBe("seguridad");
    expect(categoriaDe("Quiero ejercer mi derecho al olvido segun el RGPD")).toBe(
      "legal_privacidad",
    );
    expect(categoriaDe("Quiero darme de baja del plan")).toBe("cancelacion");
    expect(categoriaDe("Me habeis cobrado dos veces la factura")).toBe("facturacion");
  });

  it("reconoce las que un agente puede coger", () => {
    expect(categoriaDe("La aplicacion no carga, da error 500")).toBe("incidencia_tecnica");
    expect(categoriaDe("Como se exporta un informe?")).toBe("como_se_hace");
    expect(categoriaDe("Cual es el precio del plan avanzado?")).toBe("comercial");
  });

  it("lo que no reconoce queda INDETERMINADO, no colocado a la fuerza", () => {
    // Inventarle una categoria a lo que no se entiende es peor que decir que no
    // se entiende: lo manda a una cola donde nadie lo espera.
    expect(categoriaDe("Buenos dias")).toBe("indeterminado");
    expect(categoriaDe("")).toBe("indeterminado");
    expect(categoriaDe(null)).toBe("indeterminado");
  });
});

describe("el orden de las reglas resuelve los mensajes mezclados", () => {
  it("seguridad gana a facturacion y a cancelacion", () => {
    // Un mensaje real mezcla cosas. Si ganara la regla de facturacion, un aviso
    // de intrusion acabaria en una cola de cobros.
    const t = triarTicket(
      "Me han entrado en la cuenta, quiero cancelar la suscripcion y que me devolvais el dinero",
    );
    expect(t.categoria).toBe("seguridad");
    expect(t.urgencia).toBe("critica");
    expect(t.equipo).toBe("seguridad");
  });

  it("legal gana a facturacion", () => {
    const t = triarTicket("Reclamacion formal: quiero la devolucion del cargo, hablo con mi abogado");
    expect(t.categoria).toBe("legal_privacidad");
  });

  it("cancelacion gana a una consulta de precio", () => {
    expect(categoriaDe("Con este precio quiero darme de baja")).toBe("cancelacion");
  });
});

describe("las cuatro decisiones son independientes", () => {
  it("urgente NO implica que tenga que verlo un humano", () => {
    // Es la distincion que se pierde si todo va en un solo campo: una caida es
    // urgente y la puede coger un agente.
    const t = triarTicket("Todo esta caido, no funciona nada");
    expect(t.urgencia).toBe("alta");
    expect(t.requiereHumano).toBe(false);
    expect(unAgentePuedeContestarlo(t)).toBe(true);
  });

  it("necesitar humano NO implica ser urgente", () => {
    const t = triarTicket("Consulta sobre el tratamiento de datos personales segun GDPR");
    expect(t.requiereHumano).toBe(true);
    expect(t.urgencia).not.toBe("critica");
  });

  it("cada categoria va a SU equipo, no todas a soporte", () => {
    const equipos = [
      "Me han hackeado",
      "Tema RGPD",
      "Quiero darme de baja",
      "Problema con la factura",
      "Da error al entrar",
      "Cuanto cuesta el plan?",
    ].map((t) => triarTicket(t).equipo);
    expect(new Set(equipos).size, "todo acaba en el mismo equipo").toBeGreaterThan(4);
  });
});

describe("falla cerrado", () => {
  it("NADA que necesite humano puede auto-responderse", () => {
    // La regla que de verdad protege: si las dos banderas se contradijeran, un
    // agente contestaria una cancelacion o un asunto legal.
    for (const texto of [
      "Me han hackeado la cuenta",
      "Quiero darme de baja",
      "Me habeis cobrado de mas",
      "Quiero ejercer el derecho al olvido",
      "Buenos dias",
      "",
    ]) {
      const t = triarTicket(texto);
      expect(
        unAgentePuedeContestarlo(t),
        `un agente contestaria solo: «${texto}»`,
      ).toBe(false);
    }
  });

  it("EL CONTROL: algo SI puede contestarlo un agente", () => {
    // Sin este control, un triaje que lo mandara todo a un humano pasaria la
    // prueba de arriba y dejaria el soporte automatico sin usar.
    expect(unAgentePuedeContestarlo(triarTicket("Como se exporta un informe?"))).toBe(true);
  });
});
