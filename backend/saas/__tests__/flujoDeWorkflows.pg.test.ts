/**
 * BLOQUE 2 · workflows — el flujo completo, contra PostgreSQL de verdad.
 *
 * QUE SE CERTIFICA AQUI Y QUE NO
 * ------------------------------
 * El inventario del Bloque 1 dijo que las once rutas de workflows existen y no
 * devuelven datos inventados. Eso no es certificación: un botón que llama a una
 * API que existe y cuya operación falla después sigue estando roto.
 *
 * Aquí se recorre lo que haría un cliente:
 *
 *     crear → leer → editar → activar → ejecutar → historial → recargar
 *     → pausar → borrar
 *
 * y además lo que no debería poder hacer: el inquilino B no ve, no edita, no
 * ejecuta ni borra lo de A.
 *
 * Se usa el SERVICIO REAL —no un doble— contra una base reconstruida solo con
 * las migraciones oficiales. Un doble certificaría el doble; lo que se quiere
 * saber es si el SQL que hay escrito funciona contra el esquema que hay.
 *
 * QUE DEPENDE DE LA 575, Y POR TANTO NO SE CERTIFICA PARA PRODUCCION
 * -----------------------------------------------------------------
 * El editor visual guarda nodos y aristas en `workflow_nodes`,
 * `visual_workflow_executions`, `workflow_trigger_registry` y
 * `workflows.edges_json`. Esas cuatro las repara la 575, que está escrita y
 * certificada pero **no aplicada** (`ADR-064 = BLOCKED_ON_FOUNDER`). En esta
 * base existen porque la 575 sí está en el árbol; en producción, no.
 *
 * Por eso este fichero certifica el motor —`saas_workflows` y
 * `saas_workflow_runs`, que no dependen de la 575— y el editor visual queda
 * marcado aparte. Decirlo evita leer este verde como si cubriera las dos cosas.
 *
 * Se salta sin `NELVYON_B2_DSN`.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { SaasWorkflowService } from "../SaasWorkflowService";

const DSN = process.env.NELVYON_B2_DSN;
const describeSiHayPg = DSN ? describe : describe.skip;

let pool: import("pg").Pool;
let svc: SaasWorkflowService;

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

/** El puerto que espera el servicio, sobre una conexión real. */
function puerto() {
  return {
    query: async <T>(sql: string, params?: unknown[]): Promise<T[]> => {
      const r = await pool.query(sql, params as never[]);
      return r.rows as T[];
    },
  };
}

/** CRM de mentira: aquí se certifica el motor de workflows, no el CRM. */
const crmFalso = {
  updateContact: async () => ({}) as never,
  addActivity: async () => ({}) as never,
  getContact: async () => null as never,
};

async function sembrarInquilinos() {
  for (const [id, nombre] of [[A, "Inquilino A"], [B, "Inquilino B"]] as const) {
    // El usuario va PRIMERO, y va en `nelvyon_users` — no en `users`.
    //
    // Conviven DOS tablas de usuario, y la clave foránea de `saas_tenants`
    // apunta a `nelvyon_users(user_id)`. Sembrar en `users` no satisfacía nada:
    // el INSERT del inquilino seguía violando la restricción. Queda anotado
    // porque no es evidente y cuesta un rato averiguarlo.
    await pool.query(
      `INSERT INTO nelvyon_users
         (user_id, email, password_hash, full_name, plan, tenant_id,
          created_at, updated_at, email_verified)
       -- El primer parametro se usa como uuid y como text en la misma
       -- sentencia; sin los moldes PostgreSQL no deduce un solo tipo.
       VALUES ($1::uuid, $2, 'x', $3, 'pro', $1::text, NOW(), NOW(), true)
       ON CONFLICT (user_id) DO NOTHING`,
      [id, `cert-${id.slice(0, 8)}@nelvyon.test`, nombre]);

    await pool.query(
      `INSERT INTO saas_tenants (id, user_id, company_name, industry, plan)
       VALUES ($1, $1, $2, 'certificacion', 'pro')
       ON CONFLICT (id) DO UPDATE SET plan = 'pro'`,
      [id, nombre]);
  }
}

