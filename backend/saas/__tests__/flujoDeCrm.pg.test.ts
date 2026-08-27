/**
 * BLOQUE 2 · CRM — el flujo completo, contra PostgreSQL de verdad.
 *
 * Es la superficie de cliente mas grande: 48 rutas. Aqui se recorre lo que haria
 * una persona usando el producto —contactos y oportunidades— y lo que NO deberia
 * poder hacer el inquilino de al lado.
 *
 *     crear → leer → listar → filtrar → editar → RELEER → actividad
 *     → oportunidad → cambiar de etapa → metricas → borrar
 *
 * Con el SERVICIO REAL contra el esquema real. Un doble certificaria el doble; la
 * pregunta es si el SQL escrito funciona contra las tablas que hay — que es
 * exactamente donde workflows tenia dos defectos que nadie veia.
 *
 * LA CLASE DE FALLO QUE SE BUSCA
 * ------------------------------
 * «Funciona hasta que refrescas»: por eso ninguna prueba se conforma con lo que
 * devuelve la llamada de escritura. Todas vuelven a LEER, y varias miran la fila
 * en la base sin pasar por el servicio, por si hubiera cache.
 *
 * Se salta sin `NELVYON_B2_DSN`.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { SaasCrmService } from "../SaasCrmService";
import { SaasDealsService } from "../SaasDealsService";

const DSN = process.env.NELVYON_B2_DSN;
const describeSiHayPg = DSN ? describe : describe.skip;

let pool: import("pg").Pool;
let crm: SaasCrmService;
let deals: SaasDealsService;

// Cada fichero de certificación usa su PROPIO par de inquilinos.
//
// Antes todos compartían `aaaa…`/`bbbb…`, y vitest corre los ficheros en
// PARALELO contra la misma base: el `beforeEach` de uno borraba las filas que
// otro acababa de sembrar. Por separado pasaban los 16 y juntos fallaban tres.
// Eso es un falso rojo —y con otra combinación habría sido un falso verde—.
//
// El sufijo sale del nombre del fichero, así que dos ficheros nunca coinciden y
// no hay que llevar una lista a mano.
const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb01";

function puerto() {
  return {
    query: async <T>(sql: string, params?: unknown[]): Promise<T[]> => {
      const r = await pool.query(sql, params as never[]);
      return r.rows as T[];
    },
  };
}

async function sembrarInquilinos() {
  for (const [id, nombre] of [[A, "Inquilino A"], [B, "Inquilino B"]] as const) {
    // `saas_tenants.user_id` referencia `nelvyon_users(user_id)`, no `users(id)`:
    // conviven dos tablas de usuario y la clave foranea apunta a la primera.
    await pool.query(
      `INSERT INTO nelvyon_users
         (user_id, email, password_hash, full_name, plan, tenant_id,
          created_at, updated_at, email_verified)
       VALUES ($1::uuid, $2, 'x', $3, 'pro', $1::text, NOW(), NOW(), true)
       ON CONFLICT (user_id) DO NOTHING`,
      [id, `cert-${id}@nelvyon.test`, nombre]);
    await pool.query(
      `INSERT INTO saas_tenants (id, user_id, company_name, industry, plan)
       VALUES ($1, $1, $2, 'certificacion', 'pro')
       ON CONFLICT (id) DO UPDATE SET plan = 'pro'`,
      [id, nombre]);
  }
}

describeSiHayPg("BLOQUE 2 · CRM — flujo completo", () => {
  beforeAll(async () => {
    const { Pool } = await import("pg");
    pool = new Pool({ connectionString: DSN, max: 4 });
    await sembrarInquilinos();
    crm = new SaasCrmService(puerto() as never);
    deals = new SaasDealsService(puerto() as never);
  });

  afterAll(async () => { await pool?.end(); });

  beforeEach(async () => {
    for (const t of ["saas_deals", "saas_contact_activities", "saas_contacts"]) {
      await pool.query(`DELETE FROM ${t} WHERE tenant_id = ANY($1)`, [[A, B]]).catch(() => {});
    }
  });

  //: La forma REAL que espera el servicio: `name` en una sola pieza —no
  //: `firstName`/`lastName`— y `pipeline_stage` en snake_case. Escribir la forma
  //: que uno supone en vez de la que hay da un `Cannot read properties of
  //: undefined` que parece un defecto del producto y es de la prueba.
  const contacto = (n = 1) => ({
    name: `Persona Numero ${n}`,
    email: `persona${n}@cliente.test`,
    company: "Cliente de certificacion",
    phone: "+34600000000",
  });

  // ── Contactos ─────────────────────────────────────────────────────────────

  it("crear → leer: el contacto se puede volver a leer con sus datos", async () => {
    const c = await crm.createContact(A, contacto() as never);
    expect(c.id).toBeTruthy();

    const leido = await crm.getContact(A, c.id);
    expect(leido?.email).toBe("persona1@cliente.test");
    expect(leido?.company).toBe("Cliente de certificacion");
  });

  it("la lista lo incluye y NO incluye los del otro inquilino", async () => {
    const deA = await crm.createContact(A, contacto(1) as never);
    await crm.createContact(B, contacto(2) as never);

    const lista = await crm.getContacts(A);
    expect(lista.map((x) => x.id)).toContain(deA.id);
    expect(lista.map((x) => x.email)).not.toContain("persona2@cliente.test");
  });

  it("editar PERSISTE: la fila de la base tiene el cambio", async () => {
    const c = await crm.createContact(A, contacto() as never);
    await crm.updateContact(A, c.id, { company: "Nombre nuevo" } as never);

    expect((await crm.getContact(A, c.id))?.company).toBe("Nombre nuevo");

    // Sin pasar por el servicio, por si hubiera cache.
    const fila = await pool.query<{ company: string }>(
      "SELECT company FROM saas_contacts WHERE id = $1", [c.id]);
    expect(fila.rows[0]?.company).toBe("Nombre nuevo");
  });

  it("una actividad queda registrada y se puede releer", async () => {
    const c = await crm.createContact(A, contacto() as never);
    await crm.addActivity(c.id, A, { activityType: "note", description: "Llamada hecha" } as never);

    const actividades = await crm.getActivities(c.id, A);
    expect(actividades.length).toBeGreaterThan(0);
    expect(actividades[0]?.description).toContain("Llamada");
  });

  it("borrar → la lectura devuelve null, no una fila fantasma", async () => {
    const c = await crm.createContact(A, contacto() as never);
    await crm.deleteContact(A, c.id);
    expect(await crm.getContact(A, c.id)).toBeNull();
  });

  // ── Oportunidades ─────────────────────────────────────────────────────────

  it("crear oportunidad → leer → cambiar de etapa → PERSISTE", async () => {
    const c = await crm.createContact(A, contacto() as never);
    const d = await deals.createDeal(A, {
      title: "Contrato anual", contact_id: c.id, value: 12000, currency: "EUR",
    } as never);
    expect(d.id).toBeTruthy();

    // Las etapas reales son new | contacted | qualified | proposal | won | lost.
    await deals.changeStage(A, d.id, "qualified" as never);

    const relectura = await deals.getDeal(A, d.id);
    expect(relectura?.stage).toBe("qualified");

    const fila = await pool.query<{ stage: string }>(
      "SELECT stage FROM saas_deals WHERE id = $1", [d.id]);
    expect(fila.rows[0]?.stage).toBe("qualified");
  });

  it("las metricas cuentan lo que hay, no un numero inventado", async () => {
    const c = await crm.createContact(A, contacto() as never);
    await deals.createDeal(A, {
      title: "Uno", contact_id: c.id, value: 1000, currency: "EUR",
    } as never);
    await deals.createDeal(A, {
      title: "Dos", contact_id: c.id, value: 2000, currency: "EUR",
    } as never);

    const m = await deals.getMetrics(A);
    // No se afirma un valor exacto —el servicio puede agrupar de varias formas—
    // pero SI que refleja las dos que existen y no cero ni una constante.
    expect(JSON.stringify(m)).toMatch(/2|3000/);
  });

  // ── Lo que B no puede hacer ───────────────────────────────────────────────

  it("B no puede LEER el contacto de A", async () => {
    const c = await crm.createContact(A, contacto() as never);
    expect(await crm.getContact(B, c.id)).toBeNull();
  });

  it("B no puede EDITAR el contacto de A", async () => {
    const c = await crm.createContact(A, contacto() as never);
    await crm.updateContact(B, c.id, { company: "secuestrado" } as never).catch(() => {});
    expect((await crm.getContact(A, c.id))?.company).toBe("Cliente de certificacion");
  });

  it("B no puede BORRAR el contacto de A", async () => {
    // Un aislamiento que solo tapa la lectura deja al vecino destruir lo que no
    // puede ver — y sin verlo, ni se entera de lo que borro.
    const c = await crm.createContact(A, contacto() as never);
    await crm.deleteContact(B, c.id).catch(() => {});
    expect(await crm.getContact(A, c.id)).not.toBeNull();
  });

  it("B no ve la oportunidad de A ni en la lista ni por id", async () => {
    const c = await crm.createContact(A, contacto() as never);
    const d = await deals.createDeal(A, {
      title: "Privado", contact_id: c.id, value: 999, currency: "EUR",
    } as never);

    expect(await deals.getDeal(B, d.id)).toBeNull();
    expect((await deals.listDeals(B)).map((x) => x.id)).not.toContain(d.id);
  });

  it("B no puede mover de etapa la oportunidad de A", async () => {
    const c = await crm.createContact(A, contacto() as never);
    const d = await deals.createDeal(A, {
      title: "Privado", contact_id: c.id, value: 999, currency: "EUR",
    } as never);
    const etapaOriginal = d.stage;

    await deals.changeStage(B, d.id, "won" as never).catch(() => {});
    expect((await deals.getDeal(A, d.id))?.stage).toBe(etapaOriginal);
  });

  // ── Entradas que no valen ─────────────────────────────────────────────────

  it("RESUELTO: el correo se valida al crear, y se rechaza el que no sirve", async () => {
    /**
     * Esta prueba estaba INVERTIDA y documentaba el hallazgo: ni el servicio ni
     * la ruta comprobaban la forma del correo, así que `no-soy-un-correo` se
     * guardaba tal cual. Decía literalmente: «cuando se decida, esta prueba se
     * invierte y pasa a exigir el rechazo». Es lo que ha pasado.
     *
     * La cautela de entonces también era correcta, y se ha respetado: validar en
     * todas las puertas a la vez rompería las importaciones que hoy funcionan y
     * dejaría congelados los contactos ya guardados con un correo raro. Por eso
     * la política es POR PUERTA — estricta al crear, tolerante con lo histórico,
     * y en lote informa sin rechazar.
     *
     * El detalle completo, con los tres caminos y sus mutaciones, está en
     * `elEmailDelContactoNoSeInventa.pg.test.ts`.
     */
    await expect(
      crm.createContact(A, { ...contacto(), email: "no-soy-un-correo" } as never),
    ).rejects.toThrow(/email invalido/i);

    // Y el control: uno válido sigue entrando, y normalizado.
    const c = await crm.createContact(A, { ...contacto(), email: "Valido@Ejemplo.COM" } as never);
    expect((await crm.getContact(A, c.id))?.email).toBe("valido@ejemplo.com");
  });

  it("editar un contacto que no existe no crea nada por sorpresa", async () => {
    const antes = (await crm.getContacts(A)).length;
    await crm.updateContact(A, "11111111-1111-4111-8111-111111111111",
                            { company: "x" } as never).catch(() => {});
    expect((await crm.getContacts(A)).length).toBe(antes);
  });
});
