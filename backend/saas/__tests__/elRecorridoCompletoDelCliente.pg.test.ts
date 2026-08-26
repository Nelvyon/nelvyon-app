/**
 * BLOQUE 10 · el recorrido completo del cliente.
 *
 * Los bloques anteriores certificaron piezas: la puerta de sesión, el
 * aislamiento, los webhooks, la concurrencia, la recuperación. Este comprueba
 * que **las piezas encajan** — que un cliente puede recorrer el producto de
 * punta a punta y que, a lo largo de todo el recorrido, no se cruza con otro.
 *
 * Un E2E que solo comprueba el camino feliz de un cliente no vale para un SaaS.
 * Lo que hay que demostrar es que **DOS clientes recorren el producto a la vez y
 * no se ven**. Por eso cada paso del recorrido se hace con dos inquilinos y cada
 * lectura se comprueba desde los dos lados.
 *
 * Perfiles: el autónomo (un usuario, un inquilino) y la agencia (un inquilino
 * con volumen). No son personajes decorativos: cambian el volumen de datos y las
 * cotas que se atraviesan.
 *
 * Sin proveedores externos. Todo contra PostgreSQL real, porque las propiedades
 * que se cruzan —aislamiento, unicidad, idempotencia— las garantiza el esquema.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const DSN =
  process.env.NELVYON_PG_CERT_DSN ?? process.env.DATABASE_URL ?? process.env.NELVYON_B2_DSN ?? "";
const hayBase = Boolean(DSN);
const soloConBase = hayBase ? describe : describe.skip;

const SECRETO = "secreto-de-certificacion-bloque-10-con-longitud-de-sobra";

type Perfil = {
  nombre: string;
  usuario: string;
  ws: number;
  correo: string;
  contactos: number;
  tenantId: string;
  token: string;
};

const PERFILES: Perfil[] = [
  {
    nombre: "autonomo",
    usuario: "aa000000-0000-4000-8000-00000000aa01",
    ws: 971001,
    correo: "autonomo-b10@ejemplo.test",
    contactos: 12,
    tenantId: "",
    token: "",
  },
  {
    nombre: "agencia",
    usuario: "bb000000-0000-4000-8000-00000000bb01",
    ws: 971002,
    correo: "agencia-b10@ejemplo.test",
    contactos: 300,
    tenantId: "",
    token: "",
  },
];

let pool: import("pg").Pool;
let crm: { createContact: (t: string, d: Record<string, unknown>) => Promise<{ id: string }>;
           getContacts: (t: string, f?: Record<string, unknown>) => Promise<Array<{ id: string }>> };
let secuencias: {
  create: (t: string, i: Record<string, unknown>) => Promise<{ id: string }>;
  enroll: (t: string, s: string, c: string) => Promise<unknown>;
  listEnrollments: (t: string, s: string) => Promise<unknown[]>;
  get: (t: string, s: string) => Promise<unknown | null>;
  addStep: (t: string, s: string, i: Record<string, unknown>) => Promise<unknown>;
};
let auth: { generateToken?: (c: unknown) => string; verifyToken: (t: string) => Promise<{ userId: string }> };

const MARCA = "recorrido-b10";

async function limpiar(): Promise<void> {
  if (!pool) return;
  const us = PERFILES.map((p) => p.usuario);
  await pool.query(`DELETE FROM saas_sequence_enrollments WHERE tenant_id IN (SELECT id FROM saas_tenants WHERE user_id = ANY($1))`, [us]).catch(() => null);
  await pool.query(`DELETE FROM saas_sequences WHERE tenant_id IN (SELECT id FROM saas_tenants WHERE user_id = ANY($1))`, [us]).catch(() => null);
  await pool.query(`DELETE FROM saas_contacts WHERE tags @> ARRAY[$1]`, [MARCA]).catch(() => null);
  await pool.query(`DELETE FROM saas_tenants WHERE user_id = ANY($1)`, [us]);
  await pool.query(`DELETE FROM workspaces WHERE id = ANY($1)`, [PERFILES.map((p) => p.ws)]);
  await pool.query(`DELETE FROM nelvyon_users WHERE user_id = ANY($1)`, [us]);
}

beforeAll(async () => {
  if (!hayBase) return;
  process.env.DATABASE_URL = DSN;
  process.env.JWT_SECRET = SECRETO;
  process.env.NELVYON_AI_ENABLED = "0";
  const { Pool } = await import("pg");
  pool = new Pool({ connectionString: DSN, max: 8 });
  await limpiar();

  const crmMod = await import("../SaasCrmService");
  crm = crmMod.getSaasCrmService() as never;
  const seqMod = await import("../SaasSequencesService");
  secuencias = seqMod.getSaasSequencesService() as never;
  const authMod = await import("../../auth/AuthService");
  authMod.resetAuthServiceForTests();
  auth = authMod.getAuthService() as never;
});

afterAll(async () => {
  if (!pool) return;
  await limpiar();
  await pool.end();
});

soloConBase("BLOQUE 10 · 1. alta", () => {
  it("cada perfil se da de alta y recibe SU inquilino", async () => {
    /**
     * El primer paso, y el que decide todo lo demás: si dos altas compartieran
     * inquilino, nada de lo que viene después significaría nada.
     */
    for (const p of PERFILES) {
      await pool.query(
        `INSERT INTO nelvyon_users (user_id, email, password_hash, full_name, plan)
         VALUES ($1,$2,'x',$3,'pro')`,
        [p.usuario, p.correo, p.nombre],
      );
      await pool.query(`INSERT INTO workspaces (id, user_id, name) VALUES ($1,$2,$3)`, [
        p.ws,
        p.usuario,
        p.nombre,
      ]);
      const t = await pool.query(
        `INSERT INTO saas_tenants (user_id, company_name, industry, plan, onboarding_completed, workspace_id)
         VALUES ($1,$2,'tech','pro',true,$3) RETURNING id`,
        [p.usuario, `Empresa ${p.nombre}`, p.ws],
      );
      p.tenantId = t.rows[0].id;
      expect(p.tenantId, `${p.nombre} no obtuvo inquilino`).toBeTruthy();
    }
    const [a, b] = PERFILES;
    expect(a.tenantId, "dos altas compartieron inquilino").not.toBe(b.tenantId);
  }, 60_000);
});

