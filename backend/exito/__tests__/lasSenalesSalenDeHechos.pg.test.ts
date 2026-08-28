/**
 * LAS SEÑALES SALEN DE HECHOS, NO DE CORAZONADAS.
 *
 * Customer Success es el único departamento que el diagnóstico encontró
 * REALMENTE ausente, y su ausencia tiene una consecuencia medida: producción
 * dejó de producir el 22 de julio y nadie se enteró hasta que alguien miró la
 * base en agosto.
 *
 * Un detector así falla de dos maneras opuestas, y las dos son caras:
 *
 *   - **No salta cuando debe.** Es lo que pasó: doce trabajos parados desde
 *     junio y ninguna alerta.
 *   - **Salta demasiado.** Una alerta que salta por todo deja de leerse, y un
 *     detector que nadie lee es peor que ninguno.
 *
 * Cada prueba de aquí abajo tiene su control opuesto por eso: no basta con
 * demostrar que la señal aparece; hay que demostrar que NO aparece cuando no
 * toca.
 *
 * Contra PostgreSQL real porque las señales se calculan con consultas, y una
 * consulta contra una tabla o un estado que no existe devuelve cero siempre
 * — que es exactamente el fallo silencioso que hay que impedir.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import pg from "pg";

import { CerebroDeNegocioService } from "../../cerebro/CerebroDeNegocioService";
import { CicloDelClienteService } from "../../portal/CicloDelClienteService";
import { dimensionesImprescindibles } from "../../cerebro/dimensiones";
import { SenalesDeCliente, UMBRALES, ordenarPorUrgencia, recuento, type Senal } from "../SenalesDeCliente";

const DSN = process.env.NELVYON_COLA_CERT_DSN ?? "";
const conBase = DSN ? describe : describe.skip;

const WS = 960001;
const WS_OTRO = 960002;
const CLI = "aaaaaaaa-5e5a-4001-8001-000000000001";
const PROYECTO = "aaaaaaaa-5e5a-4002-8002-000000000002";

let pool: pg.Pool;
let senales: SenalesDeCliente;
let ciclo: CicloDelClienteService;
let cerebro: CerebroDeNegocioService;

function almacen() {
  return {
    async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
      const r = await pool.query(sql, params);
      return r.rows as T[];
    },
  };
}

async function limpiar(): Promise<void> {
  for (const t of [
    "os_client_connections",
    "os_service_requests",
    "os_client_brain_history",
    "os_client_brain",
    "os_deliverables",
  ]) {
    await pool.query(`DELETE FROM ${t} WHERE workspace_id = ANY($1)`, [[WS, WS_OTRO]]);
  }
  await pool.query(`DELETE FROM os_jobs WHERE client_id = $1`, [CLI]);
}

/** Antigüedad artificial: la mayoría de las señales dependen del tiempo. */
async function envejecerSolicitud(dias: number): Promise<void> {
  await pool.query(
    `UPDATE os_service_requests SET created_at = NOW() - ($3::int || ' days')::interval
      WHERE workspace_id = $1 AND client_id = $2`,
    [WS, CLI, dias],
  );
}

async function aceptarServicio(): Promise<void> {
  await pool.query(
    `UPDATE os_service_requests SET estado = 'aceptado', decidida_en = NOW()
      WHERE workspace_id = $1 AND client_id = $2`,
    [WS, CLI],
  );
}

async function completarCerebro(): Promise<void> {
  for (const d of dimensionesImprescindibles()) {
    await cerebro.escribir({
      workspaceId: WS,
      clientId: CLI,
      dimension: d.id,
      valor: ejemplo(d.forma),
      procedencia: "cliente_intake",
      origen: "prueba",
    });
  }
}

async function conectarTodo(): Promise<void> {
  await pool.query(
    `UPDATE os_client_connections SET estado = 'conectada', conectada_en = NOW()
      WHERE workspace_id = $1 AND client_id = $2`,
    [WS, CLI],
  );
}

function tipos(s: Senal[]): string[] {
  return s.map((x) => x.tipo);
}

