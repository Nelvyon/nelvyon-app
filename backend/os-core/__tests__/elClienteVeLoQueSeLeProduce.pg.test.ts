/**
 * El trabajo terminado aparece en la lista de entregables del cliente.
 *
 * ── EL HUECO QUE CIERRA ─────────────────────────────────────────────────────
 *
 * Medido en todo el repositorio: `os_deliverables` sólo se ESCRIBÍA desde
 * ficheros de prueba. Producción no insertaba ni una fila. Todas las
 * referencias del portal, del autopilot en Python y de `SenalesDeCliente` son
 * SELECT.
 *
 * Dos mundos que nunca se tocaron: `os_clients → os_projects → os_deliverables`
 * lo llenaba el backfill de datos antiguos, y `os_jobs` lo llenaba el
 * trabajador. Ningún puente.
 *
 * El cliente no veía NUNCA lo que se le producía. Y `SenalesDeCliente` levanta
 * `sin_entregables` —gravedad bloqueante— cuando un cliente con servicio
 * aceptado no tiene ni una fila, así que esa señal saltaba para todos, siempre.
 * El sistema tenía razón, y por el motivo equivocado.
 *
 * ── POR QUÉ CONTRA POSTGRESQL DE VERDAD ─────────────────────────────────────
 *
 * `os_deliverables.project_id` es NOT NULL con clave foránea a `os_projects`, y
 * `client_id` la tiene a `os_clients`. Un doble en memoria diría que todo
 * funciona y la primera inserción real fallaría. Lo que se comprueba aquí es
 * justo que las restricciones se cumplen.
 *
 * COSTE EXTERNO: 0 EUR. Base local.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";

import { registrarEntregable } from "../registrarEntregable";

const DSN =
  process.env.NELVYON_COLA_CERT_DSN ??
  process.env.NELVYON_WEB_CERT_DSN ??
  process.env.DATABASE_URL ??
  "";

const hayBase = DSN.length > 0;
const suite = hayBase ? describe : describe.skip;

const WS = 940404;
let cliente: Client;
let clientId = "";

/** Conexión con la forma que espera el módulo. */
const db = {
  async query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    const r = await cliente.query(sql, params as never[]);
    return r.rows as T[];
  },
};

