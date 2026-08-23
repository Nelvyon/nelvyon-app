/**
 * BLOQUE 2 · lote 6 — SEO, base de conocimiento, snippets y memoria de inquilino.
 *
 * Cuatro capacidades cuyo núcleo es interno y por tanto certificable entera: lo
 * que dependa de un proveedor (Semrush en SEO, embeddings en memoria) se marca
 * aparte y no se toca — coste externo nuevo = 0 €.
 *
 * La memoria de inquilino es la más delicada de las cuatro: es lo que la IA lee
 * como contexto. Un trozo de memoria que se cruce de inquilino no se queda en
 * una fila mal leída — acaba dentro de una respuesta generada para otro cliente.
 *
 * Se salta sin `NELVYON_B2_DSN`.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { SaasKnowledgeBaseService } from "../SaasKnowledgeBaseService";
import { SaasSeoService } from "../SaasSeoService";
import { SaasSnippetsService } from "../SaasSnippetsService";
import { SaasTenantMemoryService } from "../SaasTenantMemoryService";

const DSN = process.env.NELVYON_B2_DSN;
const describeSiHayPg = DSN ? describe : describe.skip;

let pool: import("pg").Pool;

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function puerto() {
  return {
    query: async <T>(sql: string, params?: unknown[]): Promise<T[]> => {
      const r = await pool.query(sql, params as never[]);
      return r.rows as T[];
    },
  };
}

describeSiHayPg("BLOQUE 2 · lote 6", () => {
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
        [id, `cert-${id.slice(0, 8)}@nelvyon.test`, nombre]);
      await pool.query(
        `INSERT INTO saas_tenants (id, user_id, company_name, industry, plan)
         VALUES ($1, $1, $2, 'certificacion', 'pro')
         ON CONFLICT (id) DO UPDATE SET plan = 'pro'`,
        [id, nombre]);
    }
  });

  afterAll(async () => { await pool?.end(); });

  // ══════════════════════════════════════════════════════════════════════════
  // SEO — palabras seguidas
  // ══════════════════════════════════════════════════════════════════════════

  describe("SEO", () => {
    let svc: SaasSeoService;
    beforeAll(() => { svc = new SaasSeoService(puerto() as never); });
    beforeEach(async () => {
      await pool.query("DELETE FROM saas_seo_tracked_keywords WHERE tenant_id = ANY($1)", [[A, B]]);
    });

    it("añadir una palabra → aparece en el listado", async () => {
      await svc.addTracked(A, "asesoria fiscal madrid", "cliente.test");
      const lista = await svc.listTracked(A);
      expect(lista.map((x) => x.keyword)).toContain("asesoria fiscal madrid");
    });

    it("añadir varias de golpe las añade todas", async () => {
      await svc.addManyTracked(A, ["una", "dos", "tres"], "cliente.test");
      expect((await svc.listTracked(A)).length).toBe(3);
    });

    it("EL CONTROL: las palabras de A no salen en el listado de B", async () => {
      await svc.addTracked(A, "palabra de A", "cliente.test");
      const deA = await svc.listTracked(A);
      const deB = await svc.listTracked(B);
      expect(deA.length).toBeGreaterThan(0);            // control positivo
      expect(deB.map((x) => x.keyword)).not.toContain("palabra de A");
    });

    it("B no puede borrar la palabra seguida por A", async () => {
      const k = await svc.addTracked(A, "palabra de A", "cliente.test");
      await svc.removeTracked(B, k.id).catch(() => {});
      expect((await svc.listTracked(A)).map((x) => x.id)).toContain(k.id);
    });

    it("borrar la propia sí la quita", async () => {
      const k = await svc.addTracked(A, "palabra de A", "cliente.test");
      await svc.removeTracked(A, k.id);
      expect((await svc.listTracked(A)).map((x) => x.id)).not.toContain(k.id);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // base de conocimiento
  // ══════════════════════════════════════════════════════════════════════════

  describe("base de conocimiento", () => {
    let svc: SaasKnowledgeBaseService;
    beforeAll(() => { svc = new SaasKnowledgeBaseService(puerto() as never); });
    beforeEach(async () => {
      await pool.query("DELETE FROM saas_kb_articles WHERE tenant_id = ANY($1)", [[A, B]]);
      await pool.query("DELETE FROM saas_kb_categories WHERE tenant_id = ANY($1)", [[A, B]]);
    });

    it("categoría → artículo → releer conserva el contenido", async () => {
      const cat = await svc.createCategory(A, { name: "Facturación" } as never);
      const art = await svc.createArticle(A, {
        categoryId: cat.id, title: "Cómo emitir una factura",
        content: "Pasos para emitir una factura.",
      } as never);

      const leido = await svc.getArticle(A, art.id);
      expect(leido?.title).toBe("Cómo emitir una factura");
      expect(leido?.content).toContain("Pasos");
    });

    it("editar PERSISTE en la fila", async () => {
      const cat = await svc.createCategory(A, { name: "Facturación" } as never);
      const art = await svc.createArticle(A, {
        categoryId: cat.id, title: "Título viejo", content: "x",
      } as never);
      await svc.updateArticle(A, art.id, { title: "Título nuevo" } as never);

      const fila = await pool.query<{ title: string }>(
        "SELECT title FROM saas_kb_articles WHERE id = $1", [art.id]);
      expect(fila.rows[0]?.title).toBe("Título nuevo");
    });

    it("votar y ver suman en el artículo correcto", async () => {
      const cat = await svc.createCategory(A, { name: "Facturación" } as never);
      const uno = await svc.createArticle(A, { categoryId: cat.id, title: "Uno", content: "x" } as never);
      const dos = await svc.createArticle(A, { categoryId: cat.id, title: "Dos", content: "x" } as never);

      await svc.voteArticle(A, uno.id, "helpful");
      await svc.incrementViews(A, uno.id);

      // La columna es `helpful`, no `helpfulVotes`. Se comprueba en la FILA para
      // no depender de cómo la renombre el mapeo del servicio.
      const filas = await pool.query<{ id: string; helpful: number; views: number }>(
        "SELECT id, helpful, views FROM saas_kb_articles WHERE id = ANY($1::uuid[])",
        [[uno.id, dos.id]]);
      const fUno = filas.rows.find((r) => r.id === uno.id)!;
      const fDos = filas.rows.find((r) => r.id === dos.id)!;
      expect(Number(fUno.helpful)).toBe(1);
      expect(Number(fDos.helpful)).toBe(0);   // el voto no se fue al artículo vecino
    });

    it("B no lee, no edita y no borra el artículo de A", async () => {
      const cat = await svc.createCategory(A, { name: "Facturación" } as never);
      const art = await svc.createArticle(A, { categoryId: cat.id, title: "Privado de A", content: "x" } as never);

      // `getArticle` LANZA cuando no encuentra, no devuelve null. Las dos formas
      // valen como negativo; lo que no vale es que devuelva el artículo ajeno.
      const deB = await svc.getArticle(B, art.id).catch(() => null);
      expect(deB).toBeNull();

      await svc.updateArticle(B, art.id, { title: "secuestrado" } as never).catch(() => {});
      await svc.deleteArticle(B, art.id).catch(() => {});
      await svc.voteArticle(B, art.id, "helpful").catch(() => {});

      expect((await svc.getArticle(A, art.id))?.title).toBe("Privado de A");
      const fila = await pool.query<{ helpful: number }>(
        "SELECT helpful FROM saas_kb_articles WHERE id = $1", [art.id]);
      expect(Number(fila.rows[0]?.helpful)).toBe(0);   // B tampoco pudo votarlo
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // snippets
  // ══════════════════════════════════════════════════════════════════════════

  describe("snippets", () => {
    let svc: SaasSnippetsService;
    beforeAll(() => { svc = new SaasSnippetsService(puerto() as never); });
    beforeEach(async () => {
      await pool.query("DELETE FROM snippets WHERE tenant_id = ANY($1)", [[A, B]]).catch(() => {});
    });

    it("crear → releer → editar PERSISTE", async () => {
      const s = await svc.create(A, null, { name: "Saludo", content: "Hola, ¿qué tal?" } as never);
      expect((await svc.get(A, s.id))?.name).toBe("Saludo");

      await svc.update(A, s.id, { content: "Buenas tardes" } as never);
      const fila = await pool.query<{ content: string }>(
        "SELECT content FROM snippets WHERE id = $1", [s.id]);
      expect(fila.rows[0]?.content).toBe("Buenas tardes");
    });

    it("B no lee ni borra el snippet de A", async () => {
      const s = await svc.create(A, null, { name: "Privado", content: "x" } as never);
      expect(await svc.get(B, s.id)).toBeNull();
      await svc.delete(B, s.id).catch(() => {});
      expect(await svc.get(A, s.id)).not.toBeNull();
    });

    it("la búsqueda de A no devuelve los de B", async () => {
      await svc.create(A, null, { name: "Plantilla de A", content: "contenido" } as never);
      await svc.create(B, null, { name: "Plantilla de B", content: "contenido" } as never);

      const encontrados = await svc.list(A, "Plantilla");
      expect(encontrados.length).toBeGreaterThan(0);          // control positivo
      expect(encontrados.map((x) => x.name)).not.toContain("Plantilla de B");
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // memoria de inquilino — lo que la IA lee como contexto
  // ══════════════════════════════════════════════════════════════════════════

  describe("memoria de inquilino", () => {
    let svc: SaasTenantMemoryService;
    beforeAll(() => { svc = new SaasTenantMemoryService(puerto() as never); });
    beforeEach(async () => {
      await pool.query("DELETE FROM saas_tenant_memory_chunks WHERE tenant_id = ANY($1)", [[A, B]]).catch(() => {});
    });

    async function sembrarTrozo(inquilino: string, texto: string) {
      await pool.query(
        // `source` tiene un CHECK: manual|inbox|pack|crm|import. Un valor inventado
      // viola la restriccion, que es exactamente lo que debe hacer.
      `INSERT INTO saas_tenant_memory_chunks (tenant_id, content, source, created_at)
         VALUES ($1, $2, 'manual', NOW())`,
        [inquilino, texto]);
    }

    it("un trozo guardado se lista", async () => {
      await sembrarTrozo(A, "El cliente prefiere que le llamemos por la mañana.");
      const lista = await svc.list(A);
      expect(lista.length).toBeGreaterThan(0);
    });

    it("EL CONTROL: la memoria de A no aparece en la lista de B", async () => {
      // Un trozo cruzado no se queda en una fila mal leída: acaba dentro de una
      // respuesta generada para otro cliente.
      await sembrarTrozo(A, "Secreto comercial de A");
      const deA = await svc.list(A);
      const deB = await svc.list(B);
      expect(deA.length).toBeGreaterThan(0);            // control positivo
      expect(JSON.stringify(deB)).not.toContain("Secreto comercial de A");
    });

    it("la búsqueda de B no encuentra lo de A", async () => {
      await sembrarTrozo(A, "Secreto comercial de A");
      const enB = await svc.search(B, "Secreto");
      expect(JSON.stringify(enB)).not.toContain("Secreto comercial de A");
    });

    it("el bloque de CONTEXTO de B no contiene nada de A", async () => {
      // Este es el que de verdad importa: `buildContextBlock` es lo que se le
      // entrega al modelo. Si aquí se cuela un trozo ajeno, la fuga no es una
      // consulta: es texto que el modelo puede repetir.
      await sembrarTrozo(A, "Secreto comercial de A");
      await sembrarTrozo(B, "Dato propio de B");

      const contextoB = await svc.buildContextBlock(B);
      expect(contextoB).toContain("Dato propio de B");     // control positivo
      expect(contextoB).not.toContain("Secreto comercial de A");
    });

    it("B no puede borrar un trozo de memoria de A", async () => {
      await sembrarTrozo(A, "Secreto comercial de A");
      const fila = await pool.query<{ id: string }>(
        "SELECT id FROM saas_tenant_memory_chunks WHERE tenant_id = $1 LIMIT 1", [A]);
      const id = fila.rows[0]!.id;

      await svc.deleteChunk(B, id).catch(() => {});
      const sigue = await pool.query("SELECT 1 FROM saas_tenant_memory_chunks WHERE id = $1", [id]);
      expect(sigue.rows).toHaveLength(1);
    });
  });
});
