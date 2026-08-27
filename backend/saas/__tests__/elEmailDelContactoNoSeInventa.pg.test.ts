/**
 * La política de email del CRM: estricta al escribir, sin romper lo escrito.
 *
 * QUÉ HABÍA
 * =========
 * Ninguna validación. `"no soy un email"`, `"pepe@"` y `"<script>"` entraban tal
 * cual en `saas_contacts.email`, y la tabla tampoco tiene ninguna restricción de
 * formato —comprobado en el catálogo—.
 *
 * Ese campo no es decorativo: es a donde salen las campañas. Un email inválido
 * no falla al guardarse; falla semanas después, en un envío, contra un proveedor
 * externo y sobre una lista entera.
 *
 * POR QUÉ NO ES «PONER UNA VALIDACIÓN»
 * =====================================
 * Validar en todas las puertas a la vez rompe dos cosas legítimas:
 *
 *   · un contacto YA guardado con un email raro dejaría de poder editarse, ni
 *     siquiera para arreglarle el teléfono;
 *   · una importación de 5.000 contactos con tres emails malos se rechazaría
 *     entera, y quien la hace no sabe cuáles son los tres.
 *
 * Rechazar datos que ya existen no es rigor: es perderlos por otra vía. Así que
 * la política es POR PUERTA, y esta suite certifica las tres.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { SaasCrmError, SaasCrmService } from "../SaasCrmService";
import { examinarEmailDeContacto } from "../emailDeContacto";

const DSN = process.env.NELVYON_B2_DSN ?? process.env.NELVYON_PG_CERT_DSN ?? "";
const conBase = DSN ? describe : describe.skip;

const TENANT = "e3a11111-2222-4333-8444-555555555501";
const USUARIO = "e3a11111-2222-4333-8444-5555555555f1";

let pool: import("pg").Pool;
let crm: SaasCrmService;

/** Los que NO se pueden enviar. Cada uno rompe por un motivo distinto. */
const INVALIDOS = [
  "no soy un email",
  "pepe@",
  "@dominio.com",
  "a@b",                       // TLD de una letra
  "dos@arrobas@ejemplo.com",
  "con espacio@ejemplo.com",
  "sinarroba.ejemplo.com",
  "<script>alert(1)</script>",
  `${"a".repeat(250)}@ejemplo.com`,   // pasa de 254
];

/** Los que SÍ. El control positivo: sin ellos, rechazarlo todo pasaría. */
const VALIDOS = [
  "pepe@ejemplo.com",
  "PEPE@EJEMPLO.COM",
  "nombre.apellido+etiqueta@sub.dominio.es",
  "a@b.co",
  "guion-bajo_1@dominio-con-guion.io",
];

/**
 * Un puerto atado al pool DE ESTE FICHERO, no al singleton `DbClient`.
 *
 * Vitest reparte varios ficheros por *worker* y comparte el proceso. Si aquí se
 * usara `DbClient.getInstance()`, se cogería el singleton que otro fichero del
 * mismo worker ya hubiera construido —apuntando a OTRA base—, y este fichero
 * sembraría en una y consultaría en la otra.
 *
 * Aislado pasaba y en la suite completa fallaba: el peor tipo de rojo, porque
 * parece intermitente cuando en realidad es determinista y depende del reparto.
 */
function puerto() {
  return {
    query: async <T>(sql: string, params?: unknown[]): Promise<T[]> => {
      const r = await pool.query(sql, params as never[]);
      return r.rows as T[];
    },
  };
}

beforeAll(async () => {
  if (!DSN) return;
  const { Pool } = await import("pg");
  pool = new Pool({ connectionString: DSN, max: 4 });
  await pool.query(`DELETE FROM saas_contacts WHERE tenant_id = $1`, [TENANT]);
  await pool.query(`DELETE FROM saas_tenants WHERE id = $1`, [TENANT]);
  await pool.query(`DELETE FROM nelvyon_users WHERE user_id = $1`, [USUARIO]);
  await pool.query(
    `INSERT INTO nelvyon_users (user_id, email, password_hash, full_name, plan)
     VALUES ($1,'crm-email-cert@ejemplo.test','x','Cert','pro')`,
    [USUARIO],
  );
  await pool.query(
    `INSERT INTO saas_tenants (id, user_id, company_name, industry, plan)
     VALUES ($1,$2,'Cert Email','tech','pro')`,
    [TENANT, USUARIO],
  );
  crm = new SaasCrmService(puerto() as never);
});