conBase("las señales de cliente", () => {
  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: DSN, max: 8 });
    const { rows } = await pool.query(`SELECT to_regclass('public.os_deliverables') t`);
    if (!rows[0].t) throw new Error("falta os_deliverables en la base de pruebas");
    cerebro = new CerebroDeNegocioService(almacen());
    ciclo = new CicloDelClienteService(almacen(), cerebro);
    senales = new SenalesDeCliente(almacen(), cerebro, ciclo);

    // `os_deliverables` tiene claves ajenas a `os_clients` y `os_projects`.
    // Sembrar sin ellas seria escribir contra una forma que no existe, que es
    // el mismo error que buscar una tabla `pack_deliverables` inventada.
    await pool.query(
      `INSERT INTO os_clients (id, workspace_id, created_by_user_id, business_name, sector, status)
       VALUES ($1::uuid, $2, 'cert', 'Cliente de prueba', 'dental', 'active')
       ON CONFLICT (id) DO NOTHING`,
      [CLI, WS],
    );
    await pool.query(
      `INSERT INTO os_projects (id, workspace_id, client_id, name, status, priority, metadata)
       VALUES ($1::uuid, $2, $3::uuid, 'proyecto de prueba', 'active', 'medium', '{}'::jsonb)
       ON CONFLICT (id) DO NOTHING`,
      [PROYECTO, WS, CLI],
    );
  });

  afterAll(async () => {
    await limpiar();
    await pool.end();
  });

  beforeEach(limpiar);

  // ═════════════════════════════════════════════════════════════════════════
  describe("no salta cuando no toca", () => {
    it("un cliente sin nada no produce ninguna señal", async () => {
      expect(await senales.deCliente(WS, CLI)).toEqual([]);
    });

    it("un cliente que aún no ha pedido nada no tiene onboarding pendiente", async () => {
      // Perseguir a alguien que no ha dicho que sí es perseguir a quien no es
      // cliente todavía.
      await cerebro.escribir({
        workspaceId: WS, clientId: CLI, dimension: "sector",
        valor: { texto: "dental" }, procedencia: "cliente_intake", origen: "p",
      });
      expect(tipos(await senales.deCliente(WS, CLI))).not.toContain("onboarding_incompleto");
    });

    it("un onboarding de HOY no dispara nada", async () => {
      // Un cliente que lleva tres días sin contestar está ocupado, no en fuga.
      await ciclo.pedirServicio({
        workspaceId: WS, clientId: CLI, serviceId: "seo_premium", solicitadaPor: "u",
      });
      expect(tipos(await senales.deCliente(WS, CLI))).not.toContain("onboarding_incompleto");
    });

    it("EL CONTROL COMPLETO: todo en orden, cero señales", async () => {
      // Sin este caso, un detector que emitiera siempre pasaría todas las
      // pruebas de "sí salta" y ninguna lo delataría.
      await ciclo.pedirServicio({
        workspaceId: WS, clientId: CLI, serviceId: "seo_premium", solicitadaPor: "u",
      });
      await envejecerSolicitud(60);
      await aceptarServicio();
      await completarCerebro();
      await conectarTodo();
      await sembrarEntregable("approved");

      expect(await senales.deCliente(WS, CLI)).toEqual([]);
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe("salta cuando debe", () => {
    it("onboarding sin terminar tras el umbral", async () => {
      await ciclo.pedirServicio({
        workspaceId: WS, clientId: CLI, serviceId: "seo_premium", solicitadaPor: "u",
      });
      await envejecerSolicitud(UMBRALES.onboardingIncompleto + 2);

      const s = await senales.deCliente(WS, CLI);
      const onboarding = s.find((x) => x.tipo === "onboarding_incompleto");
      expect(onboarding).toBeDefined();
      expect(onboarding!.diasAsi).toBeGreaterThanOrEqual(UMBRALES.onboardingIncompleto);
      // La evidencia dice QUÉ falta, no sólo que falta algo.
      expect(Array.isArray(onboarding!.evidencia.dimensiones)).toBe(true);
      expect((onboarding!.evidencia.dimensiones as string[]).length).toBeGreaterThan(0);
    });

    it("con servicio aceptado, el onboarding incompleto es BLOQUEANTE", async () => {
      // Un cliente que ya ha dicho que sí y no recibe nada no es "atención":
      // es alguien esperando algo por lo que va a pagar.
      await ciclo.pedirServicio({
        workspaceId: WS, clientId: CLI, serviceId: "seo_premium", solicitadaPor: "u",
      });
      await envejecerSolicitud(UMBRALES.onboardingIncompleto + 2);
      await aceptarServicio();

      const s = await senales.deCliente(WS, CLI);
      expect(s.find((x) => x.tipo === "onboarding_incompleto")?.gravedad).toBe("bloqueante");
    });

    it("cuentas sin conectar, y dice qué servicios bloquean", async () => {
      await ciclo.pedirServicio({
        workspaceId: WS, clientId: CLI, serviceId: "seo_premium", solicitadaPor: "u",
      });
      await aceptarServicio();

      const s = await senales.deCliente(WS, CLI);
      const cx = s.find((x) => x.tipo === "conexiones_pendientes");
      expect(cx?.gravedad).toBe("bloqueante");
      expect(cx!.evidencia.serviciosBloqueados).toEqual(["seo_premium"]);
    });

    it("LA SEÑAL DEL 22 DE JULIO: servicio aceptado sin un solo entregable", async () => {
      // Ésta es la que no existía. Doce trabajos parados desde junio y ninguna
      // alerta hasta que alguien miró la base en agosto.
      await ciclo.pedirServicio({
        workspaceId: WS, clientId: CLI, serviceId: "seo_premium", solicitadaPor: "u",
      });
      await envejecerSolicitud(UMBRALES.sinEntregables + 5);
      await aceptarServicio();
      await completarCerebro();
      await conectarTodo();

      const s = await senales.deCliente(WS, CLI);
      const sin = s.find((x) => x.tipo === "sin_entregables");
      expect(sin, "no detectó un servicio aceptado que no ha producido nada").toBeDefined();
      expect(sin!.gravedad).toBe("bloqueante");
      expect(sin!.evidencia.entregables).toBe(0);
      expect(sin!.accionSugerida).toContain("cola");
    });

    it("con un entregable, esa señal desaparece", async () => {
      await ciclo.pedirServicio({
        workspaceId: WS, clientId: CLI, serviceId: "seo_premium", solicitadaPor: "u",
      });
      await envejecerSolicitud(UMBRALES.sinEntregables + 5);
      await aceptarServicio();
      await completarCerebro();
      await conectarTodo();
      await sembrarEntregable("approved");

      expect(tipos(await senales.deCliente(WS, CLI))).not.toContain("sin_entregables");
    });

    it("aprobación esperando al cliente demasiado tiempo", async () => {
      await sembrarEntregable("delivered", UMBRALES.aprobacionAtrasada + 3);
      const s = await senales.deCliente(WS, CLI);
      const ap = s.find((x) => x.tipo === "aprobacion_atrasada");
      expect(ap).toBeDefined();
      expect(ap!.gravedad).toBe("atencion");
      expect(ap!.accionSugerida).toContain("falta información");
    });

    it("un entregable YA aprobado no cuenta como pendiente", async () => {
      await sembrarEntregable("delivered", UMBRALES.aprobacionAtrasada + 3, { aprobado: true });
      expect(tipos(await senales.deCliente(WS, CLI))).not.toContain("aprobacion_atrasada");
    });

    it("un entregable INTERNO tampoco: el cliente no lo ve", async () => {
      // Reclamarle a un cliente que apruebe algo que ni siquiera puede ver es
      // la clase de alerta que hace que deje de leerlas.
      await sembrarEntregable("delivered", UMBRALES.aprobacionAtrasada + 3, { interno: true });
      expect(tipos(await senales.deCliente(WS, CLI))).not.toContain("aprobacion_atrasada");
    });

    it("trabajos en dead_letter: NELVYON se rindió y nadie lo sabe", async () => {
      await pool.query(
        `INSERT INTO os_jobs (job_id, service_id, client_id, status, progress, steps, payload, created_at, updated_at)
         VALUES ('senal-dl', 'seo_premium', $1, 'dead_letter', 0, '[]'::jsonb, '{}'::jsonb, NOW(), NOW())`,
        [CLI],
      );
      const s = await senales.deCliente(WS, CLI);
      const bl = s.find((x) => x.tipo === "servicio_bloqueado");
      expect(bl?.gravedad).toBe("bloqueante");
      expect(bl!.accionSugerida).toContain("Diagnosticar");
    });

    it("un trabajo esperando aprobación es atención, no bloqueo", async () => {
      await pool.query(
        `INSERT INTO os_jobs (job_id, service_id, client_id, status, progress, steps, payload, created_at, updated_at)
         VALUES ('senal-wa', 'seo_premium', $1, 'waiting_approval', 0, '[]'::jsonb, '{}'::jsonb, NOW(), NOW())`,
        [CLI],
      );
      const s = await senales.deCliente(WS, CLI);
      expect(s.find((x) => x.tipo === "servicio_bloqueado")?.gravedad).toBe("atencion");
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe("cada señal se sostiene sola", () => {
    it("todas traen resumen, evidencia y acción", async () => {
      await ciclo.pedirServicio({
        workspaceId: WS, clientId: CLI, serviceId: "ads_premium", solicitadaPor: "u",
      });
      await envejecerSolicitud(UMBRALES.sinEntregables + 10);
      await aceptarServicio();

      const s = await senales.deCliente(WS, CLI);
      expect(s.length).toBeGreaterThan(0);
      for (const x of s) {
        expect(x.resumen.trim().length, x.tipo).toBeGreaterThan(15);
        expect(Object.keys(x.evidencia).length, x.tipo).toBeGreaterThan(0);
        expect(x.accionSugerida.trim().length, x.tipo).toBeGreaterThan(20);
        expect(x.workspaceId).toBe(WS);
        expect(x.clientId).toBe(CLI);
      }
    });

    it("ninguna acción sugerida es un envío automático", async () => {
      // Un detector que además envía es un detector que no se puede ejecutar
      // en seco, y que un día manda un correo que nadie ha revisado.
      await ciclo.pedirServicio({
        workspaceId: WS, clientId: CLI, serviceId: "ads_premium", solicitadaPor: "u",
      });
      await envejecerSolicitud(30);
      await aceptarServicio();

      for (const x of await senales.deCliente(WS, CLI)) {
        expect(x.accionSugerida.toLowerCase(), x.tipo).not.toMatch(/enviar autom|mandar autom/);
      }
    });

    it("lo bloqueante va primero, y dentro de eso lo más antiguo", () => {
      const desordenadas: Senal[] = [
        senal("informativa", 1),
        senal("bloqueante", 3),
        senal("atencion", 40),
        senal("bloqueante", 20),
      ];
      const o = ordenarPorUrgencia(desordenadas);
      expect(o.map((s) => s.gravedad)).toEqual([
        "bloqueante", "bloqueante", "atencion", "informativa",
      ]);
      expect(o[0].diasAsi).toBe(20);
      expect(recuento(o)).toEqual({ bloqueante: 2, atencion: 1, informativa: 1 });
    });
  });

  // ═════════════════════════════════════════════════════════════════════════
  describe("no se mezclan clientes", () => {
    it("las señales de un workspace no aparecen en otro", async () => {
      await ciclo.pedirServicio({
        workspaceId: WS, clientId: CLI, serviceId: "seo_premium", solicitadaPor: "u",
      });
      await envejecerSolicitud(30);
      await aceptarServicio();

      expect(await senales.deCliente(WS_OTRO, CLI)).toEqual([]);
    });

    it("el barrido de un workspace sólo mira sus clientes", async () => {
      const s = await senales.deWorkspace(WS_OTRO);
      for (const x of s) expect(x.workspaceId).toBe(WS_OTRO);
    });
  });
});

// ── Utilidades ──────────────────────────────────────────────────────────────

async function sembrarEntregable(
  estado: string,
  diasAtras = 0,
  opciones: { aprobado?: boolean; interno?: boolean } = {},
): Promise<void> {
  await pool.query(
    `INSERT INTO os_deliverables
       (workspace_id, client_id, project_id, title, type, status, visibility, version,
        delivered_at, approved_at, created_at, updated_at)
     VALUES ($1::int, $2::uuid, $7::uuid, 'entregable de prueba', 'informe', $3, $4, 1,
             NOW() - ($5::int || ' days')::interval,
             $6::timestamptz,
             NOW() - ($5::int || ' days')::interval,
             NOW())`,
    [
      WS,
      CLI,
      estado,
      opciones.interno ? "internal" : "client_visible",
      diasAtras,
      opciones.aprobado ? new Date().toISOString() : null,
      PROYECTO,
    ],
  );
}

function senal(gravedad: Senal["gravedad"], diasAsi: number): Senal {
  return {
    tipo: "onboarding_incompleto",
    gravedad,
    workspaceId: WS,
    clientId: CLI,
    resumen: "x".repeat(20),
    evidencia: { x: 1 },
    accionSugerida: "y".repeat(25),
    diasAsi,
  };
}

function ejemplo(forma: string): Record<string, unknown> {
  switch (forma) {
    case "texto": return { texto: "valor" };
    case "lista": return { items: ["a"] };
    case "objetivos": return { objetivos: [{ metrica: "leads" }] };
    case "mapa": return { k: 1 };
    default: return { k: 1 };
  }
}
