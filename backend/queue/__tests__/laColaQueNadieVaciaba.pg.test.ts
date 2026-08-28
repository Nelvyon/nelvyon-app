/**
 * LA COLA QUE NADIE VACIABA, contra PostgreSQL real.
 *
 * Medido en producción el 28 de agosto de 2026, en solo lectura:
 *
 *   SELECT status, count(*) FROM os_jobs GROUP BY status;  →  queued: 12
 *
 * Doce trabajos en cola, ni un `completed`, ni un `failed`, desde el 29 de
 * junio. No son doce atascados de entre miles procesados: es que nunca se
 * procesó ninguno. En todo el árbol no había una sola consulta que
 * seleccionara trabajo pendiente — sólo INSERT, UPDATE por id y cinco COUNT(*)
 * para pintar paneles.
 *
 * Estas pruebas no se pueden escribir contra un doble. Lo que hay que demostrar
 * —que dos trabajadores no se llevan la misma fila, que un arriendo vencido se
 * rescata, que `waiting_approval` sobrevive a un reinicio— sólo lo garantiza
 * PostgreSQL, con `FOR UPDATE SKIP LOCKED` y transacciones de verdad. Un doble
 * en memoria demostraría que mi doble hace lo que yo creo.
 *
 * Se ejecutan contra una base LOCAL. Sin `NELVYON_COLA_CERT_DSN` se saltan.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import pg from "pg";

import { ColaDeTrabajos, INTOCABLES, RECLAMABLES } from "../colaDeTrabajos";
import { TrabajadorDeCola, type ResultadoDeManejador } from "../trabajadorDeCola";

const DSN = process.env.NELVYON_COLA_CERT_DSN ?? "";
const conBase = DSN ? describe : describe.skip;

const CLIENTE = "cola-cert-cliente";
const SERVICIO = "cola_cert_servicio";

let pool: pg.Pool;

/** Adaptador mínimo con la forma que `ColaDeTrabajos` necesita. */
function almacen() {
  return {
    async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
      const r = await pool.query(sql, params);
      return r.rows as T[];
    },
    async withTransaction<T>(fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
      const c = await pool.connect();
      try {
        await c.query("BEGIN");
        const out = await fn(c);
        await c.query("COMMIT");
        return out;
      } catch (e) {
        await c.query("ROLLBACK").catch(() => undefined);
        throw e;
      } finally {
        c.release();
      }
    },
  };
}

async function sembrar(
  jobId: string,
  extra: Partial<{ status: string; runAfter: string; attempts: number; maxAttempts: number; leaseExpires: string | null; lockedBy: string | null }> = {},
): Promise<void> {
  await pool.query(
    `INSERT INTO os_jobs
       (job_id, service_id, client_id, status, progress, steps, payload,
        created_at, updated_at, attempts, max_attempts, run_after,
        lease_expires_at, locked_by)
     VALUES ($1, $2, $3, $4, 0, '[]'::jsonb, '{"brief":"x"}'::jsonb,
             NOW(), NOW(), $5, $6, COALESCE($7::timestamptz, NOW()), $8::timestamptz, $9)`,
    [
      jobId,
      SERVICIO,
      CLIENTE,
      extra.status ?? "queued",
      extra.attempts ?? 0,
      extra.maxAttempts ?? 3,
      extra.runAfter ?? null,
      extra.leaseExpires ?? null,
      extra.lockedBy ?? null,
    ],
  );
}

async function estado(jobId: string) {
  const { rows } = await pool.query(
    `SELECT status, attempts, locked_by, lease_expires_at, run_after,
            last_error, dead_lettered_at, result
       FROM os_jobs WHERE job_id = $1`,
    [jobId],
  );
  return rows[0];
}