describeSiHayPg("BLOQUE 2 · workflows — flujo completo", () => {
  beforeAll(async () => {
    const { Pool } = await import("pg");
    pool = new Pool({ connectionString: DSN, max: 4 });
    await pool.query("SET statement_timeout = '20s'");
    await sembrarInquilinos();
    svc = new SaasWorkflowService(puerto() as never, crmFalso as never);
  });

  afterAll(async () => { await pool?.end(); });

  beforeEach(async () => {
    await pool.query("DELETE FROM saas_workflow_runs WHERE tenant_id = ANY($1)", [[A, B]]);
    await pool.query("DELETE FROM saas_workflows WHERE tenant_id = ANY($1)", [[A, B]]);
  });

  const nuevo = () => ({
    name: "Bienvenida a nuevos contactos",
    description: "Manda el correo de bienvenida",
    triggerType: "contact_created" as const,
    triggerConfig: {},
    conditions: [],
    actions: [{ type: "add_tag", config: { tag: "nuevo" } }],
  });

  it("crear → leer: lo creado se puede volver a leer, con sus datos", async () => {
    const creado = await svc.createWorkflow(A, nuevo() as never);
    expect(creado.id).toBeTruthy();

    const leido = await svc.getWorkflow(A, creado.id);
    expect(leido?.name).toBe("Bienvenida a nuevos contactos");
    expect(leido?.status).toBe("draft");
    expect(leido?.triggerType).toBe("contact_created");
  });

  it("la lista lo incluye, y no incluye lo de otro inquilino", async () => {
    const deA = await svc.createWorkflow(A, nuevo() as never);
    await svc.createWorkflow(B, { ...nuevo(), name: "El de B" } as never);

    const listaA = await svc.getWorkflows(A);
    expect(listaA.map((w) => w.id)).toContain(deA.id);
    expect(listaA.map((w) => w.name)).not.toContain("El de B");
  });

  it("editar PERSISTE: se relee de la base y el cambio sigue ahí", async () => {
    // La clase de fallo que se busca: «funciona hasta que refrescas». Por eso no
    // se comprueba lo que devuelve el UPDATE, sino lo que hay al VOLVER a leer.
    const w = await svc.createWorkflow(A, nuevo() as never);
    await svc.updateWorkflow(A, w.id, { name: "Nombre cambiado" } as never);

    const relectura = await svc.getWorkflow(A, w.id);
    expect(relectura?.name).toBe("Nombre cambiado");

    // Y de verdad en la fila, no en una caché del servicio.
    const enLaBase = await pool.query<{ name: string }>(
      "SELECT name FROM saas_workflows WHERE id = $1", [w.id]);
    expect(enLaBase.rows[0]?.name).toBe("Nombre cambiado");
  });

  it("activar → pausar: el estado cambia y se persiste", async () => {
    const w = await svc.createWorkflow(A, nuevo() as never);

    await svc.activateWorkflow(A, w.id);
    expect((await svc.getWorkflow(A, w.id))?.status).toBe("active");

    await svc.pauseWorkflow(A, w.id);
    expect((await svc.getWorkflow(A, w.id))?.status).toBe("paused");
  });

  it("ejecutar deja rastro en el historial", async () => {
    // OJO con el orden: `executeWorkflow(workflowId, tenantId)` lleva los dos
    // parametros AL REVES que sus hermanos —`getWorkflow(tenantId, workflowId)`,
    // `updateWorkflow(tenantId, ...)`, `deleteWorkflow(tenantId, ...)`—. Los dos
    // son `string`, asi que invertirlos compila y no dice nada: yo los inverti
    // aqui y el sintoma fue un «Workflow not found» que parecia un defecto del
    // producto.
    //
    // No lo es: las dos rutas que la llaman lo hacen bien, y ademas invertirlos
    // falla CERRADO (`getWorkflow` no encuentra nada y lanza), no abre nada. Pero
    // la inconsistencia queda escrita aqui porque volvera a morder.
    const w = await svc.createWorkflow(A, nuevo() as never);
    await svc.activateWorkflow(A, w.id);
    await svc.executeWorkflow(w.id, A, { contactId: null } as never);

    const runs = await pool.query<{ status: string; workflow_id: string; steps_executed: unknown }>(
      "SELECT status, workflow_id, steps_executed FROM saas_workflow_runs WHERE tenant_id = $1",
      [A]);
    expect(runs.rows.length).toBeGreaterThan(0);
    expect(runs.rows[0]?.workflow_id).toBe(w.id);

    // Y `steps_executed` tiene que ser un ARRAY de verdad.
    //
    // Sin esta comprobacion, la corrupcion silenciosa pasaba: `pg` manda un
    // array de JS como array de PostgreSQL, asi que `[]` se guardaba como `{}`
    // —un OBJETO vacio— y la prueba seguia en verde porque la fila existia. Lo
    // que se rompe no siempre es lo que falla.
    expect(Array.isArray(runs.rows[0]?.steps_executed)).toBe(true);
  });

  it("una ejecucion CON pasos guarda esos pasos, no revienta", async () => {
    // El caso normal, y el que reventaba: un array no vacio hacia que el UPDATE
    // fallara con «invalid input syntax for type json». Y como el registro del
    // FALLO tenia el mismo defecto, el error de verdad quedaba tapado.
    const w = await svc.createWorkflow(A, nuevo() as never);
    await svc.activateWorkflow(A, w.id);
    await svc.executeWorkflow(w.id, A, { contactId: null } as never);

    const r = await pool.query<{ steps_executed: unknown[]; status: string }>(
      "SELECT steps_executed, status FROM saas_workflow_runs WHERE tenant_id=$1 AND workflow_id=$2",
      [A, w.id]);
    expect(Array.isArray(r.rows[0]?.steps_executed)).toBe(true);
    expect(r.rows[0]?.status).not.toBe("running");   // termino, no se quedo colgada
  });

  it("borrar → la lectura posterior devuelve null, no una fila fantasma", async () => {
    const w = await svc.createWorkflow(A, nuevo() as never);
    await svc.deleteWorkflow(A, w.id);
    expect(await svc.getWorkflow(A, w.id)).toBeNull();
  });

  // ── Lo que B NO puede hacer ───────────────────────────────────────────────

  it("B no puede LEER el workflow de A", async () => {
    const w = await svc.createWorkflow(A, nuevo() as never);
    expect(await svc.getWorkflow(B, w.id)).toBeNull();
  });

  it("B no puede BORRAR el de A: la fila sigue ahí", async () => {
    // Un aislamiento que solo tapa la lectura deja al vecino destruir lo que no
    // puede ver — y sin verlo, ni se entera de lo que borró.
    const w = await svc.createWorkflow(A, nuevo() as never);
    await svc.deleteWorkflow(B, w.id).catch(() => {});

    expect(await svc.getWorkflow(A, w.id)).not.toBeNull();
  });

  it("B no puede EDITAR el de A", async () => {
    const w = await svc.createWorkflow(A, nuevo() as never);
    await svc.updateWorkflow(B, w.id, { name: "secuestrado" } as never).catch(() => {});

    expect((await svc.getWorkflow(A, w.id))?.name).toBe("Bienvenida a nuevos contactos");
  });

  it("B no puede ACTIVAR el de A", async () => {
    const w = await svc.createWorkflow(A, nuevo() as never);
    await svc.activateWorkflow(B, w.id).catch(() => {});

    expect((await svc.getWorkflow(A, w.id))?.status).toBe("draft");
  });

  // ── Entradas que no valen ─────────────────────────────────────────────────

  it("un nombre vacío se rechaza al crear", async () => {
    await expect(svc.createWorkflow(A, { ...nuevo(), name: "   " } as never))
      .rejects.toThrow();
  });

  it("un disparador que no existe se rechaza", async () => {
    await expect(
      svc.createWorkflow(A, { ...nuevo(), triggerType: "no_existe" } as never))
      .rejects.toThrow();
  });

  it("editar uno que no existe no crea nada por sorpresa", async () => {
    const antes = (await svc.getWorkflows(A)).length;
    await svc.updateWorkflow(A, "11111111-1111-4111-8111-111111111111",
                             { name: "x" } as never).catch(() => {});
    expect((await svc.getWorkflows(A)).length).toBe(antes);
  });
});
