/**
 * LO PARADO SE VE.
 *
 * En producción hubo doce trabajos encolados desde junio que nadie ejecutó, y
 * no se supo hasta agosto. Los doce estaban en la tabla con su fecha: lo que
 * faltaba era alguien que preguntara «¿qué lleva parado más de la cuenta?».
 *
 * Estas pruebas comprueban las dos direcciones, porque un detector de atascos
 * que marque todo cumpliría igual de bien una suite que sólo mire lo que
 * detecta — y sería inútil a los tres días, cuando el operador dejara de
 * mirarlo.
 *
 * Y una tercera, que es la que de verdad protege contra el fallo original: que
 * una consulta rota NO se convierta en un cero tranquilizador.
 */
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import pg from "pg";

import { SalaDeMaquinas, UMBRALES } from "../SalaDeMaquinas";

const DSN = process.env.NELVYON_COLA_CERT_DSN ?? "";
const conBase = DSN ? describe : describe.skip;

const TENANT = "dddddddd-0009-4009-8009-000000000009";
const WS = 970001;
const CLI = "aaaaaaaa-c31d-4001-8001-000000000009";
const SERVICIO = "prueba_sala_de_maquinas";

let pool: pg.Pool;
let sala: SalaDeMaquinas;

const almacen = () => ({
  async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const r = await pool.query(sql, params);
    return r.rows as T[];
  },
});

async function job(estado: string, hace: string, extra: Record<string, string> = {}): Promise<string> {
  const id = `sm-${Math.random().toString(36).slice(2, 10)}`;
  const cols = ["job_id", "service_id", "client_id", "tenant_id", "status", "run_after", "updated_at"];
  const vals = ["$1", "$2", "$3", "$4::uuid", "$5", `NOW() - $6::interval`, `NOW() - $6::interval`];
  const params: unknown[] = [id, SERVICIO, CLI, TENANT, estado, hace];

  if (extra.locked_at) {
    cols.push("locked_at");
    vals.push(`NOW() - $7::interval`);
    params.push(extra.locked_at);
  }

  await pool.query(
    `INSERT INTO os_jobs (${cols.join(", ")}) VALUES (${vals.join(", ")})`,
    params,
  );
  return id;
}

