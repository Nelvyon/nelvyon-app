/**
 * Quien pide que pares deja de recibir. Quien tiene el autorespondedor, no.
 *
 * ── LOS DOS HUECOS QUE CIERRA ───────────────────────────────────────────────
 *
 * 1) `processDueEnrollments` seleccionaba `WHERE status='active' AND
 *    next_send_at <= NOW()`. Nada sobre el contacto. Las CAMPAÑAS sí filtraban
 *    (`NOT tags @> ARRAY['unsubscribed']`) y el webhook de SES pone esa etiqueta
 *    — pero las secuencias no la miraban. Alguien se daba de baja en una campaña
 *    y seguía recibiendo correo de una secuencia activa. Dos sistemas, la misma
 *    regla, y uno solo la conocía.
 *
 * 2) `handleReplyHook` marcaba `reply_received=true` para CUALQUIER respuesta y
 *    no detenía nada salvo que el autor hubiera puesto una rama. Así que quien
 *    contestaba «no me interesa» seguía recibiendo los cinco correos restantes.
 *
 * ── POR QUÉ VAN JUNTOS ──────────────────────────────────────────────────────
 *
 * Arreglar (2) sin clasificar es PEOR que no arreglarlo. Si parar-al-responder
 * se aplica a los autorespondedores, un «estaré fuera hasta el lunes» cierra la
 * secuencia, el prospecto no vuelve a saber de nosotros nunca, y en el CRM consta
 * como que contestó. Se pierde un cliente y además se pierde en silencio.
 *
 * Por eso la prueba que más importa aquí es la del autorespondedor.
 *
 * COSTE EXTERNO: 0 EUR. Base falsa en memoria; no se envía nada.
 */
import { beforeEach, describe, expect, it } from "vitest";

import { SaasSequencesService } from "../SaasSequencesService";

type Fila = Record<string, unknown>;

/**
 * Base falsa mínima: reconoce por forma las cinco sentencias que este flujo
 * ejecuta y registra lo que se le pide, para poder afirmar QUÉ pasó y no sólo
 * que no reventó.
 */
class BaseFalsa {
  inscripciones: Fila[] = [];
  contactos: Fila[] = [];
  pasos: Fila[] = [];
  sentencias: string[] = [];

  async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    this.sentencias.push(sql.replace(/\s+/g, " ").trim());
    const s = sql.replace(/\s+/g, " ");

    // Cierre por consentimiento retirado.
    if (s.includes("FROM saas_contacts c") && s.includes("SET status='unsubscribed'")) {
      const salida: Fila[] = [];
      for (const e of this.inscripciones) {
        const c = this.contactos.find((x) => x.id === e.contact_id && x.tenant_id === e.tenant_id);
        const tags = (c?.tags as string[] | undefined) ?? [];
        if (e.status === "active" && tags.includes("unsubscribed")) {
          e.status = "unsubscribed";
          salida.push({ id: e.id });
        }
      }
      return salida as T[];
    }

    // Marca de respuesta.
    if (s.includes("SET reply_received=$4")) {
      const [sequenceId, tenantId, contactId, cuenta] = params;
      const e = this.inscripciones.find(
        (x) =>
          x.sequence_id === sequenceId &&
          x.tenant_id === tenantId &&
          x.contact_id === contactId &&
          x.status === "active",
      );
      if (!e) return [] as T[];
      e.reply_received = cuenta;
      return [e] as T[];
    }

    // ¿Hay rama sobre `replied`?
    if (s.includes("branch_condition->>'field'='replied'")) {
      const n = this.pasos.filter(
        (p) =>
          p.sequence_id === params[0] &&
          p.step_type === "branch" &&
          (p.branch_condition as { field?: string } | undefined)?.field === "replied",
      ).length;
      return [{ n: String(n) }] as T[];
    }

