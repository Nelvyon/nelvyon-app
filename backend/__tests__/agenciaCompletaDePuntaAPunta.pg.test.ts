/**
 * LA AGENCIA COMPLETA, DE PUNTA A PUNTA.
 *
 * Cada pieza de este árbol tiene sus propias pruebas. Lo que ninguna demuestra
 * es que ENCAJEN: que un cliente pueda entrar por un extremo y salga trabajo
 * por el otro sin que en medio haga falta una persona invisible, un dato que
 * nadie puede aportar o una tabla que no existe.
 *
 * Es la prueba que el diagnóstico echó de menos. NELVYON tenía siete de once
 * eslabones funcionando y nadie lo había recorrido entero: por eso la cola
 * llevaba desde junio sin vaciarse y nadie se enteró hasta agosto.
 *
 * EL RECORRIDO, sin saltarse nada:
 *
 *     cliente nuevo
 *       → pide un servicio                    (Fase 2)
 *       → se le declaran las cuentas          (Fase 2)
 *       → completa el intake                  (Fase 2 → Fase 3)
 *       → el cerebro dice que ya se puede     (Fase 3)
 *       → se conectan sus cuentas
 *       → entra un trabajo en la cola          (P3)
 *       → un trabajador lo reclama             (P3)
 *       → el agente comprueba su contrato      (Fase 5)
 *       → propone una acción con gasto         (Fase 11)
 *       → el puente la para: falta autorización
 *       → se autoriza el gasto
 *       → la acción se ejecuta                 (Fase 11 + P4)
 *       → el trabajo se completa               (P3)
 *       → customer success no ve nada roto     (Fase 23)
 *
 * NADA de esto llama a un proveedor externo. El ejecutor es un doble; el
 * modelo no se toca. Lo que se demuestra es el cableado, no el contenido.
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import pg from "pg";

import { CerebroDeNegocioService } from "../cerebro/CerebroDeNegocioService";
import { dimensionesDeServicio } from "../cerebro/dimensiones";
import { CicloDelClienteService } from "../portal/CicloDelClienteService";
import { ColaDeTrabajos } from "../queue/colaDeTrabajos";
import { TrabajadorDeCola } from "../queue/trabajadorDeCola";
import { CATALOGO } from "../agentes/catalogo";
import { prepararEjecucion } from "../agentes/contratoDeAgente";
import { GuardaDeGasto } from "../gasto/guardaDeGasto";
import {
  EjecutorSimulado,
  PuenteDeEjecucion,
  type RegistroDeAprobaciones,
} from "../ejecucion/PuenteDeEjecucion";
import { SenalesDeCliente } from "../exito/SenalesDeCliente";

const DSN = process.env.NELVYON_COLA_CERT_DSN ?? "";
const conBase = DSN ? describe : describe.skip;

const TENANT = "eeeeeeee-0005-4005-8005-000000000005";
const WS = 930001;
const CLI = "aaaaaaaa-e2e0-4001-8001-000000000001";
const PROYECTO = "aaaaaaaa-e2e0-4002-8002-000000000002";
const SERVICIO = "ads_premium";

let pool: pg.Pool;
let cerebro: CerebroDeNegocioService;
let ciclo: CicloDelClienteService;
let cola: ColaDeTrabajos;
let guarda: GuardaDeGasto;
let puente: PuenteDeEjecucion;
let senales: SenalesDeCliente;
let meta: EjecutorSimulado;
let aprobadas: Set<string>;

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

async function limpiar(): Promise<void> {
  await pool.query(`DELETE FROM os_jobs WHERE client_id = $1`, [CLI]);
  for (const t of [
    "gastos_ejecutados",
    "autorizaciones_de_gasto",
    "os_client_connections",
    "os_service_requests",
    "os_client_brain_history",
    "os_client_brain",
    "os_deliverables",
  ]) {
    await pool.query(`DELETE FROM ${t} WHERE workspace_id = $1`, [WS]);
  }
}

conBase("la agencia completa", () => {
  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: DSN, max: 10 });
    cerebro = new CerebroDeNegocioService(almacen());
    ciclo = new CicloDelClienteService(almacen(), cerebro);
    cola = new ColaDeTrabajos(almacen(), { identidad: "e2e" });
    guarda = new GuardaDeGasto(almacen());
    senales = new SenalesDeCliente(almacen(), cerebro, ciclo);

    await pool.query(
      `INSERT INTO os_clients (id, workspace_id, created_by_user_id, business_name, sector, status)
       VALUES ($1::uuid, $2, 'e2e', 'Cliente de punta a punta', 'servicios', 'active')
       ON CONFLICT (id) DO NOTHING`,
      [CLI, WS],
    );
    await pool.query(
      `INSERT INTO os_projects (id, workspace_id, client_id, name, status, priority, metadata)
       VALUES ($1::uuid, $2, $3::uuid, 'proyecto e2e', 'active', 'medium', '{}'::jsonb)
       ON CONFLICT (id) DO NOTHING`,
      [PROYECTO, WS, CLI],
    );
  });

  afterAll(async () => {
    await limpiar();
    await pool.query(`DELETE FROM os_projects WHERE workspace_id = $1`, [WS]);
    await pool.query(`DELETE FROM os_clients WHERE workspace_id = $1`, [WS]);
    await pool.end();
  });

  beforeEach(async () => {
    await limpiar();
    vi.stubEnv("NELVYON_GASTO_EXTERNO_HABILITADO", "1");
    aprobadas = new Set();
    meta = new EjecutorSimulado("meta_ads");
    const aprobaciones: RegistroDeAprobaciones = {
      async estaAprobada(c) {
        return aprobadas.has(c);
      },
      async solicitar() {},
    };
    puente = new PuenteDeEjecucion(guarda, aprobaciones, () => {});
    puente.registrarEjecutor(meta);
  });

  afterEach(() => vi.unstubAllEnvs());

  it("un cliente nuevo llega hasta una campaña lanzada, sin ninguna persona invisible", async () => {
    // ── 1 · El cliente pide un servicio ──────────────────────────────────
    const solicitud = await ciclo.pedirServicio({
      workspaceId: WS,
      clientId: CLI,
      serviceId: SERVICIO,
      solicitadaPor: "portal:cliente",
      motivo: "quiero más clientes y no sé por dónde empezar",
    });
    expect(solicitud.yaExistia).toBe(false);

    // ── 2 · Se le declaran las cuentas que harán falta, con su porqué ────
    const conexiones = await ciclo.conexionesDe(WS, CLI);
    expect(conexiones.length).toBeGreaterThan(0);
    for (const c of conexiones) {
      expect(c.estado).toBe("necesaria");
      expect(c.paraQue.length, `${c.proveedor} sin explicación`).toBeGreaterThan(20);
    }

    // ── 3 · Todavía NO se puede trabajar, y el sistema lo dice ───────────
    const antes = await ciclo.resumen(WS, CLI);
    expect(antes.listoParaOperar).toBe(false);
    expect(antes.loQueFalta.datos.length).toBeGreaterThan(0);

    // ── 4 · El cliente contesta lo que le toca ───────────────────────────
    //
    // Sólo lo suyo: sus keywords y sus audiencias las deducimos nosotros.
    const suyas = dimensionesDeServicio(SERVICIO).filter((d) => d.laAporta === "cliente");
    await ciclo.contestar({
      workspaceId: WS,
      clientId: CLI,
      quien: "portal:cliente",
      respuestas: suyas.map((d) => ({ dimension: d.id, valor: ejemplo(d.forma) })),
    });

    const despues = await ciclo.resumen(WS, CLI);
    expect(despues.listoParaOperar, "el intake no desbloqueó la operación").toBe(true);

    // ── 5 · Se conectan sus cuentas ──────────────────────────────────────
    await pool.query(
      `UPDATE os_client_connections SET estado='conectada', conectada_en=NOW()
        WHERE workspace_id=$1 AND client_id=$2`,
      [WS, CLI],
    );
    await pool.query(
      `UPDATE os_service_requests SET estado='aceptado', decidida_en=NOW()
        WHERE workspace_id=$1 AND client_id=$2`,
      [WS, CLI],
    );

    // ── 6 · Entra trabajo en la cola ─────────────────────────────────────
    await pool.query(
      `INSERT INTO os_jobs (job_id, service_id, client_id, tenant_id, status, progress, steps, payload, created_at, updated_at)
       VALUES ('e2e-1', $1, $2, $3::uuid, 'queued', 0, '[]'::jsonb, '{"objetivo":"mas clientes"}'::jsonb, NOW(), NOW())`,
      [SERVICIO, CLI, TENANT],
    );

    // ── 7 · Un trabajador lo reclama, y el agente comprueba su contrato ──
    const planificador = CATALOGO.find((a) => a.id === "planificador-de-medios")!;
    let resultadoDelPuente: string | null = null;

    const trabajador = new TrabajadorDeCola(cola, { registrar: () => {} });
    trabajador.registrarManejador(SERVICIO, async (trabajo) => {
      // El agente lee del CEREBRO lo que declaró necesitar.
      const preparado = await prepararEjecucion(planificador, cerebro, WS, trabajo.clientId);
      if (!preparado.listo) {
        return { tipo: "esperandoAprobacion", motivo: preparado.motivo };
      }

      // Y propone una acción que gasta dinero.
      const r = await puente.cruzar(planificador, {
        ejecutor: "meta_ads",
        operacion: "crear_campana",
        consecuencias: ["gasta_dinero"],
        argumentos: { objetivo: trabajo.payload.objetivo },
        tenantId: TENANT,
        workspaceId: WS,
        serviceId: SERVICIO,
        clientId: trabajo.clientId,
        importeCents: 5_000,
        idempotencyKey: `e2e:${trabajo.jobId}`,
      });
      resultadoDelPuente = r.estado;

      if (r.estado === "denegado") return { tipo: "esperandoAprobacion", motivo: r.motivo };
      if (r.estado !== "ejecutado") throw new Error(r.motivo ?? "no se pudo ejecutar");
      return { tipo: "completado", resultado: { referencia: r.referenciaExterna } };
    });

    expect(await trabajador.unaVuelta()).toBe(1);

    // ── 8 · EL PUENTE LO PARA: no hay autorización de gasto ──────────────
    //
    // Esto es lo que debe pasar. Un trabajo que gasta dinero sin que nadie lo
    // haya autorizado NO se ejecuta, y no se pierde: queda esperando.
    expect(resultadoDelPuente).toBe("denegado");
    expect(meta.llamadas, "se lanzó una campaña sin autorización").toHaveLength(0);

    const parado = await pool.query(`SELECT status FROM os_jobs WHERE job_id='e2e-1'`);
    expect(parado.rows[0].status).toBe("waiting_approval");

    // ── 9 · Se autoriza el gasto ─────────────────────────────────────────
    await pool.query(
      `INSERT INTO autorizaciones_de_gasto
         (tenant_id, workspace_id, service_id, proveedor, presupuesto_cents,
          tope_por_operacion_cents, vigente_hasta, estado, solicitada_por,
          aprobada_por, aprobada_en)
       VALUES ($1::uuid, $2, $3, 'meta_ads', 100000, 20000,
               NOW() + interval '30 days', 'aprobada', 'cliente', 'daniel', NOW())`,
      [TENANT, WS, SERVICIO],
    );

    // ── 10 · Y el trabajo vuelve a la cola cuando alguien lo desbloquea ──
    await pool.query(
      `UPDATE os_jobs SET status='queued', run_after=NOW() WHERE job_id='e2e-1'`,
    );

    expect(await trabajador.unaVuelta()).toBe(1);

    // ── 11 · Ahora sí se ejecuta ─────────────────────────────────────────
    expect(resultadoDelPuente).toBe("ejecutado");
    expect(meta.llamadas, "el ejecutor no llegó a recibir la orden").toHaveLength(1);
    expect(meta.llamadas[0].operacion).toBe("crear_campana");

    const hecho = await pool.query(`SELECT status, result FROM os_jobs WHERE job_id='e2e-1'`);
    expect(hecho.rows[0].status).toBe("completed");
    expect(String(hecho.rows[0].result.referencia)).toContain("simulado:meta_ads");

    // ── 12 · El gasto queda descontado y con actor ───────────────────────
    const gasto = await pool.query(
      `SELECT actor, estado, importe_cents::int i FROM gastos_ejecutados WHERE workspace_id=$1`,
      [WS],
    );
    expect(gasto.rows[0].actor).toBe("agente:planificador-de-medios");
    expect(gasto.rows[0].estado).toBe("ejecutado");

    const presupuesto = await pool.query(
      `SELECT consumido_cents::int c FROM autorizaciones_de_gasto WHERE workspace_id=$1`,
      [WS],
    );
    expect(presupuesto.rows[0].c).toBe(5_000);

    // ── 13 · Y customer success no ve nada roto ──────────────────────────
    await pool.query(
      `INSERT INTO os_deliverables
         (workspace_id, client_id, project_id, title, type, status, visibility, version, delivered_at, approved_at)
       VALUES ($1, $2::uuid, $3::uuid, 'campaña lanzada', 'campana', 'approved', 'client_visible', 1, NOW(), NOW())`,
      [WS, CLI, PROYECTO],
    );

    const pendiente = await senales.deCliente(WS, CLI);
    const bloqueantes = pendiente.filter((s) => s.gravedad === "bloqueante");
    expect(
      bloqueantes.map((s) => `${s.tipo}: ${s.resumen}`),
      "quedaron señales bloqueantes al final del recorrido",
    ).toEqual([]);
  });

  it("EL CONTROL NEGATIVO: sin intake, el recorrido se para en el agente", async () => {
    // Sin este caso, el recorrido feliz podría estar pasando por casualidad:
    // un agente que arrancara con el cerebro vacío pasaría igual.
    await ciclo.pedirServicio({
      workspaceId: WS, clientId: CLI, serviceId: SERVICIO, solicitadaPor: "portal:cliente",
    });
    await pool.query(
      `INSERT INTO os_jobs (job_id, service_id, client_id, tenant_id, status, progress, steps, payload, created_at, updated_at)
       VALUES ('e2e-2', $1, $2, $3::uuid, 'queued', 0, '[]'::jsonb, '{}'::jsonb, NOW(), NOW())`,
      [SERVICIO, CLI, TENANT],
    );

    const planificador = CATALOGO.find((a) => a.id === "planificador-de-medios")!;
    let motivo = "";
    const trabajador = new TrabajadorDeCola(cola, { registrar: () => {} });
    trabajador.registrarManejador(SERVICIO, async (trabajo) => {
      const p = await prepararEjecucion(planificador, cerebro, WS, trabajo.clientId);
      if (!p.listo) {
        motivo = p.motivo;
        return { tipo: "esperandoAprobacion", motivo: p.motivo };
      }
      return { tipo: "completado", resultado: null };
    });

    await trabajador.unaVuelta();

    const j = await pool.query(`SELECT status FROM os_jobs WHERE job_id='e2e-2'`);
    expect(j.rows[0].status).toBe("waiting_approval");
    expect(motivo).toContain("plausible y equivocado");
    expect(meta.llamadas).toHaveLength(0);
  });

  it("EL CONTROL DE AISLAMIENTO: nada de este recorrido se ve desde otro workspace", async () => {
    await ciclo.pedirServicio({
      workspaceId: WS, clientId: CLI, serviceId: SERVICIO, solicitadaPor: "portal:cliente",
    });
    await ciclo.contestar({
      workspaceId: WS, clientId: CLI, quien: "portal:cliente",
      respuestas: [{ dimension: "icp", valor: { texto: "SECRETO DEL CLIENTE" } }],
    });

    const otro = await ciclo.resumen(WS + 1, CLI);
    expect(otro.solicitudes).toEqual([]);
    expect(JSON.stringify(otro)).not.toContain("SECRETO");

    const senalesDeOtro = await senales.deCliente(WS + 1, CLI);
    expect(JSON.stringify(senalesDeOtro)).not.toContain("SECRETO");
  });
});

function ejemplo(forma: string): Record<string, unknown> {
  switch (forma) {
    case "texto": return { texto: "respuesta del cliente" };
    case "lista": return { items: ["uno", "dos"] };
    case "personas": return { personas: [{ nombre: "Ana", rol: "compra" }] };
    case "competidores": return { competidores: [{ nombre: "Competidor" }] };
    case "ubicaciones": return { ubicaciones: [{ nombre: "sede", ciudad: "Valencia", pais: "ES" }] };
    case "objetivos": return { objetivos: [{ metrica: "leads", valorObjetivo: 50, plazo: "3 meses" }] };
    case "presupuesto": return { moneda: "EUR", mensualCents: 100_000 };
    case "booleano": return { valor: true };
    default: return { nota: "valor del cliente" };
  }
}
