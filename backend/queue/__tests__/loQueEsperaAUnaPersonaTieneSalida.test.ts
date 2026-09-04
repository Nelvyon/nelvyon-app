/**
 * Lo que espera a una persona tiene salida.
 *
 * ── EL CALLEJÓN SIN SALIDA ──────────────────────────────────────────────────
 *
 * Medido: `waiting_approval` se escribía en UNA sentencia de todo el árbol
 * —`dejarEsperandoAprobacion`— y CERO lo escribían de vuelta. No había aprobar,
 * ni rechazar, ni reencolar. Un trabajo que entraba en ese estado se quedaba
 * ahí para siempre.
 *
 * `SalaDeMaquinas` los enseñaba, pero pasadas unas horas y bajo la etiqueta
 * «atasco». Eso es un detector de olvidos, no una bandeja: para cuando algo
 * aparece ahí, el cliente ya ha esperado de más.
 *
 * Y la puerta de calidad, recién conectada, multiplicó la frecuencia con la que
 * se entra. Añadirla sin dar salida habría convertido una mejora en un agujero:
 * más trabajo bien retenido y ninguna forma de soltarlo.
 *
 * ── LA DECISIÓN QUE MÁS IMPORTA ─────────────────────────────────────────────
 *
 * Aprobar NO reejecuta. El resultado ya está guardado; aprobar significa «esto
 * vale», no «hazlo otra vez». Reejecutar costaría otra llamada al modelo y
 * produciría algo DISTINTO de lo que la persona acaba de aprobar — que es
 * exactamente lo que no puede pasar cuando alguien ha dado el visto bueno a un
 * texto concreto.
 *
 * COSTE EXTERNO: 0 EUR. Base falsa en memoria.
 */
import { beforeEach, describe, expect, it } from "vitest";

import { ColaDeTrabajos } from "../colaDeTrabajos";

type Fila = Record<string, unknown>;

/** Base falsa que reconoce por forma las sentencias de este flujo. */
class BaseFalsa {
  filas: Fila[] = [];
  sentencias: string[] = [];

  async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const s = sql.replace(/\s+/g, " ").trim();
    this.sentencias.push(s);

    if (s.startsWith("SELECT job_id, service_id, client_id")) {
      return this.filas
        .filter((f) => f.status === "waiting_approval")
        .map((f) => ({
          job_id: f.job_id,
          service_id: f.service_id,
          client_id: f.client_id,
          motivo: (f.result as Fila | undefined)?.waiting_reason ?? null,
          desde: "2026-09-04T00:00:00Z",
        })) as T[];
    }

    if (s.includes("SET status = 'completed'") && s.includes("approved_by")) {
      const f = this.filas.find((x) => x.job_id === params[0] && x.status === "waiting_approval");
      if (!f) return [] as T[];
      f.status = "completed";
      f.result = { ...(f.result as Fila), approved_by: params[1] };
      return [{ job_id: f.job_id }] as T[];
    }

    if (s.includes("SET status = 'dead_letter'") && s.includes("rejected_by")) {
      const f = this.filas.find((x) => x.job_id === params[0] && x.status === "waiting_approval");
      if (!f) return [] as T[];
      f.status = "dead_letter";
      f.error = params[2];
      f.result = { ...(f.result as Fila), rejected_by: params[1] };
      return [{ job_id: f.job_id }] as T[];
    }

    return [] as T[];
  }
}