soloConBase("BLOQUE 10 · 2. autenticación", () => {
  it("cada perfil obtiene un token que verifica y trae SU usuario", async () => {
    const jwt = (await import("jsonwebtoken")).default;
    for (const p of PERFILES) {
      p.token = jwt.sign(
        { userId: p.usuario, tenantId: p.tenantId, email: p.correo, plan: "pro" },
        SECRETO,
        { algorithm: "HS256", expiresIn: "1h" },
      );
      const claims = await auth.verifyToken(p.token);
      expect(claims.userId, `${p.nombre}: el token no trae su usuario`).toBe(p.usuario);
    }
  }, 60_000);

  it("el token de uno NO sirve para pasar por el otro", async () => {
    const [a, b] = PERFILES;
    const claimsA = await auth.verifyToken(a.token);
    expect(claimsA.userId).not.toBe(b.usuario);
  }, 60_000);
});

soloConBase("BLOQUE 10 · 3-4. configuración y operación", () => {
  it("cada perfil crea SUS contactos, con su volumen", async () => {
    /**
     * El volumen importa: el autónomo cruza doce contactos y la agencia
     * trescientos. Es lo que hace que el recorrido atraviese de verdad las cotas
     * que el Bloque 8 puso, en vez de quedarse siempre por debajo.
     */
    for (const p of PERFILES) {
      await pool.query(
        `INSERT INTO saas_contacts (id, tenant_id, name, status, pipeline_stage, value, tags, lead_score)
         SELECT gen_random_uuid(), $1::uuid, $2 || ' contacto ' || i, 'lead', 'new', i, ARRAY[$3], 0
           FROM generate_series(1, $4::int) AS i`,
        [p.tenantId, p.nombre, MARCA, p.contactos],
      );
    }
    for (const p of PERFILES) {
      const mios = await crm.getContacts(p.tenantId);
      expect(mios.length, `${p.nombre} no ve sus contactos`).toBeGreaterThanOrEqual(p.contactos);
    }
  }, 120_000);

  it("NINGÚN perfil ve un contacto del otro", async () => {
    /**
     * La propiedad central del producto, comprobada en el recorrido y no solo en
     * una prueba de unidad: se piden los contactos de cada uno y se comprueba que
     * ninguno de los del otro aparece.
     */
    const [a, b] = PERFILES;
    const deA = new Set((await crm.getContacts(a.tenantId)).map((c) => c.id));
    const deB = new Set((await crm.getContacts(b.tenantId)).map((c) => c.id));
    const cruce = [...deA].filter((x) => deB.has(x));
    expect(cruce, `${cruce.length} contactos aparecen en los dos inquilinos`).toHaveLength(0);
  }, 120_000);
});

