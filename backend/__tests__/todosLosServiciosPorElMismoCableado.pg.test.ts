/**
 * TODOS LOS SERVICIOS, POR EL MISMO CABLEADO.
 *
 * LO QUE YA SE PROBABA, Y POR QUÉ NO BASTA. `agenciaCompletaDePuntaAPunta`
 * recorre el ciclo entero para UN servicio: `ads_premium`. Demuestra que los
 * eslabones encajan. No demuestra que encajen para los otros doce.
 *
 * Y ésa es exactamente la clase de suposición que ya salió cara aquí: el
 * cableado funcionaba para el camino que alguien había probado, y para los
 * demás nadie lo había mirado.
 *
 * LO QUE ESTA PRUEBA HACE, y por qué así:
 *
 *   · El inventario de servicios SALE DEL ÁRBOL —de las dimensiones que cada
 *     uno declara usar—, nunca de una lista escrita a mano. Un servicio nuevo
 *     entra solo en el barrido. Una lista a mano se queda vieja el primer día
 *     y entonces el informe dice «todos» sobre unos cuantos.
 *
 *   · Para cada uno se recorre: pedir → declarar accesos → intake → cerebro →
 *     encolar → reclamar → contrato → calidad → gasto → ejecutar → cerrar.
 *
 *   · Lo que NO se puede recorrer se dice, con el motivo. Un servicio que se
 *     salta en silencio es un servicio que nadie sabe que está roto.
 *
 * NADA DE ESTO LLAMA A UN PROVEEDOR EXTERNO. El ejecutor es un doble y el
 * modelo no se toca. Lo que se demuestra es el cableado, no el contenido — y
 * por eso el resultado se etiqueta `LOCAL_SIMULATED_EXTERNAL` y no «funciona en
 * producción».
 */
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import pg from "pg";

import { CerebroDeNegocioService } from "../cerebro/CerebroDeNegocioService";
import { DIMENSIONES, dimensionesQueAportaElCliente } from "../cerebro/dimensiones";
import { CicloDelClienteService } from "../portal/CicloDelClienteService";
import { ColaDeTrabajos } from "../queue/colaDeTrabajos";
import { CATALOGO } from "../agentes/catalogo";
import { puedeHacer } from "../agentes/contratoDeAgente";
import { GuardaDeGasto } from "../gasto/guardaDeGasto";
import { MotorDeCalidad } from "../calidad/MotorDeCalidad";
import {
  EjecutorSimulado,
  PuenteDeEjecucion,
  type RegistroDeAprobaciones,
} from "../ejecucion/PuenteDeEjecucion";

const DSN = process.env.NELVYON_COLA_CERT_DSN ?? "";
const conBase = DSN ? describe : describe.skip;

const TENANT = "dddddddd-000a-400a-800a-00000000000a";
// 993001, y no 980001: ese ya lo usa `elCerebroNoSeInventaNada.pg.test.ts`.
// Dos ficheros borrando `os_client_brain` del mismo inquilino en paralelo
// hacian que este recorrido fallara sólo en la suite completa — y un fallo
// intermitente es peor que ninguno: se aprende a reintentar en vez de mirar.
const WS = 993001;
const CLI = "aaaaaaaa-d41d-4001-8001-00000000000a";

let pool: pg.Pool;
let cerebro: CerebroDeNegocioService;
let ciclo: CicloDelClienteService;
let guarda: GuardaDeGasto;

const almacen = () => ({
  async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const r = await pool.query(sql, params);
    return r.rows as T[];
  },
  // La cola reclama dentro de una transaccion: `FOR UPDATE SKIP LOCKED` no
  // significa nada fuera de una. Sin esto no se puede probar el reclamo de
  // verdad, solo una imitacion suya.
  async withTransaction<T>(fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
    const c = await pool.connect();
    try {
      await c.query("BEGIN");
      const out = await fn(c);
      await c.query("COMMIT");
      return out;
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  },
});