suite("el cliente ve lo que se le produce", () => {
  beforeAll(async () => {
    cliente = new Client({ connectionString: DSN });
    await cliente.connect();
    await limpiar();
    const r = await cliente.query(
      `INSERT INTO os_clients (workspace_id, created_by_user_id, business_name, status)
       VALUES ($1, 'certificacion-local', 'Clinica de prueba', 'active') RETURNING id`,
      [WS],
    );
    clientId = r.rows[0].id as string;
  });

  afterAll(async () => {
    await limpiar();
    await cliente.end();
  });

  async function limpiar() {
    await cliente.query(`DELETE FROM os_deliverables WHERE workspace_id = $1`, [WS]);
    await cliente.query(`DELETE FROM os_projects WHERE workspace_id = $1`, [WS]);
    await cliente.query(`DELETE FROM os_clients WHERE workspace_id = $1`, [WS]);
  }

  it("LA REGLA: una entrega crea la fila que el portal lee", async () => {
    const r = await registrarEntregable({
      clientId,
      serviceId: "seo_premium",
      jobId: "job-pg-1",
      titulo: "Auditoría SEO de septiembre",
      db,
    });

    expect(r.registrado, "no se registró el entregable").toBe(true);

    const filas = await cliente.query(
      `SELECT title, status, visibility, type, metadata FROM os_deliverables
        WHERE workspace_id = $1`,
      [WS],
    );
    expect(filas.rowCount).toBe(1);
    expect(filas.rows[0].title).toBe("Auditoría SEO de septiembre");
    expect(filas.rows[0].type).toBe("seo_premium");
  });

  it("LA DECISIÓN QUE MÁS IMPORTA: NO es visible para el cliente todavía", async () => {
    // Enseñarle una pieza en el momento en que se produce se saltaría la puerta
    // de aprobación por la puerta de atrás. Que exista y que la vea son dos
    // decisiones distintas, y sólo la primera es automática.
    const filas = await cliente.query(
      `SELECT visibility, status FROM os_deliverables WHERE workspace_id = $1`,
      [WS],
    );
    expect(filas.rows[0].visibility).toBe("internal");
    expect(filas.rows[0].status, "se dio por entregado sin que nadie lo mirara").toBe("in_review");
  });

  it("crea un proyecto sólo si el cliente no tenía ninguno", async () => {
    const proyectos = await cliente.query(
      `SELECT id, name FROM os_projects WHERE workspace_id = $1`,
      [WS],
    );
    expect(proyectos.rowCount, "creó más de un proyecto").toBe(1);
  });

  it("una SEGUNDA entrega reutiliza el proyecto, no crea otro", async () => {
    // Crear uno por entrega llenaría el portal de proyectos vacíos.
    const r = await registrarEntregable({
      clientId,
      serviceId: "ads_premium",
      jobId: "job-pg-2",
      titulo: "Plan de campañas",
      db,
    });
    expect(r.registrado).toBe(true);
    expect((r as { proyectoCreado: boolean }).proyectoCreado).toBe(false);

    const proyectos = await cliente.query(
      `SELECT COUNT(*)::int AS n FROM os_projects WHERE workspace_id = $1`,
      [WS],
    );
    expect(proyectos.rows[0].n).toBe(1);
  });

  it("IDEMPOTENTE: reintentar el mismo trabajo no duplica el entregable", async () => {
    // Un trabajo puede reintentarse. Contar dos veces lo mismo es como se
    // construye un informe que miente.
    const antes = await cliente.query(
      `SELECT COUNT(*)::int AS n FROM os_deliverables WHERE workspace_id = $1`,
      [WS],
    );

    const r = await registrarEntregable({
      clientId,
      serviceId: "seo_premium",
      jobId: "job-pg-1",
      titulo: "Auditoría SEO de septiembre (reintento)",
      db,
    });
    expect(r.registrado).toBe(true);

    const despues = await cliente.query(
      `SELECT COUNT(*)::int AS n FROM os_deliverables WHERE workspace_id = $1`,
      [WS],
    );
    expect(despues.rows[0].n, "un reintento duplicó el trabajo del cliente").toBe(
      antes.rows[0].n,
    );
  });

  it("NO inventa un sitio para un cliente que no consta", async () => {
    // Meter un entregable en el workspace equivocado se lo enseña a otro
    // cliente. Es el fallo que no se arregla pidiendo perdón.
    const r = await registrarEntregable({
      clientId: "00000000-0000-4000-8000-000000000999",
      serviceId: "seo_premium",
      jobId: "job-pg-3",
      titulo: "No debería existir",
      db,
    });

    expect(r.registrado).toBe(false);
    const filas = await cliente.query(
      `SELECT COUNT(*)::int AS n FROM os_deliverables WHERE title = 'No debería existir'`,
    );
    expect(filas.rows[0].n).toBe(0);
  });

  it("EL ACOPLAMIENTO: el estado de entrada es uno del que la máquina sabe salir", async () => {
    // La máquina de estados vive en Python —`os_deliverables_service`— y va
    // draft → in_review → delivered → approved → published (client_visible).
    //
    // Este módulo crea en `in_review` justamente porque `deliver` acepta ese
    // estado de partida. Si alguien cambiara la creación a `draft` o inventara
    // otro, el entregable entraría en un estado del que nadie sabe sacarlo y se
    // quedaría ahí para siempre — que es exactamente el callejón que ya hubo que
    // cerrar en `waiting_approval`.
    //
    // Los dos lados no se conocen: nada más ata este acoplamiento.
    const fs = await import("node:fs");
    const path = await import("node:path");
    const maquina = fs.readFileSync(
      path.resolve(__dirname, "../../services/os_deliverables_service.py"),
      "utf8",
    );

    const filas = await cliente.query(
      `SELECT DISTINCT status FROM os_deliverables WHERE workspace_id = $1`,
      [WS],
    );
    expect(filas.rowCount).toBeGreaterThan(0);

    for (const f of filas.rows) {
      const estado = f.status as string;
      expect(
        maquina.includes(`allowed_from=frozenset({"${estado}"`)
          || maquina.includes(`"${estado}", `)
          || maquina.includes(`, "${estado}"`),
        `se crea en «${estado}» y la máquina de estados no sabe salir de ahí`,
      ).toBe(true);
    }
  });

  it("y la señal `sin_entregables` deja de saltar cuando hay trabajo", async () => {
    // Es la consecuencia que se buscaba: la señal tenía razón por el motivo
    // equivocado, y ahora mide lo que dice medir.
    const filas = await cliente.query(
      `SELECT COUNT(*)::int AS n FROM os_deliverables
        WHERE workspace_id = $1 AND client_id = $2 AND archived_at IS NULL`,
      [WS, clientId],
    );
    expect(filas.rows[0].n).toBeGreaterThan(0);
  });
});