conBase("lo parado se ve", () => {
  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: DSN, max: 6 });
    const { rows } = await pool.query(`SELECT to_regclass('public.os_jobs') t`);
    if (!rows[0].t) throw new Error("falta os_jobs en la base de pruebas");
    sala = new SalaDeMaquinas(almacen());
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM os_jobs WHERE service_id = $1`, [SERVICIO]);
    await pool.query(`DELETE FROM os_deliverables WHERE workspace_id = $1`, [WS]);
    await pool.end();
  });

  afterEach(async () => {
    await pool.query(`DELETE FROM os_jobs WHERE service_id = $1`, [SERVICIO]);
    await pool.query(`DELETE FROM os_deliverables WHERE workspace_id = $1`, [WS]);
  });

  // ═══════════════════════════════════════════════════════════════════════
  describe("lo que lleva parado demasiado se ve", () => {
    it("EL CASO ORIGINAL: un trabajo encolado hace semanas aparece", async () => {
      const id = await job("queued", "45 days");
      const p = await sala.pulso();
      const suyo = p.atascos.find((a) => a.id === id);
      expect(suyo, "el trabajo de junio no aparece; es el fallo que costó dos meses").toBeDefined();
      expect(suyo!.tipo).toBe("trabajo");
      expect(suyo!.horasParado).toBeGreaterThan(1000);
      expect(suyo!.tenantId).toBe(TENANT);
    });

    it("un trabajo que alguien reclamó y no terminó aparece", async () => {
      const id = await job("running", "5 hours", { locked_at: "5 hours" });
      const p = await sala.pulso();
      const suyo = p.atascos.find((a) => a.id === id);
      expect(suyo).toBeDefined();
      expect(suyo!.estado).toContain("sin terminar");
    });

    it("algo esperando a una persona desde hace días aparece", async () => {
      const id = await job("waiting_approval", "5 days");
      const p = await sala.pulso();
      expect(p.atascos.find((a) => a.id === id)?.tipo).toBe("aprobacion");
    });

    it("lo más antiguo va primero: es lo que hay que mirar hoy", async () => {
      await job("queued", "2 hours");
      const viejo = await job("queued", "60 days");
      const p = await sala.pulso();
      const mios = p.atascos.filter((a) => a.id.startsWith("sm-"));
      expect(mios[0].id).toBe(viejo);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  describe("EL CONTROL POSITIVO: lo que va bien NO se marca", () => {
    it("un trabajo recién encolado no está parado, está esperando su turno", async () => {
      const id = await job("queued", "2 minutes");
      const p = await sala.pulso();
      expect(
        p.atascos.find((a) => a.id === id),
        "marcar lo que acaba de entrar convierte el panel en ruido, y el ruido se deja de mirar",
      ).toBeUndefined();
    });

    it("un trabajo en curso desde hace un minuto tampoco", async () => {
      const id = await job("running", "1 minute", { locked_at: "1 minute" });
      const p = await sala.pulso();
      expect(p.atascos.find((a) => a.id === id)).toBeUndefined();
    });

    it("un trabajo completado no aparece por muy viejo que sea", async () => {
      const id = await job("completed", "200 days");
      const p = await sala.pulso();
      expect(p.atascos.find((a) => a.id === id)).toBeUndefined();
    });

    it("justo por debajo del umbral no se marca; justo por encima sí", async () => {
      // El borde exacto, que es donde un umbral mal puesto se nota.
      const dentro = await job("queued", `${UMBRALES.encoladoMinutos - 5} minutes`);
      const fuera = await job("queued", `${UMBRALES.encoladoMinutos + 5} minutes`);
      const p = await sala.pulso();
      expect(p.atascos.find((a) => a.id === dentro)).toBeUndefined();
      expect(p.atascos.find((a) => a.id === fuera)).toBeDefined();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  describe("lo que sí avanza también se cuenta", () => {
    it("un trabajo completado hace poco cuenta como movimiento", async () => {
      await job("completed", "2 hours");
      const p = await sala.pulso();
      expect(p.enMovimiento.trabajosCompletadosUltimas24h).toBeGreaterThan(0);
    });

    it("sin contraste, tres atascos parecerían un sistema roto", async () => {
      // La prueba de que el contraste existe y no es decorativo.
      const p = await sala.pulso();
      expect(p.enMovimiento).toHaveProperty("trabajosCompletadosUltimas24h");
      expect(p.enMovimiento).toHaveProperty("entregablesPublicadosUltimas24h");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  describe("una consulta rota NO se convierte en un cero tranquilizador", () => {
    it("si una tabla no existe, se dice; no se devuelve cero", async () => {
      // Es exactamente lo que le pasó a `SenalesDeCliente`: consultaba una
      // tabla inexistente y habría devuelto cero para siempre sin un solo
      // error visible.
      const rota = new SalaDeMaquinas({
        async query<T>(sql: string): Promise<T[]> {
          if (sql.includes("os_jobs")) throw new Error('relation "os_jobs" does not exist');
          return [] as T[];
        },
      });
      const p = await rota.pulso();

      expect(p.noMedido.length, "un fallo de consulta ha pasado sin dejar rastro").toBeGreaterThan(0);
      expect(p.noMedido.some((n) => n.porQue.includes("does not exist"))).toBe(true);
      expect(
        p.enMovimiento.trabajosCompletadosUltimas24h,
        "un cero afirmaría que se miró y no había nada; la verdad es que no se pudo mirar",
      ).toBeNull();
    });

    it("EL CONTROL: cuando sí se puede medir, no hay nada en noMedido", async () => {
      const p = await sala.pulso();
      expect(p.noMedido).toEqual([]);
      expect(p.enMovimiento.trabajosCompletadosUltimas24h).not.toBeNull();
    });

    it("el pulso dice cuándo se midió", async () => {
      // Un panel sin hora es un panel que puede llevar congelado desde ayer.
      const p = await sala.pulso();
      expect(Date.now() - new Date(p.medidoEn).getTime()).toBeLessThan(60_000);
    });
  });
});