conBase("la cola de trabajos, sobre PostgreSQL real", () => {
  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: DSN, max: 8 });
    // La migración 579 tiene que estar aplicada: si no, estas pruebas medirían
    // otra cosa y pasarían por casualidad.
    const { rows } = await pool.query(
      `SELECT column_name FROM information_schema.columns
        WHERE table_name = 'os_jobs' AND column_name = 'lease_expires_at'`,
    );
    if (rows.length === 0) {
      throw new Error("falta la migración 579 en la base de pruebas");
    }
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM os_jobs WHERE client_id = $1`, [CLIENTE]);
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query(`DELETE FROM os_jobs WHERE client_id = $1`, [CLIENTE]);
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe("el reclamo es atómico", () => {
    it("dos trabajadores NUNCA se llevan la misma fila", async () => {
      await sembrar("j-1");
      await sembrar("j-2");
      await sembrar("j-3");
      await sembrar("j-4");

      const a = new ColaDeTrabajos(almacen(), { identidad: "A" });
      const b = new ColaDeTrabajos(almacen(), { identidad: "B" });

      // A la vez, a propósito: es la condición de carrera que `SKIP LOCKED`
      // existe para resolver, y la que un doble en memoria no reproduce.
      const [tomadosA, tomadosB] = await Promise.all([a.reclamar(4), b.reclamar(4)]);

      const ids = [...tomadosA, ...tomadosB].map((t) => t.jobId);
      expect(ids).toHaveLength(4);
      expect(new Set(ids).size, "una fila fue reclamada dos veces").toBe(4);
    });

    it("reclamar cuenta el intento AL TOMAR, no al terminar", async () => {
      // Si se contara al terminar, un trabajo capaz de matar al proceso se
      // reintentaría eternamente: nunca llegaría a "terminar".
      await sembrar("j-1");
      const cola = new ColaDeTrabajos(almacen(), { identidad: "A" });
      const [t] = await cola.reclamar(1);
      expect(t.attempts).toBe(1);
      expect((await estado("j-1")).attempts).toBe(1);
    });

    it("no se reclama nada programado para más tarde", async () => {
      await sembrar("j-futuro", { runAfter: new Date(Date.now() + 3_600_000).toISOString() });
      const cola = new ColaDeTrabajos(almacen(), { identidad: "A" });
      expect(await cola.reclamar(5)).toHaveLength(0);
    });

    it("no se reclama nada sin intentos restantes", async () => {
      await sembrar("j-agotado", { attempts: 3, maxAttempts: 3 });
      const cola = new ColaDeTrabajos(almacen(), { identidad: "A" });
      expect(await cola.reclamar(5)).toHaveLength(0);
    });

    it("el arriendo queda puesto y con dueño", async () => {
      await sembrar("j-1");
      const cola = new ColaDeTrabajos(almacen(), { identidad: "A", arriendoMs: 60_000 });
      await cola.reclamar(1);
      const e = await estado("j-1");
      expect(e.status).toBe("running");
      expect(e.locked_by).toBe("A");
      expect(new Date(e.lease_expires_at).getTime()).toBeGreaterThan(Date.now());
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe("un trabajo que espera a una persona no se ejecuta solo", () => {
    it("LA GARANTÍA: `waiting_approval` no se reclama", async () => {
      // Ésta es la prueba por la que el reclamo usa lista blanca. Con una lista
      // negra («todo lo que no esté completed»), un reinicio ejecutaría trabajo
      // que estaba parado esperando a alguien — y ese trabajo es justo el que
      // gasta dinero o publica en nombre del cliente.
      await sembrar("j-espera", { status: "waiting_approval" });
      const cola = new ColaDeTrabajos(almacen(), { identidad: "A" });
      expect(await cola.reclamar(10)).toHaveLength(0);
      expect((await estado("j-espera")).status).toBe("waiting_approval");
    });

    it("tampoco lo rescata el barrido de arriendos vencidos", async () => {
      // El rescate es el otro camino por el que un estado parado podría
      // reactivarse solo tras un reinicio.
      await sembrar("j-espera", {
        status: "waiting_approval",
        leaseExpires: new Date(Date.now() - 60_000).toISOString(),
        lockedBy: "muerto",
      });
      const cola = new ColaDeTrabajos(almacen(), { identidad: "A" });
      await cola.rescatarArriendosVencidos();
      expect((await estado("j-espera")).status).toBe("waiting_approval");
    });

    it("los estados intocables y los reclamables no se solapan", () => {
      for (const e of INTOCABLES) {
        expect(RECLAMABLES, `${e} no puede ser reclamable`).not.toContain(e);
      }
      expect(RECLAMABLES).toEqual(["queued"]);
    });

    it("dejar esperando NO consume un intento ni programa reintento", async () => {
      await sembrar("j-1");
      const cola = new ColaDeTrabajos(almacen(), { identidad: "A" });
      await cola.reclamar(1);
      await cola.dejarEsperandoAprobacion("j-1", "hace falta que el cliente apruebe el gasto");
      const e = await estado("j-1");
      expect(e.status).toBe("waiting_approval");
      expect(e.attempts).toBe(1);
      expect(e.locked_by).toBeNull();
      expect(e.result.waiting_reason).toContain("apruebe el gasto");
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe("fallos, espera creciente y rendición", () => {
    it("un fallo devuelve a la cola con espera", async () => {
      await sembrar("j-1");
      const cola = new ColaDeTrabajos(almacen(), { identidad: "A", esperaBaseMs: 60_000 });
      const [t] = await cola.reclamar(1);
      const destino = await cola.fallar("j-1", new Error("proveedor caido"), t.attempts, t.maxAttempts);

      expect(destino).toBe("reintenta");
      const e = await estado("j-1");
      expect(e.status).toBe("queued");
      expect(e.last_error).toContain("proveedor caido");
      expect(new Date(e.run_after).getTime()).toBeGreaterThan(Date.now() + 30_000);
    });

    it("la espera crece y tiene tope", () => {
      const cola = new ColaDeTrabajos(almacen(), { esperaBaseMs: 1_000, esperaMaximaMs: 5_000 });
      expect(cola.esperaDelIntento(1)).toBe(1_000);
      expect(cola.esperaDelIntento(2)).toBe(2_000);
      expect(cola.esperaDelIntento(3)).toBe(4_000);
      expect(cola.esperaDelIntento(9)).toBe(5_000);
    });

    it("agotados los intentos va a `dead_letter` y NO vuelve", async () => {
      await sembrar("j-1", { attempts: 2, maxAttempts: 3 });
      const cola = new ColaDeTrabajos(almacen(), { identidad: "A" });
      const [t] = await cola.reclamar(1);
      expect(t.attempts).toBe(3);

      const destino = await cola.fallar("j-1", new Error("no hay manera"), t.attempts, t.maxAttempts);
      expect(destino).toBe("dead_letter");

      const e = await estado("j-1");
      expect(e.status).toBe("dead_letter");
      expect(e.dead_lettered_at).not.toBeNull();

      // Y ya no se reclama: rendirse en silencio y rendirse ruidosamente no son
      // lo mismo, pero ninguno de los dos vuelve a intentarlo solo.
      expect(await cola.reclamar(10)).toHaveLength(0);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe("recuperación tras un reinicio", () => {
    it("un arriendo vencido vuelve a la cola", async () => {
      await sembrar("j-colgado", {
        status: "running",
        attempts: 1,
        leaseExpires: new Date(Date.now() - 60_000).toISOString(),
        lockedBy: "trabajador-muerto",
      });
      const cola = new ColaDeTrabajos(almacen(), { identidad: "A" });
      const r = await cola.rescatarArriendosVencidos();

      expect(r.devueltos).toBe(1);
      const e = await estado("j-colgado");
      expect(e.status).toBe("queued");
      expect(e.locked_by).toBeNull();
      expect(e.last_error).toContain("arriendo vencido");
    });

    it("EL CONTROL: un arriendo VIVO no se toca", async () => {
      // Sin este caso, el rescate podría estar devolviendo todo a la cola y la
      // prueba anterior pasaría igual — mientras se ejecuta cada trabajo dos
      // veces.
      await sembrar("j-vivo", {
        status: "running",
        attempts: 1,
        leaseExpires: new Date(Date.now() + 300_000).toISOString(),
        lockedBy: "trabajador-vivo",
      });
      const cola = new ColaDeTrabajos(almacen(), { identidad: "A" });
      const r = await cola.rescatarArriendosVencidos();

      expect(r.devueltos).toBe(0);
      expect((await estado("j-vivo")).status).toBe("running");
    });

    it("un arriendo vencido SIN intentos restantes va a `dead_letter`, no a la cola", async () => {
      // Rescatar en bucle un trabajo que mata al trabajador es un bucle
      // infinito con otro nombre.
      await sembrar("j-veneno", {
        status: "running",
        attempts: 3,
        maxAttempts: 3,
        leaseExpires: new Date(Date.now() - 60_000).toISOString(),
        lockedBy: "trabajador-muerto",
      });
      const cola = new ColaDeTrabajos(almacen(), { identidad: "A" });
      const r = await cola.rescatarArriendosVencidos();

      expect(r.agotados).toBe(1);
      expect((await estado("j-veneno")).status).toBe("dead_letter");
    });

    it("el latido de otro trabajador no alarga MI arriendo", async () => {
      await sembrar("j-1");
      const a = new ColaDeTrabajos(almacen(), { identidad: "A" });
      const b = new ColaDeTrabajos(almacen(), { identidad: "B" });
      await a.reclamar(1);

      expect(await b.latir("j-1"), "B alargó un arriendo que no es suyo").toBe(false);
      expect(await a.latir("j-1")).toBe(true);
    });

    it("completar un trabajo que ya no es mío no hace nada", async () => {
      await sembrar("j-1");
      const a = new ColaDeTrabajos(almacen(), { identidad: "A" });
      const b = new ColaDeTrabajos(almacen(), { identidad: "B" });
      await a.reclamar(1);

      await b.completar("j-1", { falso: true }, 10);
      expect((await estado("j-1")).status).toBe("running");
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe("idempotencia", () => {
    it("dos trabajos con la misma clave no pueden coexistir", async () => {
      await sembrar("j-1");
      await pool.query(`UPDATE os_jobs SET idempotency_key = 'k-1' WHERE job_id = 'j-1'`);
      await sembrar("j-2");
      await expect(
        pool.query(`UPDATE os_jobs SET idempotency_key = 'k-1' WHERE job_id = 'j-2'`),
      ).rejects.toThrow();
    });

    it("EL CONTROL: sin clave, dos trabajos conviven", async () => {
      // El índice es parcial; sin este caso, podría estar prohibiendo dos
      // trabajos cualesquiera y la prueba anterior pasaría igual.
      await sembrar("j-1");
      await sembrar("j-2");
      const { rows } = await pool.query(
        `SELECT count(*)::int n FROM os_jobs WHERE client_id = $1`,
        [CLIENTE],
      );
      expect(rows[0].n).toBe(2);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe("el trabajador, de punta a punta", () => {
    it("toma un trabajo, lo ejecuta y lo cierra", async () => {
      await sembrar("j-1");
      const cola = new ColaDeTrabajos(almacen(), { identidad: "W" });
      const w = new TrabajadorDeCola(cola, { registrar: () => {} });
      w.registrarManejador(SERVICIO, async () => ({ tipo: "completado", resultado: { ok: 1 } }));

      expect(await w.unaVuelta()).toBe(1);
      const e = await estado("j-1");
      expect(e.status).toBe("completed");
      expect(e.result.ok).toBe(1);
    });

    it("un manejador que pide aprobación deja el trabajo esperando", async () => {
      await sembrar("j-1");
      const cola = new ColaDeTrabajos(almacen(), { identidad: "W" });
      const w = new TrabajadorDeCola(cola, { registrar: () => {} });
      w.registrarManejador(SERVICIO, async (): Promise<ResultadoDeManejador> => ({
        tipo: "esperandoAprobacion",
        motivo: "la campaña gasta presupuesto del cliente",
      }));

      await w.unaVuelta();
      expect((await estado("j-1")).status).toBe("waiting_approval");
    });

    it("un servicio SIN manejador cae a `dead_letter` en la primera vuelta", async () => {
      // Reintentarlo tres veces no va a hacer que aparezca un manejador, y
      // mientras tanto ocupa un hueco de concurrencia cada vez.
      await sembrar("j-huerfano");
      await pool.query(`UPDATE os_jobs SET service_id = 'servicio_inexistente' WHERE job_id = 'j-huerfano'`);
      const cola = new ColaDeTrabajos(almacen(), { identidad: "W" });
      const w = new TrabajadorDeCola(cola, { registrar: () => {} });

      await w.unaVuelta();
      const e = await estado("j-huerfano");
      expect(e.status).toBe("dead_letter");
      expect(e.last_error).toContain("no hay manejador");
    });

    it("un manejador que revienta programa reintento, no pierde el trabajo", async () => {
      await sembrar("j-1");
      const cola = new ColaDeTrabajos(almacen(), { identidad: "W" });
      const w = new TrabajadorDeCola(cola, { registrar: () => {} });
      w.registrarManejador(SERVICIO, async () => {
        throw new Error("el modelo no respondio");
      });

      await w.unaVuelta();
      const e = await estado("j-1");
      expect(e.status).toBe("queued");
      expect(e.last_error).toContain("el modelo no respondio");
    });

    it("respeta la concurrencia", async () => {
      for (let i = 0; i < 6; i += 1) await sembrar(`j-${i}`);
      const cola = new ColaDeTrabajos(almacen(), { identidad: "W" });
      const w = new TrabajadorDeCola(cola, { concurrencia: 2, registrar: () => {} });
      w.registrarManejador(SERVICIO, async () => ({ tipo: "completado", resultado: null }));

      expect(await w.unaVuelta()).toBe(2);
      expect(await w.unaVuelta()).toBe(2);
    });

    it("el resumen cuenta lo que hay", async () => {
      await sembrar("j-1");
      await sembrar("j-2", { status: "waiting_approval" });
      const cola = new ColaDeTrabajos(almacen(), { identidad: "W" });
      const r = await cola.resumen();
      expect(r.queued).toBeGreaterThanOrEqual(1);
      expect(r.waiting_approval).toBeGreaterThanOrEqual(1);
    });
  });
});
