/**
 * NINGÚN AGENTE LLEGA A UN EJECUTOR SIN PASAR LAS PUERTAS.
 *
 * `MetaAdsExecutor` y `GoogleAdsExecutor` existían desde hacía tiempo y no los
 * llamaba ningún agente: sólo dos botones de interfaz. Conectarlos es lo que
 * convierte a NELVYON en una agencia que hace el trabajo. Y es el punto donde
 * más caro sale equivocarse, porque al otro lado hay dinero de un cliente.
 *
 * Estas pruebas atacan cada forma de saltarse una puerta:
 *
 *   - un agente de borradores lanzando campañas;
 *   - una acción que exige persona ejecutándose sin ella;
 *   - gasto sin autorización;
 *   - un reintento de red lanzando dos veces la misma campaña;
 *   - un fallo del proveedor descontando presupuesto igualmente.
 *
 * NINGUNA hace una llamada externa: el ejecutor es un doble que cuenta lo que
 * le piden. Lo que hay que demostrar es justamente que NO se le pide nada
 * cuando no toca.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import pg from "pg";

import { CATALOGO } from "../../agentes/catalogo";
import type { ContratoDeAgente } from "../../agentes/contratoDeAgente";
import { GuardaDeGasto } from "../../gasto/guardaDeGasto";
import {
  EjecutorSimulado,
  PuenteDeEjecucion,
  type AccionPropuesta,
  type RegistroDeAprobaciones,
} from "../PuenteDeEjecucion";

const DSN = process.env.NELVYON_COLA_CERT_DSN ?? "";
const conBase = DSN ? describe : describe.skip;

const TENANT = "dddddddd-0004-4004-8004-000000000004";
const WS = 940001;
const CLI = "aaaaaaaa-b21d-4001-8001-000000000001";
const SERVICIO = "ads_premium";

let pool: pg.Pool;
let guarda: GuardaDeGasto;
let puente: PuenteDeEjecucion;
let meta: EjecutorSimulado;
let aprobadas: Set<string>;
let solicitadas: string[];

function almacen() {
  return {
    async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
      const r = await pool.query(sql, params);
      return r.rows as T[];
    },
  };
}

const registroDeAprobaciones = (): RegistroDeAprobaciones => ({
  async estaAprobada(clave) {
    return aprobadas.has(clave);
  },
  async solicitar(clave) {
    solicitadas.push(clave);
  },
});

/** Un agente que SÍ puede gastar: el planificador de medios, que es L4. */
const planificador = (): ContratoDeAgente =>
  CATALOGO.find((a) => a.id === "planificador-de-medios")!;

/** Un agente de borradores, que NO puede gastar. */
const copywriter = (): ContratoDeAgente => CATALOGO.find((a) => a.id === "copywriter")!;

/** Un agente que publica en nombre del cliente: exige persona. */
const social = (): ContratoDeAgente => CATALOGO.find((a) => a.id === "social-media")!;

function accion(extra: Partial<AccionPropuesta> = {}): AccionPropuesta {
  return {
    ejecutor: "meta_ads",
    operacion: "crear_campana",
    consecuencias: ["gasta_dinero"],
    argumentos: { nombre: "campaña de prueba" },
    tenantId: TENANT,
    workspaceId: WS,
    serviceId: SERVICIO,
    clientId: CLI,
    importeCents: 5_000,
    idempotencyKey: `k-${Math.random().toString(36).slice(2)}`,
    ...extra,
  };
}

async function autorizarGasto(
  extra: Partial<{ presupuesto: number; topeOperacion: number; estado: string }> = {},
): Promise<void> {
  const estado = extra.estado ?? "aprobada";
  await pool.query(
    `INSERT INTO autorizaciones_de_gasto
       (tenant_id, workspace_id, service_id, proveedor, presupuesto_cents,
        tope_por_operacion_cents, vigente_hasta, estado, solicitada_por,
        aprobada_por, aprobada_en)
     VALUES ($1::uuid, $2, $3, 'meta_ads', $4, $5, NOW() + interval '30 days',
             $6, 'daniel', $7, $8)`,
    [
      TENANT, WS, SERVICIO,
      extra.presupuesto ?? 100_000,
      extra.topeOperacion ?? 20_000,
      estado,
      estado === "aprobada" ? "daniel" : null,
      estado === "aprobada" ? new Date().toISOString() : null,
    ],
  );
}

