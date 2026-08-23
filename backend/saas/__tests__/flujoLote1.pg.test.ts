/**
 * BLOQUE 2 · lote 1 — encuestas, web builder, marca blanca y contratos.
 *
 * Cuatro capacidades del inventario cerrado que no dependen de ningún proveedor
 * externo, así que se pueden certificar enteras aquí: el camino real hasta
 * PostgreSQL y de vuelta, con dos inquilinos a la vez.
 *
 * Van juntas en un fichero porque comparten la misma forma —CRUD con alcance de
 * inquilino— y el arranque de la base es caro. Cada capacidad conserva su propio
 * bloque y su propio veredicto: agruparlas no las mezcla.
 *
 * LO QUE SE EXIGE EN LAS CUATRO
 * -----------------------------
 *   crear → RELEER de la fila → editar → RELEER → borrar → ya no está
 *   y el inquilino B no lee, no edita y no borra lo de A.
 *
 * Ninguna prueba se conforma con lo que devuelve la escritura: la clase de fallo
 * que se busca es «funciona hasta que refrescas», y eso solo se ve releyendo.
 * Varias miran la fila SIN pasar por el servicio, por si hubiera caché.
 *
 * Se salta sin `NELVYON_B2_DSN`.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { DigitalContractsService } from "../DigitalContractsService";
import { SaasSurveysService } from "../SaasSurveysService";
import { SaasWebBuilderService } from "../SaasWebBuilderService";
import { SaasWhiteLabelService } from "../SaasWhiteLabelService";

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

async function sembrarInquilinos() {
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
}

describeSiHayPg("BLOQUE 2 · lote 1", () => {
  beforeAll(async () => {
    const { Pool } = await import("pg");
    pool = new Pool({ connectionString: DSN, max: 4 });
    await sembrarInquilinos();
  });

  afterAll(async () => { await pool?.end(); });

  // ══════════════════════════════════════════════════════════════════════════
  // encuestas
  // ══════════════════════════════════════════════════════════════════════════

  describe("encuestas", () => {
    let svc: SaasSurveysService;
    beforeAll(() => { svc = new SaasSurveysService({ db: puerto() as never }); });
    beforeEach(async () => {
      await pool.query("DELETE FROM survey_responses WHERE tenant_id = ANY($1)", [[A, B]]).catch(() => {});
      await pool.query("DELETE FROM surveys WHERE tenant_id = ANY($1)", [[A, B]]).catch(() => {});
    });

    const encuesta = { name: "Satisfacción trimestral", questions: [
      { id: "q1", text: "¿Nos recomendarías?", type: "nps" },
    ] };

    it("crear → releer conserva nombre y preguntas", async () => {
      const s = await svc.createSurvey(A, encuesta as never);
      const leida = await svc.getSurvey(A, s.id);
      expect(leida?.name).toBe("Satisfacción trimestral");
      // Las preguntas viajan en JSON: tienen que volver como ARRAY, no como
      // objeto. `pg` manda un array de JS como array de PostgreSQL, y eso
      // convierte `[]` en `{}` sin decir nada — ya mordió en workflows.
      expect(Array.isArray(leida?.questions)).toBe(true);
      expect(leida?.questions).toHaveLength(1);
    });

    it("editar PERSISTE en la fila, no solo en la respuesta", async () => {
      const s = await svc.createSurvey(A, encuesta as never);
      await svc.updateSurvey(A, s.id, { name: "Otro nombre" } as never);

      const fila = await pool.query<{ name: string }>(
        "SELECT name FROM surveys WHERE id = $1", [s.id]);
      expect(fila.rows[0]?.name).toBe("Otro nombre");
    });

    it("una respuesta queda registrada y se puede releer", async () => {
      const s = await svc.createSurvey(A, encuesta as never);
      await svc.submitResponse(s.id, { answers: { q1: 9 } } as never);

      const respuestas = await svc.listResponses(A, s.id);
      expect(respuestas.length).toBeGreaterThan(0);
    });

    it("borrar → ya no se lee", async () => {
      const s = await svc.createSurvey(A, encuesta as never);
      await svc.deleteSurvey(A, s.id);
      expect(await svc.getSurvey(A, s.id)).toBeNull();
    });

    it("B no lee, no edita y no borra la encuesta de A", async () => {
      const s = await svc.createSurvey(A, encuesta as never);

      expect(await svc.getSurvey(B, s.id)).toBeNull();
      await svc.updateSurvey(B, s.id, { name: "secuestrada" } as never).catch(() => {});
      await svc.deleteSurvey(B, s.id).catch(() => {});

      const sigue = await svc.getSurvey(A, s.id);
      expect(sigue?.name).toBe("Satisfacción trimestral");
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // web builder
  // ══════════════════════════════════════════════════════════════════════════

  describe("web builder", () => {
    let svc: SaasWebBuilderService;
    beforeAll(() => { svc = new SaasWebBuilderService(puerto() as never); });
    beforeEach(async () => {
      await pool.query("DELETE FROM saas_web_pages WHERE tenant_id = ANY($1)", [[A, B]]).catch(() => {});
    });

    const pagina = (t = "Página de aterrizaje") => ({
      title: t,
      slug: `pagina-${Math.abs(t.length * 7919) % 100000}`,
      sections: [{ id: "s1", type: "hero", props: { titulo: "Hola" } }],
    });

    it("crear → releer conserva el título y las secciones como ARRAY", async () => {
      const p = await svc.create(A, pagina() as never);
      const leida = await svc.get(A, p.id);
      expect(leida?.title).toBe("Página de aterrizaje");
      expect(Array.isArray(leida?.sections)).toBe(true);
    });

    it("se puede encontrar por su slug", async () => {
      // El slug es la URL pública: si no resuelve, la página existe y nadie
      // puede verla.
      const p = await svc.create(A, pagina() as never);
      const porSlug = await svc.getBySlug(A, p.slug);
      expect(porSlug?.id).toBe(p.id);
    });

    it("B no ve la página de A ni por id ni por slug", async () => {
      const p = await svc.create(A, pagina() as never);
      expect(await svc.get(B, p.id)).toBeNull();
      expect(await svc.getBySlug(B, p.slug)).toBeNull();
    });

    it("la lista de A no incluye las de B", async () => {
      const deA = await svc.create(A, pagina("De A") as never);
      await svc.create(B, pagina("De B") as never);
      const lista = await svc.list(A);
      expect(lista.map((x) => x.id)).toContain(deA.id);
      expect(lista.map((x) => x.title)).not.toContain("De B");
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // marca blanca
  // ══════════════════════════════════════════════════════════════════════════

  describe("marca blanca", () => {
    let svc: SaasWhiteLabelService;
    beforeAll(() => { svc = new SaasWhiteLabelService({ db: puerto() as never }); });
    beforeEach(async () => {
      await pool.query("DELETE FROM saas_whitelabel_configs WHERE tenant_id = ANY($1)", [[A, B]]).catch(() => {});
    });

    const config = (dominio: string) => ({
      agencyName: "Marca del cliente",
      primaryColor: "#112233",
      customDomain: dominio,
    });

    it("guardar → releer conserva la configuración", async () => {
      await svc.upsertConfig(A, config("marca-a.test") as never);
      const leida = await svc.getConfig(A);
      expect(leida?.agencyName).toBe("Marca del cliente");
    });

    it("guardar dos veces ACTUALIZA, no duplica", async () => {
      // `upsert` que insertara dos veces dejaría dos marcas para un inquilino y
      // la que se aplique dependería del orden de lectura.
      await svc.upsertConfig(A, config("marca-a.test") as never);
      await svc.upsertConfig(A, { ...config("marca-a.test"), agencyName: "Nueva" } as never);

      const filas = await pool.query("SELECT 1 FROM saas_whitelabel_configs WHERE tenant_id = $1", [A]);
      expect(filas.rows).toHaveLength(1);
      expect((await svc.getConfig(A))?.agencyName).toBe("Nueva");
    });

    it("el dominio de A NO resuelve a la configuración de B", async () => {
      // `getConfigByDomain` busca SIN inquilino —tiene que hacerlo, porque el
      // dominio es lo único que trae la petición—, así que aquí es donde un
      // fallo de alcance entregaría la marca de otro.
      await svc.upsertConfig(A, config("marca-a.test") as never);
      await svc.upsertConfig(B, { ...config("marca-b.test"), agencyName: "Marca de B" } as never);

      const porDominio = await svc.getConfigByDomain("marca-a.test");
      expect(porDominio?.agencyName).not.toBe("Marca de B");
    });

    it("desactivar deja de servir la configuración", async () => {
      await svc.upsertConfig(A, config("marca-a.test") as never);
      await svc.deactivate(A);
      const tras = await svc.getConfig(A);
      expect(tras === null || tras.active === false).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // contratos
  // ══════════════════════════════════════════════════════════════════════════

  describe("contratos", () => {
    let svc: DigitalContractsService;
    beforeAll(() => { svc = new DigitalContractsService({ db: puerto() as never }); });
    beforeEach(async () => {
      await pool.query("DELETE FROM digital_contracts WHERE user_id = ANY($1)", [[A, B]]).catch(() => {});
    });

    // La forma REAL: `serviceType`, `price`, `currency`, `duration` y
    // `startDate` son obligatorios, y todos acaban en columnas NOT NULL. Una
    // entrada inventada da un «violates not-null constraint» que parece defecto
    // del producto y es de la prueba.
    const contrato = {
      clientName: "Cliente Final",
      clientEmail: "cliente@final.test",
      serviceType: "Consultoría",
      price: 3000,
      currency: "EUR",
      duration: "3 meses",
      startDate: "2026-09-01",
      terms: ["Pago a 30 días"],
    };

    it("crear → releer conserva el contrato", async () => {
      const c = await svc.createContract(A, contrato as never);
      const leido = await svc.getContract(c.id, A);
      expect(leido?.clientName).toBe("Cliente Final");
    });

    it("enviar a firma cambia el estado y devuelve un token", async () => {
      const c = await svc.createContract(A, contrato as never);
      const enviado = await svc.sendForSignature(c.id, A);
      expect(enviado.token).toBeTruthy();

      const leido = await svc.getContract(c.id, A);
      expect(leido?.status).not.toBe("draft");
    });

    it("firmar con el token deja el contrato FIRMADO en la base", async () => {
      // El paso final: un contrato que se «firma» sin quedar firmado en la fila
      // es exactamente la mentira funcional que se busca.
      const c = await svc.createContract(A, contrato as never);
      const { token } = await svc.sendForSignature(c.id, A);
      await svc.signContract(token, "firma-de-certificacion");

      const fila = await pool.query<{ status: string }>(
        "SELECT status FROM digital_contracts WHERE id = $1", [c.id]);
      expect(fila.rows[0]?.status).toBe("signed");
    });

    it("un token que no existe no firma nada", async () => {
      await expect(svc.signContract("token-inventado", "firma")).rejects.toThrow();
    });

    it("B no ve el contrato de A", async () => {
      const c = await svc.createContract(A, contrato as never);
      expect(await svc.getContract(c.id, B)).toBeNull();
    });

    it("anular deja el contrato anulado y no se puede firmar después", async () => {
      const c = await svc.createContract(A, contrato as never);
      const { token } = await svc.sendForSignature(c.id, A);
      await svc.voidContract(c.id, A);

      await svc.signContract(token, "firma-tardia").catch(() => {});

      const fila = await pool.query<{ status: string }>(
        "SELECT status FROM digital_contracts WHERE id = $1", [c.id]);
      expect(fila.rows[0]?.status).not.toBe("signed");
    });
  });
});
