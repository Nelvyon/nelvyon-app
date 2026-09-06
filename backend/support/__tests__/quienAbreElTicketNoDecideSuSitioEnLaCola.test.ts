/**
 * Quien abre el ticket no decide solo en qué cola entra.
 *
 * ── LO QUE HABÍA ────────────────────────────────────────────────────────────
 *
 * `createTicket` cogía `priority` del cuerpo de la petición y, si no venía,
 * ponía «normal». O sea, quien escribe elegía su sitio en la cola. Falla en las
 * dos direcciones, y la peligrosa es la de abajo: «me han entrado en la cuenta»
 * enviado sin prioridad se quedaba en «normal», esperando turno detrás de dudas
 * de facturación. Un aviso de seguridad no puede depender de que quien lo manda
 * sepa que es grave.
 *
 * Y el triaje —`triarTicket`, con sus reglas ordenadas para que seguridad gane a
 * facturación— estaba construido y no lo llamaba nadie. Capacidad construida y
 * sin conectar, otra vez.
 *
 * ── LA REGLA QUE SE FIJA AQUÍ ───────────────────────────────────────────────
 *
 * La mayor de las dos: la que pide quien escribe y la que deduce el triaje. Sin
 * BAJAR nunca lo que ha pedido una persona —eso sería que el sistema decidiera
 * que su problema importa menos de lo que dice—, y sin dejar pasar por debajo lo
 * que el triaje ha visto.
 *
 * COSTE EXTERNO: 0 EUR. La base es un doble.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SupportService } from "../SupportService";

/** Una base que devuelve el id del ticket y guarda lo que se le pidió escribir. */
function baseFalsa() {
  const escrituras: Array<{ sql: string; params: unknown[] }> = [];
  return {
    escrituras,
    query: vi.fn(async (sql: string, params: unknown[] = []) => {
      escrituras.push({ sql, params });
      if (/INSERT INTO support_tickets/i.test(sql)) return [{ id: "tick-1" }] as never;
      return [] as never;
    }),
  };
}

/** La prioridad que acabó en la tabla, sacada del INSERT real. */
function prioridadGuardada(base: ReturnType<typeof baseFalsa>): string {
  const insert = base.escrituras.find((e) => /INSERT INTO support_tickets/i.test(e.sql));
  expect(insert, "no se llegó a insertar el ticket").toBeDefined();
  // El orden de la sentencia: user_id, subject, body, category, priority, ...
  return String(insert!.params[4]);
}

function servicio(base: ReturnType<typeof baseFalsa>) {
  return new SupportService(base as never);
}

beforeEach(() => {
  SupportService.reset();
});

describe("lo que el triaje ve pesa aunque nadie lo declare", () => {
  it("un aviso de seguridad sin prioridad NO se queda en normal", async () => {
    // El caso que motivó todo esto.
    const base = baseFalsa();
    await servicio(base).createTicket("u1", {
      subject: "Ayuda urgente",
      body: "Creo que me han hackeado la cuenta, hay accesos que no reconozco.",
      category: "technical",
    });
    expect(
      prioridadGuardada(base),
      "un incidente de seguridad entró en la cola general",
    ).toBe("urgent");
  });

  it("una duda normal sin prioridad se queda donde le toca", async () => {
    // CONTROL NEGATIVO: si todo saliera «urgent», la prioridad dejaría de
    // significar nada y la cola volvería a estar sin ordenar.
    const base = baseFalsa();
    await servicio(base).createTicket("u1", {
      subject: "Duda",
      body: "¿Dónde veo los informes del mes pasado?",
      category: "other",
    });
    expect(["low", "normal"]).toContain(prioridadGuardada(base));
  });
});

describe("lo que pide una persona no se baja nunca", () => {
  it("si pide urgent, se respeta aunque el triaje lo vea leve", async () => {
    const base = baseFalsa();
    await servicio(base).createTicket("u1", {
      subject: "Duda",
      body: "¿Dónde veo los informes del mes pasado?",
      category: "other",
      priority: "urgent",
    });
    expect(
      prioridadGuardada(base),
      "el sistema decidió que el problema de una persona importa menos de lo que dice",
    ).toBe("urgent");
  });

  it("si pide low y es seguridad, gana el triaje", async () => {
    // La dirección que protege al que no sabe que su problema es grave —y
    // también al que quiere quitarle importancia a un incidente.
    const base = baseFalsa();
    await servicio(base).createTicket("u1", {
      subject: "Cosa menor",
      body: "Nada importante, pero me han entrado en la cuenta y han cambiado la contraseña.",
      category: "other",
      priority: "low",
    });
    expect(prioridadGuardada(base)).toBe("urgent");
  });
});

describe("queda constancia de por qué está donde está", () => {
  it("se registra el equipo, la urgencia y el motivo", async () => {
    // Antes solo se registraban los tickets que dispararon respuesta automática
    // —los menos interesantes—. De los que van a mirar personas no quedaba ni
    // por qué estaban en esa cola.
    const base = baseFalsa();
    const svc = servicio(base);
    const registro = vi.spyOn(
      (svc as unknown as { logger: { info: (m: string, d: unknown) => void } }).logger,
      "info",
    );
    await svc.createTicket("u1", {
      subject: "Ayuda",
      body: "Me han hackeado la cuenta.",
      category: "technical",
    });
    expect(registro).toHaveBeenCalledWith(
      "support_ticket_created",
      expect.objectContaining({ equipo: "seguridad", urgencia: "critica", prioridad: "urgent" }),
    );
  });
});