beforeEach(async () => {
  if (!pool) return;
  await pool.query(`DELETE FROM saas_contacts WHERE tenant_id = $1`, [TENANT]);
});

afterAll(async () => {
  if (!pool) return;
  await pool.query(`DELETE FROM saas_contacts WHERE tenant_id = $1`, [TENANT]);
  await pool.query(`DELETE FROM saas_tenants WHERE id = $1`, [TENANT]);
  await pool.query(`DELETE FROM nelvyon_users WHERE user_id = $1`, [USUARIO]);
  await pool.end();
});

describe("el dictamen, sin base", () => {
  it("EL CONTROL: los válidos pasan", () => {
    /**
     * Primero éste. Un validador que rechazara todo pasaría los nueve negativos
     * de abajo y dejaría el CRM sin poder guardar un solo email — una avería
     * silenciosa, porque el formulario seguiría abriéndose.
     */
    for (const e of VALIDOS) {
      const r = examinarEmailDeContacto(e);
      expect(r.valido, `${e} se rechazó: ${r.motivo}`).toBe(true);
    }
  });

  it("los inválidos no pasan, y cada uno dice por qué", () => {
    for (const e of INVALIDOS) {
      const r = examinarEmailDeContacto(e);
      expect(r.valido, `${JSON.stringify(e.slice(0, 40))} se dio por válido`).toBe(false);
      expect(r.motivo, "no dice por qué").toBeTruthy();
    }
  });

  it("normaliza igual que la deduplicación: recorta y baja a minúsculas", () => {
    // Si aquí se normalizara distinto, dos contactos que el deduplicador
    // considera el mismo se guardarían con dos valores distintos.
    expect(examinarEmailDeContacto("  PePe@Ejemplo.COM  ").valor).toBe("pepe@ejemplo.com");
  });

  it("ausencia NO es invalidez", () => {
    // Un contacto sólo con teléfono es legítimo. Si `null` fuera inválido,
    // guardarlo sería imposible.
    for (const e of [null, undefined, "", "   "]) {
      const r = examinarEmailDeContacto(e as string | null);
      expect(r.valido, JSON.stringify(e)).toBe(true);
      expect(r.valor).toBeNull();
    }
  });
});