describe("lo que espera a una persona tiene salida", () => {
  let db: BaseFalsa;
  let cola: ColaDeTrabajos;

  beforeEach(() => {
    db = new BaseFalsa();
    cola = new ColaDeTrabajos(db as never, { identidad: "panel" });
    db.filas = [
      {
        job_id: "job-1",
        service_id: "contenido_copywriting_premium",
        client_id: "cli-1",
        status: "waiting_approval",
        result: { texto: "lo que produjo el agente", waiting_reason: "calidad (contenido) dice FAIL" },
      },
    ];
  });

  it("LA BANDEJA: se ven los que esperan, con su motivo", async () => {
    const lista = await cola.listarEsperandoAprobacion();

    expect(lista).toHaveLength(1);
    expect(lista[0].jobId).toBe("job-1");
    expect(lista[0].motivo, "se ve que está parado pero no por qué").toMatch(/calidad/);
  });

  it("no enseña lo que no está esperando", async () => {
    db.filas.push({ job_id: "job-2", service_id: "seo_premium", client_id: "c", status: "completed" });
    expect(await cola.listarEsperandoAprobacion()).toHaveLength(1);
  });

  // ── APROBAR ───────────────────────────────────────────────────────────────

  it("LA REGLA: aprobar lo cierra como completado", async () => {
    expect(await cola.aprobar("job-1", "daniel@nelvyon.com")).toBe(true);
    expect(db.filas[0].status).toBe("completed");
  });

  it("aprobar NO reejecuta: el resultado que se aprobó es el que queda", async () => {
    // Reejecutar produciría algo distinto de lo que la persona acaba de ver, y
    // encima costaría otra llamada al modelo.
    await cola.aprobar("job-1", "daniel@nelvyon.com");

    expect((db.filas[0].result as Record<string, unknown>).texto).toBe(
      "lo que produjo el agente",
    );
    expect(
      db.sentencias.some((q) => q.includes("status = 'queued'")),
      "la aprobación devolvió el trabajo a la cola",
    ).toBe(false);
  });

  it("queda constancia de QUIÉN aprobó", async () => {
    // Una aprobación anónima no se puede discutir después, y éstas son justo las
    // que se acaban discutiendo.
    await cola.aprobar("job-1", "daniel@nelvyon.com");
    expect((db.filas[0].result as Record<string, unknown>).approved_by).toBe("daniel@nelvyon.com");
  });

  it("y se CONSERVA por qué se había retenido", async () => {
    // Saber que algo se aprobó a pesar de una advertencia de calidad es la mitad
    // interesante del dato.
    await cola.aprobar("job-1", "daniel@nelvyon.com");
    expect((db.filas[0].result as Record<string, unknown>).waiting_reason).toMatch(/calidad/);
  });

  // ── RECHAZAR ──────────────────────────────────────────────────────────────

  it("rechazar lo saca del limbo con su motivo", async () => {
    expect(await cola.rechazar("job-1", "daniel@nelvyon.com", "el tono no es el del cliente")).toBe(
      true,
    );
    expect(db.filas[0].status).toBe("dead_letter");
    expect(db.filas[0].error).toMatch(/tono/);
  });

  it("rechazar NO lo devuelve a la cola", async () => {
    // Volvería a producir lo mismo que se acaba de rechazar. Rehacerlo es una
    // decisión aparte: se encola un trabajo nuevo.
    await cola.rechazar("job-1", "d@n.com", "no vale");
    expect(db.filas[0].status).not.toBe("queued");
  });

  // ── NO TOCAR LO QUE NO TOCA ───────────────────────────────────────────────

  it("EL CONTROL: no se puede aprobar algo que no esté esperando", async () => {
    // Sin esto, aprobar sería una forma de cerrar como completado cualquier
    // trabajo, incluido uno que está corriendo ahora mismo.
    db.filas[0].status = "running";
    expect(await cola.aprobar("job-1", "d@n.com")).toBe(false);
    expect(db.filas[0].status).toBe("running");
  });

  it("ni rechazar", async () => {
    db.filas[0].status = "completed";
    expect(await cola.rechazar("job-1", "d@n.com", "no")).toBe(false);
    expect(db.filas[0].status).toBe("completed");
  });

  it("un id que no existe no rompe nada", async () => {
    expect(await cola.aprobar("no-existe", "d@n.com")).toBe(false);
  });
});