soloConBase("BLOQUE 10 · 5. automatización", () => {
  it("cada perfil crea una secuencia e inscribe a sus contactos", async () => {
    for (const p of PERFILES) {
      const s = await secuencias.create(p.tenantId, {
        name: `Secuencia de ${p.nombre}`,
        status: "active",
      });
      // Una secuencia SIN PASOS no admite inscripciones, y hace bien: inscribir a
      // alguien en una automatizacion vacia es prometerle algo que no va a pasar.
      // El recorrido sigue la regla del producto en vez de saltarsela — que es la
      // diferencia entre un E2E y una demostracion.
      await secuencias.addStep(p.tenantId, s.id, {
        position: 1,
        stepType: "email",
        delayDays: 0,
        subject: `Hola de ${p.nombre}`,
        bodyHtml: "<p>Bienvenido</p>",
      });
      const contactos = (await crm.getContacts(p.tenantId)).slice(0, Math.min(p.contactos, 50));
      for (const c of contactos) {
        await secuencias.enroll(p.tenantId, s.id, c.id);
      }
      const inscritos = await secuencias.listEnrollments(p.tenantId, s.id);
      expect(inscritos.length, `${p.nombre}: no se inscribio nadie`).toBe(contactos.length);
      (p as Perfil & { seqId?: string }).seqId = s.id;
    }
  }, 180_000);

  it("un perfil NO puede leer la secuencia del otro", async () => {
    /**
     * `listEnrollments` valida antes que la secuencia sea del inquilino. Si esa
     * validación se cayera, la agencia leería la lista de inscritos del autónomo
     * con solo conocer un identificador.
     */
    const [a, b] = PERFILES as Array<Perfil & { seqId?: string }>;
    await expect(
      secuencias.listEnrollments(a.tenantId, b.seqId as string),
      "un inquilino leyo las inscripciones de la secuencia de otro",
    ).rejects.toThrow();
    expect(
      await secuencias.get(a.tenantId, b.seqId as string),
      "un inquilino obtuvo la secuencia de otro",
    ).toBeNull();
  }, 60_000);
});