conBase("1 · crear de uno en uno: ESTRICTO", () => {
  it("EL CONTROL: un email válido se crea y se guarda normalizado", async () => {
    const c = await crm.createContact(TENANT, { name: "Pepe", email: "  PePe@Ejemplo.COM " });
    expect(c.email).toBe("pepe@ejemplo.com");
    const r = await pool.query<{ email: string }>(
      `SELECT email FROM saas_contacts WHERE id = $1`, [c.id]);
    expect(r.rows[0]?.email, "se guardó sin normalizar").toBe("pepe@ejemplo.com");
  });

  it("un email inválido se rechaza con un error que dice CUÁL", async () => {
    /**
     * El mensaje lleva el valor a propósito. «Email inválido» a secas obliga a
     * adivinar qué campo del formulario es.
     */
    await expect(
      crm.createContact(TENANT, { name: "Malo", email: "pepe@" }),
    ).rejects.toThrow(/email invalido.*pepe@/i);

    const n = await pool.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM saas_contacts WHERE tenant_id = $1`, [TENANT]);
    expect(Number(n.rows[0]?.n), "se creó el contacto pese al rechazo").toBe(0);
  });

  it("el error es de VALIDACIÓN, no una caída", async () => {
    // Importa para la ruta que lo envuelve: `VALIDATION` sale como 400, no 500.
    await expect(crm.createContact(TENANT, { name: "M", email: "x" })).rejects.toMatchObject({
      name: "SaasCrmError",
      code: "VALIDATION",
    });
  });

  it("un contacto sin email se crea igual", async () => {
    const c = await crm.createContact(TENANT, { name: "Solo telefono", phone: "600100200" });
    expect(c.email).toBeNull();
  });
});

conBase("2 · lo que YA está guardado: intocable", () => {
  /**
   * La parte que hace esto desplegable sin migrar nada. Se siembra por debajo
   * del servicio —directamente en la tabla— porque el servicio ya no deja meter
   * un email así, y lo que hay que reproducir es un contacto de ANTES.
   */
  async function sembrarHistorico(email: string): Promise<string> {
    const r = await pool.query<{ id: string }>(
      `INSERT INTO saas_contacts (tenant_id, name, email, status, pipeline_stage, updated_at)
       VALUES ($1,'Historico',$2,'lead','new',NOW()) RETURNING id::text`,
      [TENANT, email],
    );
    return r.rows[0]!.id;
  }

  it("se puede LEER y LISTAR sin que reviente nada", async () => {
    await sembrarHistorico("esto no es un email");
    const lista = await crm.getContacts(TENANT, {});
    expect(lista.length).toBeGreaterThan(0);
    expect(lista.some((c) => c.email === "esto no es un email")).toBe(true);
  });

  it("se le puede editar OTRO campo sin tocar el email", async () => {
    /**
     * Ésta es la prueba que impide la solución fácil. Si `updateContact`
     * validara siempre, este contacto quedaría congelado: no se le podría ni
     * corregir el teléfono, porque el `UPDATE` reescribe la fila entera.
     */
    const id = await sembrarHistorico("pepe@");
    const c = await crm.updateContact(TENANT, id, { phone: "600100200" });
    expect(c.phone).toBe("600100200");
    expect(c.email, "el email histórico se perdió al editar otro campo").toBe("pepe@");
  });

  it("pero CAMBIARLE el email a otro inválido sí se rechaza", async () => {
    const id = await sembrarHistorico("pepe@");
    await expect(
      crm.updateContact(TENANT, id, { email: "sigue mal" }),
    ).rejects.toThrow(/email invalido/i);
  });

  it("y ARREGLARLO funciona", async () => {
    // El camino de salida tiene que existir, o la tolerancia sería permanente.
    const id = await sembrarHistorico("pepe@");
    const c = await crm.updateContact(TENANT, id, { email: "pepe@ejemplo.com" });
    expect(c.email).toBe("pepe@ejemplo.com");
  });
});

conBase("3 · importación en lote: informa, no rechaza", () => {
  it("un lote con emails malos se importa ENTERO y los reporta", async () => {
    /**
     * La regla: ni rechazar el lote, ni descartar filas en silencio. Las dos
     * cosas pierden trabajo de quien importa; la segunda además sin avisar.
     */
    const r = await crm.createContactsBatch(TENANT, [
      { name: "Bueno 1", email: "uno@ejemplo.com" },
      { name: "Malo 1", email: "no soy un email" },
      { name: "Bueno 2", email: "dos@ejemplo.com" },
      { name: "Malo 2", email: "pepe@" },
      { name: "Sin email" },
    ]);

    expect(r.created, "se perdieron filas en la importación").toHaveLength(5);
    expect(r.errors, "una fila con email malo se contó como error").toHaveLength(0);
    expect(r.avisos).toHaveLength(2);
    expect(r.avisos.map((a) => a.index)).toEqual([1, 3]);
    for (const a of r.avisos) expect(a.aviso).toMatch(/email no enviable/);
  });

  it("los valores malos se CONSERVAN, no se borran", async () => {
    // Descartarlos sería decidir por el cliente que ese dato no valía nada. A lo
    // mejor es un email con una errata que alguien puede corregir mirándolo.
    await crm.createContactsBatch(TENANT, [{ name: "Malo", email: "  PePe@  " }]);
    const r = await pool.query<{ email: string }>(
      `SELECT email FROM saas_contacts WHERE tenant_id = $1 AND name = 'Malo'`, [TENANT]);
    // Normalizado (recortado y en minúsculas) pero no perdido.
    expect(r.rows[0]?.email).toBe("pepe@");
  });

  it("EL CONTROL: un lote entero válido no genera ni un aviso", async () => {
    const r = await crm.createContactsBatch(TENANT, VALIDOS.map((e, i) => ({
      name: `Bueno ${i}`, email: e,
    })));
    expect(r.created).toHaveLength(VALIDOS.length);
    expect(r.avisos, `avisos falsos: ${JSON.stringify(r.avisos)}`).toHaveLength(0);
  });

  it("los avisos no impiden que el resto del lote se pueda usar", async () => {
    await crm.createContactsBatch(TENANT, [
      { name: "A", email: "a@ejemplo.com" },
      { name: "B", email: "roto" },
    ]);
    const lista = await crm.getContacts(TENANT, {});
    expect(lista).toHaveLength(2);
  });
});