conBase("el puente de ejecución", () => {
  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: DSN, max: 8 });
    const { rows } = await pool.query(`SELECT to_regclass('public.autorizaciones_de_gasto') t`);
    if (!rows[0].t) throw new Error("falta la migración 580 en la base de pruebas");
    guarda = new GuardaDeGasto(almacen());
  });

  afterAll(async () => {
    await pool.query(`DELETE FROM gastos_ejecutados WHERE workspace_id = $1`, [WS]);
    await pool.query(`DELETE FROM autorizaciones_de_gasto WHERE workspace_id = $1`, [WS]);
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query(`DELETE FROM gastos_ejecutados WHERE workspace_id = $1`, [WS]);
    await pool.query(`DELETE FROM autorizaciones_de_gasto WHERE workspace_id = $1`, [WS]);
    vi.stubEnv("NELVYON_GASTO_EXTERNO_HABILITADO", "1");
    aprobadas = new Set();
    solicitadas = [];
    meta = new EjecutorSimulado("meta_ads");
    puente = new PuenteDeEjecucion(guarda, registroDeAprobaciones(), () => {});
    puente.registrarEjecutor(meta);
  });

  afterEach(() => vi.unstubAllEnvs());

  // ═════════════════════════════════════════════════════════════════════════
  describe("puerta 1 · la autonomía del agente", () => {
    it("un agente de borradores NO puede lanzar una campaña", async () => {
      await autorizarGasto();
      const r = await puente.cruzar(copywriter(), accion());

      expect(r.estado).toBe("denegado");
      if (r.estado === "denegado") expect(r.puerta).toBe("autonomia_del_agente");
      // Y lo que importa: NO se llamó al ejecutor.
      expect(meta.llamadas, "se llamó al ejecutor pese a denegar").toHaveLength(0);
    });

    it("se comprueba con las consecuencias REALES, no con las declaradas", async () => {
      // El mismo agente que redacta un correo puede estar a punto de enviarlo.
      const r = await puente.cruzar(copywriter(), accion({
        consecuencias: ["contacta_personas"],
        importeCents: 0,
      }));
      expect(r.estado).toBe("denegado");
      expect(meta.llamadas).toHaveLength(0);
    });

    it("EL CONTROL: el planificador de medios SÍ puede", async () => {
      await autorizarGasto();
      const r = await puente.cruzar(planificador(), accion());
      expect(r.estado).toBe("ejecutado");
      expect(meta.llamadas).toHaveLength(1);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe("puerta 2 · la aprobación humana", () => {
    it("publicar en nombre del cliente NO se ejecuta sin persona", async () => {
      const r = await puente.cruzar(social(), accion({
        ejecutor: "meta_ads",
        operacion: "publicar_post",
        consecuencias: ["publica_en_nombre_del_cliente"],
        importeCents: 0,
      }));

      expect(r.estado).toBe("espera_aprobacion");
      expect(meta.llamadas).toHaveLength(0);
      // Y queda pedida, para que alguien pueda decidir.
      expect(solicitadas).toHaveLength(1);
    });

    it("con la aprobación puesta, SÍ se ejecuta", async () => {
      const a = accion({
        operacion: "publicar_post",
        consecuencias: ["publica_en_nombre_del_cliente"],
        importeCents: 0,
      });
      aprobadas.add(a.idempotencyKey);

      const r = await puente.cruzar(social(), a);
      expect(r.estado).toBe("ejecutado");
      expect(meta.llamadas).toHaveLength(1);
    });

    it("la aprobación es de ESA acción, no del agente en general", async () => {
      // Aprobar una publicación no aprueba las siguientes.
      const primera = accion({
        operacion: "publicar_post",
        consecuencias: ["publica_en_nombre_del_cliente"],
        importeCents: 0,
      });
      aprobadas.add(primera.idempotencyKey);
      expect((await puente.cruzar(social(), primera)).estado).toBe("ejecutado");

      const segunda = accion({
        operacion: "publicar_post",
        consecuencias: ["publica_en_nombre_del_cliente"],
        importeCents: 0,
      });
      expect((await puente.cruzar(social(), segunda)).estado).toBe("espera_aprobacion");
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe("puerta 3 · la autorización de gasto", () => {
    it("sin autorización NO se gasta, y NO se llama al ejecutor", async () => {
      const r = await puente.cruzar(planificador(), accion());
      expect(r.estado).toBe("denegado");
      if (r.estado === "denegado") expect(r.puerta).toBe("autorizacion_de_gasto");
      expect(meta.llamadas).toHaveLength(0);
    });

    it("con el interruptor apagado tampoco, aunque haya autorización", async () => {
      await autorizarGasto();
      vi.stubEnv("NELVYON_GASTO_EXTERNO_HABILITADO", "");
      const r = await puente.cruzar(planificador(), accion());
      expect(r.estado).toBe("denegado");
      expect(meta.llamadas).toHaveLength(0);
    });

    it("por encima del tope por operación tampoco", async () => {
      await autorizarGasto({ presupuesto: 100_000, topeOperacion: 1_000 });
      const r = await puente.cruzar(planificador(), accion({ importeCents: 5_000 }));
      expect(r.estado).toBe("denegado");
      expect(meta.llamadas).toHaveLength(0);
    });

    it("ejecutar descuenta del presupuesto", async () => {
      await autorizarGasto({ presupuesto: 100_000, topeOperacion: 50_000 });
      await puente.cruzar(planificador(), accion({ importeCents: 30_000 }));

      const { rows } = await pool.query(
        `SELECT consumido_cents::int c FROM autorizaciones_de_gasto WHERE workspace_id = $1`,
        [WS],
      );
      expect(rows[0].c).toBe(30_000);
    });

    it("una acción que NO gasta no toca la guarda", async () => {
      // Sin autorización ninguna, una acción sin gasto pasa igual.
      const r = await puente.cruzar(copywriter(), accion({
        consecuencias: [],
        importeCents: 0,
      }));
      expect(r.estado).toBe("ejecutado");
      expect(meta.llamadas).toHaveLength(1);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe("puerta 4 · idempotencia", () => {
    it("LA GARANTÍA: un reintento con la misma clave NO lanza dos campañas", async () => {
      await autorizarGasto();
      const a = accion();

      const primera = await puente.cruzar(planificador(), a);
      const segunda = await puente.cruzar(planificador(), a);

      expect(primera.estado).toBe("ejecutado");
      expect(segunda.estado).toBe("ejecutado");
      if (segunda.estado === "ejecutado") expect(segunda.yaEstabaHecho).toBe(true);
      // Lo decisivo: el ejecutor sólo se llamó UNA vez.
      expect(meta.llamadas, "se lanzó la campaña dos veces").toHaveLength(1);
    });

    it("dos peticiones SIMULTÁNEAS: sólo una llega al ejecutor", async () => {
      await autorizarGasto();
      const a = accion();
      await Promise.all([puente.cruzar(planificador(), a), puente.cruzar(planificador(), a)]);
      expect(meta.llamadas).toHaveLength(1);
    });

    it("claves distintas SÍ son dos campañas", async () => {
      // Control: sin esto, un puente que bloqueara todo pasaría lo anterior.
      await autorizarGasto();
      await puente.cruzar(planificador(), accion());
      await puente.cruzar(planificador(), accion());
      expect(meta.llamadas).toHaveLength(2);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe("cuando el proveedor falla", () => {
    it("un fallo NO descuenta presupuesto", async () => {
      // Cobrarle a un cliente por algo que no ocurrió es cobrarle por nada.
      await autorizarGasto({ presupuesto: 100_000, topeOperacion: 50_000 });
      const roto = new EjecutorSimulado("meta_ads", "falla");
      const p = new PuenteDeEjecucion(guarda, registroDeAprobaciones(), () => {});
      p.registrarEjecutor(roto);

      const r = await p.cruzar(planificador(), accion({ importeCents: 30_000 }));
      expect(r.estado).toBe("fallo_del_proveedor");

      const { rows } = await pool.query(
        `SELECT consumido_cents::int c FROM autorizaciones_de_gasto WHERE workspace_id = $1`,
        [WS],
      );
      expect(rows[0].c).toBe(0);
    });

    it("y el gasto queda registrado como fallido, no borrado", async () => {
      await autorizarGasto();
      const roto = new EjecutorSimulado("meta_ads", "falla");
      const p = new PuenteDeEjecucion(guarda, registroDeAprobaciones(), () => {});
      p.registrarEjecutor(roto);
      await p.cruzar(planificador(), accion());

      const { rows } = await pool.query(
        `SELECT estado FROM gastos_ejecutados WHERE workspace_id = $1`,
        [WS],
      );
      expect(rows.map((r) => r.estado)).toContain("fallido");
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe("un ejecutor que no existe", () => {
    it("se deniega antes de reservar presupuesto", async () => {
      // Reservar para una operación imposible deja una reserva colgando.
      await autorizarGasto();
      const r = await puente.cruzar(planificador(), accion({ ejecutor: "tiktok_ads" }));

      expect(r.estado).toBe("denegado");
      if (r.estado === "denegado") expect(r.puerta).toBe("ejecutor_desconocido");

      const { rows } = await pool.query(
        `SELECT count(*)::int n FROM gastos_ejecutados WHERE workspace_id = $1 AND estado = 'solicitado'`,
        [WS],
      );
      expect(rows[0].n, "quedó una reserva colgando").toBe(0);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe("el rastro", () => {
    it("todo gasto lleva al agente como actor", async () => {
      await autorizarGasto();
      await puente.cruzar(planificador(), accion());

      const { rows } = await pool.query(
        `SELECT actor FROM gastos_ejecutados WHERE workspace_id = $1 AND estado = 'ejecutado'`,
        [WS],
      );
      expect(rows[0].actor).toBe("agente:planificador-de-medios");
    });

    it("la referencia del proveedor se guarda para poder encontrarlo", async () => {
      await autorizarGasto();
      const r = await puente.cruzar(planificador(), accion());
      expect(r.estado).toBe("ejecutado");

      const { rows } = await pool.query(
        `SELECT referencia_externa FROM gastos_ejecutados WHERE workspace_id = $1 AND estado = 'ejecutado'`,
        [WS],
      );
      expect(rows[0].referencia_externa).toContain("simulado:meta_ads");
    });

    it("el simulado se ve a la legua que es simulado", () => {
      // Un doble que finge ser real es cómo 14.178 eventos de reglas pasaron
      // por trabajo hecho con IA.
      expect(new EjecutorSimulado("x").id).toBe("x");
    });
  });
});