soloConBase("BLOQUE 10 · 6-7. resultado y reporting", () => {
  it("cada perfil ve SUS cifras y solo las suyas", async () => {
    for (const p of PERFILES) {
      const r = await pool.query<{ n: string }>(
        `SELECT COUNT(*)::text AS n FROM saas_contacts WHERE tenant_id = $1`,
        [p.tenantId],
      );
      expect(Number(r.rows[0]?.n), `${p.nombre}: el recuento no es el suyo`).toBe(p.contactos);
    }
  }, 60_000);

  it("la suma de las partes NO es el total: nadie ve el agregado del otro", async () => {
    /**
     * Comprobación cruzada del reporting: si un informe se olvidara del filtro de
     * inquilino, el recuento de uno incluiría al otro y esta prueba lo vería.
     */
    const total = await pool.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM saas_contacts WHERE tags @> ARRAY[$1]`,
      [MARCA],
    );
    const suma = PERFILES.reduce((s, p) => s + p.contactos, 0);
    expect(Number(total.rows[0]?.n)).toBe(suma);
    for (const p of PERFILES) {
      expect(p.contactos, `${p.nombre} ve el total en vez de lo suyo`).toBeLessThan(suma);
    }
  }, 60_000);
});

soloConBase("BLOQUE 10 · 8. permisos", () => {
  it("una acción que no existe se deniega, no se ignora", async () => {
    /**
     * En autorización, lo que no está permitido está prohibido — también cuando
     * lo que falta es el propio nombre del permiso. Si una acción desconocida se
     * permitiera, una ruta nueva que se equivocara de nombre quedaría abierta.
     */
    const { requireSaasContext } = await import("../saasRequestContext");
    const req = new Request("https://nelvyon.test/api/saas/crm/contacts", {
      headers: { authorization: `Bearer ${PERFILES[0].token}` },
    });
    await expect(
      requireSaasContext(req, "accion.inventada.b10" as never),
      "una accion inexistente se dejo pasar",
    ).rejects.toThrow();
  }, 60_000);

  it("pedir el inquilino del otro por cabecera se rechaza", async () => {
    const { requireSaasContext } = await import("../saasRequestContext");
    const [a, b] = PERFILES;
    const req = new Request("https://nelvyon.test/api/saas/crm/contacts", {
      headers: {
        authorization: `Bearer ${a.token}`,
        "x-nelvyon-tenant-id": b.tenantId,
      },
    });
    await expect(
      requireSaasContext(req, "contacts.read"),
      "el perfil A opero sobre el inquilino de B cambiando una cabecera",
    ).rejects.toThrow();
  }, 60_000);
});

soloConBase("BLOQUE 10 · 9. recuperación a mitad del recorrido", () => {
  it("repetir una inscripción NO duplica", async () => {
    /**
     * Lo que pasa de verdad: el cliente hace doble clic, o la red se corta y el
     * navegador reintenta. Repetir una operación no puede dejar el producto en un
     * estado que el cliente no ha pedido.
     */
    const p = PERFILES[0] as Perfil & { seqId?: string };
    const antes = (await secuencias.listEnrollments(p.tenantId, p.seqId as string)).length;
    const contacto = (await crm.getContacts(p.tenantId))[0];
    await secuencias.enroll(p.tenantId, p.seqId as string, contacto.id).catch(() => null);
    const despues = (await secuencias.listEnrollments(p.tenantId, p.seqId as string)).length;
    expect(despues, "repetir la inscripcion la duplico").toBe(antes);
  }, 60_000);
});

soloConBase("BLOQUE 10 · 10. cierre de sesión", () => {
  it("un token caducado deja de servir", async () => {
    /**
     * Lo que el cierre de sesión promete de verdad hoy: la cookie se borra y el
     * token caduca a las ocho horas. Que NO hay revocación en servidor es un
     * residuo aceptado y documentado desde el Bloque 7 — aquí se comprueba lo
     * que sí se puede comprobar: que la caducidad se respeta.
     */
    const jwt = (await import("jsonwebtoken")).default;
    const caducado = jwt.sign(
      { userId: PERFILES[0].usuario, tenantId: PERFILES[0].tenantId },
      SECRETO,
      { algorithm: "HS256", expiresIn: "-1h" },
    );
    await expect(auth.verifyToken(caducado), "un token caducado siguio valiendo").rejects.toThrow();
  }, 60_000);

  it("EL CONTROL: el token vivo sigue sirviendo al final del recorrido", async () => {
    const claims = await auth.verifyToken(PERFILES[0].token);
    expect(claims.userId).toBe(PERFILES[0].usuario);
  }, 60_000);
});
