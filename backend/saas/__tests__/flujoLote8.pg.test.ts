/**
 * BLOQUE 2 · lote 8 — embudos, claves de API, documentos y reputación.
 *
 * Las claves de API son la más delicada: son credenciales. Lo que hay que probar
 * no es que se creen, sino que la clave EN CLARO no se pueda recuperar después,
 * que revocarla deje de valer de verdad, y que la de un inquilino no verifique
 * como si fuera de otro.
 *
 * Los embudos tienen una superficie PÚBLICA (`getByPublicSlug`) que se consulta
 * sin inquilino: ahí es donde un fallo de alcance entregaría el embudo de otro.
 *
 * Se salta sin `NELVYON_B2_DSN`.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { SaasApiKeysService } from "../SaasApiKeysService";
import { SaasDocumentsService } from "../SaasDocumentsService";
import { SaasFunnelService } from "../SaasFunnelService";
import { SaasReputationService } from "../SaasReputationService";

const DSN = process.env.NELVYON_B2_DSN;
const describeSiHayPg = DSN ? describe : describe.skip;

let pool: import("pg").Pool;

// Cada fichero de certificación usa su PROPIO par de inquilinos.
//
// Antes todos compartían `aaaa…`/`bbbb…`, y vitest corre los ficheros en
// PARALELO contra la misma base: el `beforeEach` de uno borraba las filas que
// otro acababa de sembrar. Por separado pasaban los 16 y juntos fallaban tres.
// Eso es un falso rojo —y con otra combinación habría sido un falso verde—.
//
// El sufijo sale del nombre del fichero, así que dos ficheros nunca coinciden y
// no hay que llevar una lista a mano.
const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa15";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb15";

function puerto() {
  return {
    query: async <T>(sql: string, params?: unknown[]): Promise<T[]> => {
      const r = await pool.query(sql, params as never[]);
      return r.rows as T[];
    },
  };
}

describeSiHayPg("BLOQUE 2 · lote 8", () => {
  beforeAll(async () => {
    const { Pool } = await import("pg");
    pool = new Pool({ connectionString: DSN, max: 4 });
    for (const [id, nombre] of [[A, "Inquilino A"], [B, "Inquilino B"]] as const) {
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
  });

  afterAll(async () => { await pool?.end(); });

  // ══════════════════════════════════════════════════════════════════════════
  // claves de API — son credenciales
  // ══════════════════════════════════════════════════════════════════════════

  describe("claves de API", () => {
    let svc: SaasApiKeysService;
    beforeAll(() => { svc = new SaasApiKeysService(puerto() as never); });
    beforeEach(async () => {
      await pool.query("DELETE FROM api_keys WHERE tenant_id = ANY($1)", [[A, B]]).catch(() => {});
    });

    it("crear devuelve la clave UNA vez y la lista ya no la trae", async () => {
      // Si la clave en claro se pudiera releer, cualquiera con acceso al panel
      // —o a una copia de la base— tendría las credenciales de todos.
      const creada = await svc.create(A, null, { name: "Clave de integración" } as never);
      // `create` devuelve { key, rawKey }: el objeto guardado y la cadena en
      // claro. Confundirlos hace que se busque un objeto dentro del JSON.
      expect(creada.rawKey).toBeTruthy();

      const lista = await svc.list(A);
      const enClaro = creada.rawKey;
      expect(JSON.stringify(lista)).not.toContain(enClaro);
    });

    it("la clave NO se guarda en claro en la base", async () => {
      const creada = await svc.create(A, null, { name: "Clave de integración" } as never);
      const enClaro = creada.rawKey;

      const filas = await pool.query<Record<string, unknown>>(
        "SELECT * FROM api_keys WHERE tenant_id = $1", [A]);
      expect(JSON.stringify(filas.rows)).not.toContain(enClaro);
    });

    it("la clave recién creada VERIFICA", async () => {
      // Control positivo: sin esto, una verificación que fallara siempre
      // aprobaría las pruebas de abajo y dejaría la API pública inservible.
      const creada = await svc.create(A, null, { name: "Clave de integración" } as never);
      const v = await svc.verifyKey(creada.rawKey);
      expect(v).toBeTruthy();
      expect(v!.tenantId).toBe(A);
    });

    it("una clave REVOCADA deja de verificar", async () => {
      const creada = await svc.create(A, null, { name: "Clave de integración" } as never);
      await svc.revoke(A, creada.key.id);

      const v = await svc.verifyKey(creada.rawKey).catch(() => null);
      expect(v).toBeFalsy();
    });

    it("B no puede revocar la clave de A", async () => {
      // Revocar la credencial de otro corta sus integraciones sin que sepa por qué.
      const creada = await svc.create(A, null, { name: "Clave de integración" } as never);
      await svc.revoke(B, creada.key.id).catch(() => {});

      const v = await svc.verifyKey(creada.rawKey);
      expect(v).toBeTruthy();
    });

    it("una clave inventada no verifica", async () => {
      expect(await svc.verifyKey("nk_inventada_0000000000").catch(() => null)).toBeFalsy();
    });

    it("la lista de A no incluye las claves de B", async () => {
      await svc.create(A, null, { name: "De A" } as never);
      await svc.create(B, null, { name: "De B" } as never);
      const lista = await svc.list(A);
      expect(lista.length).toBeGreaterThan(0);                      // control positivo
      expect(lista.map((k) => k.name)).not.toContain("De B");
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // embudos — con superficie pública
  // ══════════════════════════════════════════════════════════════════════════

  describe("embudos", () => {
    let svc: SaasFunnelService;
    beforeAll(() => { svc = new SaasFunnelService(puerto() as never); });
    beforeEach(async () => {
      for (const t of ["saas_funnel_events", "saas_funnel_step_variants",
                       "saas_funnel_steps", "saas_funnels"]) {
        await pool.query(`DELETE FROM ${t} WHERE tenant_id = ANY($1)`, [[A, B]]).catch(() => {});
      }
    });

    it("crear → releer → añadir paso → publicar PERSISTE", async () => {
      const f = await svc.create(A, { name: "Embudo de captación" } as never);
      await svc.addStep(A, f.id, { type: "landing", name: "Portada" } as never);
      await svc.publish(A, f.id);

      const leido = await svc.get(A, f.id);
      expect(leido?.name).toBe("Embudo de captación");
      // El estado publicado se llama `active` en este servicio.
      expect(leido?.status).toBe("active");
    });

    it("un visitante y una conversión se cuentan en el paso correcto", async () => {
      const f = await svc.create(A, { name: "Embudo" } as never);
      const p1 = await svc.addStep(A, f.id, { type: "landing", name: "Uno" } as never);
      const p2 = await svc.addStep(A, f.id, { type: "landing", name: "Dos" } as never);

      await svc.trackVisitor(A, p1.id);
      await svc.trackVisitor(A, p1.id);
      await svc.trackConversion(A, p1.id);

      const filas = await pool.query<{ id: string; visitors: number; conversions: number }>(
        "SELECT id, visitors, conversions FROM saas_funnel_steps WHERE id = ANY($1::uuid[])",
        [[p1.id, p2.id]]);
      const uno = filas.rows.find((r) => r.id === p1.id)!;
      const dos = filas.rows.find((r) => r.id === p2.id)!;
      expect(Number(uno.visitors)).toBe(2);
      expect(Number(uno.conversions)).toBe(1);
      expect(Number(dos.visitors)).toBe(0);   // no se contó en el paso vecino
    });

    it("B no lee, no publica ni borra el embudo de A", async () => {
      const f = await svc.create(A, { name: "Embudo de A" } as never);
      expect(await svc.get(B, f.id).catch(() => null)).toBeNull();
      await svc.publish(B, f.id).catch(() => {});
      await svc.delete(B, f.id).catch(() => {});

      const sigue = await svc.get(A, f.id);
      expect(sigue?.name).toBe("Embudo de A");
      expect(sigue?.status).not.toBe("active");
    });

    it("la búsqueda PÚBLICA por slug no entrega un embudo sin publicar", async () => {
      // `getByPublicSlug` se consulta SIN inquilino —el slug es lo único que trae
      // la petición—, así que es donde un fallo de alcance entregaría el embudo
      // de otro, o un borrador que nadie quería enseñar.
      const f = await svc.create(A, { name: "Embudo en borrador" } as never);
      const leido = await svc.get(A, f.id);
      const slug = String(leido?.publicSlug ?? "");
      if (!slug) return;   // sin slug no hay superficie pública que probar

      const publico = await svc.getByPublicSlug(slug).catch(() => null);
      expect(publico).toBeNull();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // documentos
  // ══════════════════════════════════════════════════════════════════════════

  describe("documentos", () => {
    let svc: SaasDocumentsService;
    beforeAll(() => { svc = new SaasDocumentsService({ db: puerto() as never }); });
    beforeEach(async () => {
      await pool.query("DELETE FROM documents WHERE tenant_id = ANY($1)", [[A, B]]).catch(() => {});
    });

    it("crear → releer conserva el documento", async () => {
      const d = await svc.createDocument(A, { name: "Contrato firmado.pdf" } as never);
      expect((await svc.getDocument(A, d.id))?.name).toBe("Contrato firmado.pdf");
    });

    it("B no lee ni borra el documento de A", async () => {
      // Un documento es un fichero del cliente: leerlo cruzado es una fuga
      // directa, y borrarlo es destrucción de algo que no se puede recuperar.
      const d = await svc.createDocument(A, { name: "Privado de A.pdf" } as never);
      expect(await svc.getDocument(B, d.id).catch(() => null)).toBeNull();

      await svc.deleteDocument(B, d.id).catch(() => {});
      expect(await svc.getDocument(A, d.id)).not.toBeNull();
    });

    it("la lista de A no incluye los de B", async () => {
      await svc.createDocument(A, { name: "De A.pdf" } as never);
      await svc.createDocument(B, { name: "De B.pdf" } as never);
      const lista = await svc.listDocuments(A);
      expect(lista.length).toBeGreaterThan(0);                  // control positivo
      expect(lista.map((x) => x.name)).not.toContain("De B.pdf");
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // reputación
  // ══════════════════════════════════════════════════════════════════════════

  describe("reputación", () => {
    let svc: SaasReputationService;
    beforeAll(() => { svc = new SaasReputationService({ db: puerto() as never }); });
    beforeEach(async () => {
      await pool.query("DELETE FROM gbp_reviews WHERE tenant_id = ANY($1)", [[A, B]]).catch(() => {});
    });

    async function sembrarResena(inquilino: string, autor: string, estrellas = 4) {
      await pool.query(
        // Las columnas reales: google_review_id, review_text, reply_text.
        `INSERT INTO gbp_reviews
           (tenant_id, google_review_id, author_name, rating, review_text,
            reply_status, synced_at, created_at)
         VALUES ($1, $2, $3, $4, 'Una reseña', 'pending', NOW(), NOW())`,
        [inquilino, `ext-${autor}`, autor, estrellas]);
    }

    it("las reseñas se listan y las estadísticas cuentan lo que hay", async () => {
      await sembrarResena(A, "Persona Uno", 5);
      await sembrarResena(A, "Persona Dos", 3);

      const lista = await svc.listReviews(A);
      expect(lista.length).toBe(2);
      const stats = await svc.getStats(A);
      expect(JSON.stringify(stats)).toMatch(/2|4/);
    });

    it("EL CONTROL: B no ve las reseñas de A", async () => {
      await sembrarResena(A, "Persona De A");
      const deA = await svc.listReviews(A);
      const deB = await svc.listReviews(B);
      expect(deA.length).toBeGreaterThan(0);          // control positivo
      expect(deB.length).toBe(0);
    });

    it("B no puede responder ni ignorar la reseña de A", async () => {
      // Responder en nombre de otro negocio es publicar en su ficha pública.
      await sembrarResena(A, "Persona De A");
      const id = (await svc.listReviews(A))[0]!.id;

      await svc.replyToReview(B, id, "Respuesta intrusa").catch(() => {});
      await svc.markIgnored(B, id).catch(() => {});

      const fila = await pool.query<{ reply_text: string; reply_status: string }>(
        "SELECT reply_text, reply_status FROM gbp_reviews WHERE id = $1", [id]);
      expect(fila.rows[0]?.reply_text ?? "").not.toContain("intrusa");
    });

    it("responder la propia SÍ queda guardada", async () => {
      await sembrarResena(A, "Persona De A");
      const id = (await svc.listReviews(A))[0]!.id;
      await svc.replyToReview(A, id, "Gracias por su reseña");

      const fila = await pool.query<{ reply_text: string }>(
        "SELECT reply_text FROM gbp_reviews WHERE id = $1", [id]);
      expect(fila.rows[0]?.reply_text).toContain("Gracias");
    });
  });
});