    // Retirada de consentimiento en el contacto.
    if (s.includes("UPDATE saas_contacts") && s.includes("array_append")) {
      const c = this.contactos.find((x) => x.id === params[0] && x.tenant_id === params[1]);
      if (c) {
        const tags = ((c.tags as string[] | undefined) ?? []).slice();
        if (!tags.includes("unsubscribed")) tags.push("unsubscribed");
        c.tags = tags;
      }
      return [] as T[];
    }

    // Cambios de estado de la inscripción.
    const cambio = /SET status='(\w+)'/.exec(s);
    if (cambio && s.startsWith("UPDATE saas_sequence_enrollments")) {
      const e = this.inscripciones.find((x) => x.id === params[0]);
      if (e) e.status = cambio[1];
      return [] as T[];
    }

    return [] as T[];
  }
}

const TEN = "ten-1";
const SEQ = "seq-1";

describe("quien pide que pares deja de recibir, y quien no ha contestado sigue recibiendo", () => {
  let db: BaseFalsa;
  let svc: SaasSequencesService;

  beforeEach(() => {
    db = new BaseFalsa();
    svc = new SaasSequencesService(db as never);
    db.contactos = [{ id: "c-1", tenant_id: TEN, tags: [] }];
    db.inscripciones = [
      { id: "e-1", sequence_id: SEQ, tenant_id: TEN, contact_id: "c-1", status: "active", current_step: 1 },
    ];
  });

  // ── LA REGLA QUE MÁS IMPORTA ──────────────────────────────────────────────

  it("un autorespondedor NO detiene la secuencia ni cuenta como respuesta", async () => {
    // Si esto fallara, cada prospecto que se va de vacaciones se pierde para
    // siempre, y en el CRM consta como que contestó.
    const clase = await svc.handleReplyHook(
      TEN,
      SEQ,
      "c-1",
      "Automatic reply: estaré fuera de la oficina hasta el 15 de septiembre",
    );

    expect(clase?.categoria).toBe("automatica");
    expect(db.inscripciones[0].status, "un autorespondedor cerró la secuencia").toBe("active");
    expect(db.inscripciones[0].reply_received).toBeUndefined();
  });

  it("y ni siquiera toca la base: no hay nada que registrar", async () => {
    await svc.handleReplyHook(TEN, SEQ, "c-1", "Out of office — back on Monday");
    expect(db.sentencias, "un autorespondedor escribió en la base").toHaveLength(0);
  });

  // ── BAJA ──────────────────────────────────────────────────────────────────

  it("una baja detiene la secuencia Y retira el consentimiento del contacto", async () => {
    const clase = await svc.handleReplyHook(TEN, SEQ, "c-1", "Por favor, dadme de baja de esta lista");

    expect(clase?.categoria).toBe("baja");
    expect(db.inscripciones[0].status).toBe("unsubscribed");
    expect(
      db.contactos[0].tags,
      "la baja se quedó en esta secuencia: otra volvería a escribirle",
    ).toContain("unsubscribed");
  });

  it("la baja usa la MISMA marca que ya honran las campañas", async () => {
    // Si inventara una etiqueta nueva, las campañas seguirían escribiéndole:
    // dos formas de decir «no me escribas» y un día se olvida una.
    await svc.handleReplyHook(TEN, SEQ, "c-1", "unsubscribe");
    expect(db.contactos[0].tags).toEqual(["unsubscribed"]);
  });

  // ── LA BAJA LLEGADA POR OTRO CANAL ────────────────────────────────────────

  it("LA FUGA: darse de baja en una campaña cierra también las secuencias activas", async () => {
    // Este era el agujero real: la etiqueta la ponía el webhook de SES y las
    // secuencias no la miraban en ninguna parte.
    db.contactos[0].tags = ["cliente", "unsubscribed"];

    await svc.processDueEnrollments(async () => {});

    expect(
      db.inscripciones[0].status,
      "una inscripción activa sobrevivió a la baja del contacto",
    ).toBe("unsubscribed");
  });

  it("y el cierre ocurre ANTES de elegir a quién enviar", async () => {
    db.contactos[0].tags = ["unsubscribed"];
    await svc.processDueEnrollments(async () => {});

    const iCierre = db.sentencias.findIndex((q) => q.includes("FROM saas_contacts c"));
    const iSeleccion = db.sentencias.findIndex((q) => q.includes("next_send_at <= NOW()"));
    expect(iCierre).toBeGreaterThanOrEqual(0);
    expect(iSeleccion).toBeGreaterThan(iCierre);
  });

  it("EL CONTROL: sin baja, no cierra nada", async () => {
    // Sin esto, un cierre que cerrara SIEMPRE pasaría todas las pruebas de
    // arriba y habría apagado el canal entero sin que nadie se enterara.
    await svc.processDueEnrollments(async () => {});
    expect(db.inscripciones[0].status, "cerró una inscripción de alguien que no pidió nada").toBe(
      "active",
    );
  });

  // ── RESPUESTAS HUMANAS ────────────────────────────────────────────────────

  it("un «no me interesa» detiene la secuencia pero NO retira el consentimiento", async () => {
    // Decidir por él una baja que no ha pedido le cierra la puerta a otra oferta
    // dentro de un año.
    const clase = await svc.handleReplyHook(TEN, SEQ, "c-1", "Gracias pero no nos interesa ahora");

    expect(clase?.categoria).toBe("negativo");
    expect(db.inscripciones[0].status).toBe("completed");
    expect(db.contactos[0].tags).not.toContain("unsubscribed");
  });

  it("quien propone una llamada detiene la secuencia y pide atención humana", async () => {
    const clase = await svc.handleReplyHook(TEN, SEQ, "c-1", "Me interesa, ¿agendamos una llamada?");

    expect(clase?.categoria).toBe("reunion");
    expect(clase?.requiereAtencionHumana).toBe(true);
    expect(db.inscripciones[0].status, "se siguió enviando a quien quería hablar").toBe("completed");
  });

  it("un rebote cierra como fallida y NO cuenta como respuesta", async () => {
    // Contarlo inflaría la tasa de respuesta, que es la métrica con la que se
    // decide si la secuencia sirve para algo.
    const clase = await svc.handleReplyHook(TEN, SEQ, "c-1", "550 5.1.1 User unknown");

    expect(clase?.categoria).toBe("rebote");
    expect(clase?.cuentaComoRespuesta).toBe(false);
    expect(db.inscripciones[0].status).toBe("failed");
  });

  it("lo que no se reconoce se trata como respuesta humana y para", async () => {
    const clase = await svc.handleReplyHook(TEN, SEQ, "c-1", "¿?");
    expect(clase?.categoria).toBe("indeterminado");
    expect(db.inscripciones[0].status).toBe("completed");
  });

  // ── RESPETAR AL AUTOR ─────────────────────────────────────────────────────

  it("si la secuencia RAMIFICA sobre `replied`, no se le pisa la decisión al autor", async () => {
    // Quien puso la rama decidió explícitamente qué pasa al responder. Pararla
    // por su cuenta convertiría su diseño en código muerto.
    db.pasos = [
      {
        sequence_id: SEQ,
        step_type: "branch",
        branch_condition: { field: "replied", op: "eq", value: true },
        position: 1,
      },
    ];

    await svc.handleReplyHook(TEN, SEQ, "c-1", "Me interesa, contadme más");

    expect(db.inscripciones[0].status, "se paró una secuencia que ramificaba sobre la respuesta").toBe(
      "active",
    );
  });

  it("pero una BAJA para aunque haya rama: eso no lo decide el autor", async () => {
    db.pasos = [
      {
        sequence_id: SEQ,
        step_type: "branch",
        branch_condition: { field: "replied", op: "eq", value: true },
        position: 1,
      },
    ];

    await svc.handleReplyHook(TEN, SEQ, "c-1", "no me volváis a escribir");

    expect(db.inscripciones[0].status).toBe("unsubscribed");
  });
});