/**
 * LOS SERVICIOS, DERIVADOS DEL ÁRBOL.
 *
 * Se sacan de qué servicios declara usar cada dimensión del cerebro. Es la
 * única lista que no puede quedarse vieja: si alguien añade un servicio y le
 * declara dimensiones, aparece aquí sin tocar nada.
 */
function serviciosDelArbol(): string[] {
  const vistos = new Set<string>();
  for (const dim of DIMENSIONES) {
    for (const s of dim.serviciosQueLaUsan) vistos.add(s);
  }
  return [...vistos].sort();
}

interface Recorrido {
  servicio: string;
  llego: string;
  ejecutado: boolean;
  motivoSiNo?: string;
}

conBase("todos los servicios, por el mismo cableado", () => {
  beforeAll(async () => {
    pool = new pg.Pool({ connectionString: DSN, max: 8 });
    cerebro = new CerebroDeNegocioService(almacen());
    ciclo = new CicloDelClienteService(almacen(), cerebro);
    guarda = new GuardaDeGasto(almacen());

    await pool.query(
      `INSERT INTO os_clients (id, workspace_id, created_by_user_id, business_name, sector, status)
       VALUES ($1::uuid, $2, 'e2e-multi', 'Cliente multiservicio', 'servicios', 'active')
       ON CONFLICT (id) DO NOTHING`,
      [CLI, WS],
    );
  });

  afterAll(async () => {
    await limpiar();
    await pool.query(`DELETE FROM os_clients WHERE workspace_id = $1`, [WS]);
    await pool.end();
  });

  async function limpiar(): Promise<void> {
    await pool.query(`DELETE FROM gastos_ejecutados WHERE workspace_id = $1`, [WS]);
    await pool.query(`DELETE FROM autorizaciones_de_gasto WHERE workspace_id = $1`, [WS]);
    await pool.query(`DELETE FROM os_jobs WHERE tenant_id = $1::uuid`, [TENANT]);
    await pool.query(`DELETE FROM os_client_connections WHERE workspace_id = $1`, [WS]).catch(() => undefined);
    await pool.query(`DELETE FROM os_service_requests WHERE workspace_id = $1`, [WS]).catch(() => undefined);
    await pool.query(`DELETE FROM os_client_brain WHERE workspace_id = $1`, [WS]).catch(() => undefined);
  }

  beforeEach(async () => {
    await limpiar();
    vi.stubEnv("NELVYON_GASTO_EXTERNO_HABILITADO", "1");
  });

  afterEach(() => vi.unstubAllEnvs());

  it("el inventario de servicios sale del árbol, no de una lista a mano", () => {
    const servicios = serviciosDelArbol();
    expect(servicios.length, "no se ha derivado ningún servicio del árbol").toBeGreaterThan(5);
    expect(servicios).toContain("ads_premium");
    expect(servicios).toContain("seo_premium");
  });

  it("cada servicio declara qué le tiene que aportar el cliente", () => {
    // Un servicio que no pide nada al cliente o es trivial o es un servicio que
    // trabajará a ciegas. Las dos cosas hay que verlas.
    const sinNada: string[] = [];
    for (const s of serviciosDelArbol()) {
      if (dimensionesQueAportaElCliente(s).length === 0) sinNada.push(s);
    }
    expect(sinNada, "estos servicios no piden NADA al cliente y trabajarían a ciegas").toEqual([]);
  });

  it("cada servicio declara qué accesos necesita, y para qué", async () => {
    const mudos: string[] = [];
    for (const s of serviciosDelArbol()) {
      await ciclo.pedirServicio({
        workspaceId: WS, clientId: CLI, serviceId: s,
        solicitadaPor: "e2e", motivo: `recorrido multiservicio de ${s}`,
      });
    }
    const conexiones = await ciclo.conexionesDe(WS, CLI);
    for (const c of conexiones) {
      // Pedir un acceso sin decir para qué es pedir un acto de fe.
      if (!c.paraQue || c.paraQue.trim().length < 20) mudos.push(c.proveedor);
    }
    expect(mudos, "estos accesos se piden sin explicar para qué").toEqual([]);
  });

  it(
    "TODOS los servicios recorren el cableado entero hasta ejecutar",
    async () => {
      const servicios = serviciosDelArbol();
      const recorridos: Recorrido[] = [];

      for (const servicio of servicios) {
        await limpiar();
        const r = await recorrer(servicio);
        recorridos.push(r);
      }

      const rotos = recorridos.filter((r) => !r.ejecutado);

      // El informe va al fallo para que se lea sin abrir nada.
      expect(
        rotos.map((r) => `${r.servicio}: se quedó en «${r.llego}» — ${r.motivoSiNo}`),
        `${rotos.length} de ${recorridos.length} servicios NO llegan a ejecutar. ` +
        `El cableado funciona para el camino que alguien probó y no para los demás, ` +
        `que es exactamente el fallo que este fichero existe para no repetir.`,
      ).toEqual([]);

      expect(recorridos.length).toBe(servicios.length);
    },
    300_000,
  );

  /**
   * El recorrido completo de UN servicio.
   *
   * Devuelve hasta dónde llegó en vez de lanzar: así el informe final dice qué
   * servicios fallan y en qué punto, en vez de parar en el primero.
   */
  async function recorrer(servicio: string): Promise<Recorrido> {
    const paso = (llego: string, motivo: string): Recorrido => ({
      servicio, llego, ejecutado: false, motivoSiNo: motivo,
    });

    // ── 1 · El cliente lo pide ────────────────────────────────────────────
    try {
      await ciclo.pedirServicio({
        workspaceId: WS, clientId: CLI, serviceId: servicio,
        solicitadaPor: "portal:cliente", motivo: `quiero ${servicio}`,
      });
    } catch (e) {
      return paso("pedir el servicio", (e as Error).message);
    }

    // ── 2 · El cliente contesta lo suyo ───────────────────────────────────
    //
    // POR LA MISMA PUERTA QUE USA EL PORTAL, `ciclo.contestar`, y no escribiendo
    // en el cerebro a mano. Si se escribiera directamente, esta prueba
    // demostraría que el cerebro guarda cosas —que ya está probado— en vez de
    // que el intake del portal desbloquea el trabajo, que es lo que hace falta
    // saber.
    //
    // Y sólo LO SUYO: las keywords y las audiencias las deduce NELVYON. Pedirle
    // al cliente lo que debemos deducir nosotros es el intake interminable que
    // hace que nadie lo termine.
    try {
      const suyas = dimensionesQueAportaElCliente(servicio);
      await ciclo.contestar({
        workspaceId: WS,
        clientId: CLI,
        quien: "portal:cliente",
        respuestas: suyas.map((d) => ({ dimension: d.id, valor: ejemplo(d.forma) })),
      });
    } catch (e) {
      return paso("contestar el intake", (e as Error).message);
    }

    // ── 3 · ¿Se puede operar? ─────────────────────────────────────────────
    const completitud = await cerebro.completitud(WS, CLI);
    if (!completitud.listoParaOperar) {
      return paso(
        "el cerebro dice que no se puede operar",
        `faltan: ${completitud.huecos.filter((h) => h.imprescindible).map((h) => h.dimension).join(", ")}`,
      );
    }

    // ── 4 · Entra un trabajo y alguien lo reclama ─────────────────────────
    const cola = new ColaDeTrabajos(almacen(), {
      serviciosQueAtiende: [servicio],
      identidad: "e2e-multiservicio",
    });
    const jobId = `multi-${servicio}`;
    try {
      await pool.query(
        `INSERT INTO os_jobs (job_id, service_id, client_id, tenant_id, status,
                              progress, steps, payload, created_at, updated_at)
         VALUES ($1, $2, $3::uuid, $4::uuid, 'queued', 0, '[]'::jsonb,
                 '{"objetivo":"recorrido multiservicio"}'::jsonb, NOW(), NOW())`,
        [jobId, servicio, CLI, TENANT],
      );
    } catch (e) {
      return paso("encolar", (e as Error).message);
    }

    // `reclamar` devuelve una LISTA: la cola está pensada para que un
    // trabajador se lleve varios de una vez. Pedir uno y esperar un objeto es
    // el tipo de suposición sobre una API ajena que compila y luego falla.
    const reclamados = await cola.reclamar(1);
    if (reclamados.length === 0 || reclamados[0].jobId !== jobId) {
      return paso("reclamar de la cola", "nadie pudo reclamar el trabajo recién encolado");
    }

    // ── 5 · Un agente con contrato lo puede hacer ─────────────────────────
    //
    // Se busca un agente que PUEDA gastar. Si ninguno del catálogo puede, no es
    // un fallo del cableado: es que a este servicio le falta agente, y eso hay
    // que decirlo con esas palabras.
    const agente = CATALOGO.find((a) => puedeHacer(a, ["gasta_dinero"]).permitido);
    if (!agente) {
      return paso("encontrar agente", "ningún contrato del catálogo puede gastar dinero");
    }

    // ── 6 · Autorización de gasto ─────────────────────────────────────────
    await pool.query(
      `INSERT INTO autorizaciones_de_gasto
         (tenant_id, workspace_id, service_id, proveedor, presupuesto_cents,
          tope_por_operacion_cents, vigente_hasta, estado, solicitada_por,
          aprobada_por, aprobada_en)
       VALUES ($1::uuid, $2, $3, 'meta_ads', 100000, 20000,
               NOW() + interval '30 days', 'aprobada', 'cliente', 'daniel', NOW())`,
      [TENANT, WS, servicio],
    );

    // ── 7 · Calidad y ejecución ───────────────────────────────────────────
    const ejecutor = new EjecutorSimulado("meta_ads");
    const aprobaciones: RegistroDeAprobaciones = {
      async estaAprobada() {
        // Se dan por aprobadas las que exigen persona: lo que se está probando
        // es el CABLEADO, no la política de aprobación —que tiene sus propias
        // pruebas y se comprueba allí a conciencia.
        return true;
      },
      async solicitar() {},
    };
    const puente = new PuenteDeEjecucion(guarda, aprobaciones, () => {}, new MotorDeCalidad());
    puente.registrarEjecutor(ejecutor);

    const resultado = await puente.cruzar(agente, {
      ejecutor: "meta_ads",
      operacion: "crear_campana",
      consecuencias: ["gasta_dinero"],
      argumentos: { servicio },
      pieza: {
        dominio: "ads",
        autor: agente.id,
        contenido: {
          urlDestino: "https://cliente-real.es/aterrizaje",
          presupuestoDiarioCents: 5_000,
          negativas: ["gratis", "empleo"],
        },
      },
      tenantId: TENANT,
      workspaceId: WS,
      serviceId: servicio,
      clientId: CLI,
      importeCents: 5_000,
      idempotencyKey: `multi:${servicio}:${jobId}`,
    });

    if (resultado.estado !== "ejecutado") {
      return paso(
        "cruzar el puente",
        resultado.estado === "denegado"
          ? `denegado en la puerta «${resultado.puerta}»: ${resultado.motivo}`
          : `estado ${resultado.estado}`,
      );
    }

    // ── 8 · El trabajo se cierra ──────────────────────────────────────────
    await cola.completar(jobId, { referencia: resultado.referenciaExterna }, 0);
    const { rows } = await pool.query<{ status: string }>(
      `SELECT status FROM os_jobs WHERE job_id = $1`,
      [jobId],
    );
    if (rows[0]?.status !== "completed") {
      return paso("cerrar el trabajo", `quedó en ${rows[0]?.status ?? "sin fila"}`);
    }

    return { servicio, llego: "ejecutado y cerrado", ejecutado: true };
  }
});

/**
 * Un valor válido para cada forma de dimensión.
 *
 * Las formas salen del catálogo del cerebro, así que si alguien añade una forma
 * nueva y no la pone aquí, el `default` produce un valor que `validarForma`
 * rechaza — y el servicio aparece en el informe como roto. Es lo correcto: una
 * forma sin ejemplo es una forma que nadie ha probado.
 */
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
