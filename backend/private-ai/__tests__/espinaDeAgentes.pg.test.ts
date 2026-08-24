/**
 * BLOQUE 3 · la columna vertebral, contra PostgreSQL real.
 *
 * Antes de dar por bueno ningun agente Premium hay que demostrar que la espina
 * no miente: trazabilidad, aprobaciones y aislamiento, cada cosa acotada a su
 * inquilino. Si la espina miente, ningun agente encima de ella puede
 * certificarse.
 *
 * Se salta sin `NELVYON_B3_DSN`, y `laPuertaDelBloque3NoPuedeSaltarse` impide
 * que una puerta oficial se ejecute sin esa variable y reporte verde.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { PrivateAiApprovalService } from "../approvals/PrivateAiApprovalService";
import { PrivateAiAuditService } from "../audit/PrivateAiAuditService";

const DSN = process.env.NELVYON_B3_DSN;
const describeSiHayPg = DSN ? describe : describe.skip;

let pool: import("pg").Pool;

// Par de inquilinos propio de este fichero. Los ficheros corren en PARALELO
// contra la misma base: compartir inquilinos hace que el `beforeEach` de uno
// borre lo que otro acaba de sembrar. Se aprendio en el Bloque 2, donde por
// separado pasaban 16 ficheros y juntos caian tres.
const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaab01";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb01";

function puerto() {
  return {
    query: async <T>(sql: string, params?: unknown[]): Promise<T[]> => {
      const r = await pool.query(sql, params as never[]);
      return r.rows as T[];
    },
  };
}

describeSiHayPg("BLOQUE 3 · espina de agentes", () => {
  let audit: PrivateAiAuditService;
  let approvals: PrivateAiApprovalService;

  beforeAll(async () => {
    const { Pool } = await import("pg");
    pool = new Pool({ connectionString: DSN, max: 4 });
    audit = new PrivateAiAuditService(puerto() as never);
    approvals = new PrivateAiApprovalService(puerto() as never);

    // Las dos tablas tienen clave ajena a `saas_tenants`, y esa a
    // `nelvyon_users`. Sin sembrarlas, cada insercion falla por integridad y no
    // por lo que se quiere medir.
    for (const [id, nombre] of [[A, "Inquilino A"], [B, "Inquilino B"]] as const) {
      await pool.query(
        `INSERT INTO nelvyon_users
           (user_id, email, password_hash, full_name, plan, tenant_id,
            created_at, updated_at, email_verified)
         VALUES ($1::uuid, $2, 'x', $3, 'pro', $1::text, NOW(), NOW(), true)
         ON CONFLICT (user_id) DO NOTHING`,
        [id, `cert-b3-${id}@nelvyon.test`, nombre]);
      await pool.query(
        `INSERT INTO saas_tenants (id, user_id, company_name, industry, plan)
         VALUES ($1, $1, $2, 'certificacion', 'pro')
         ON CONFLICT (id) DO UPDATE SET plan = 'pro'`,
        [id, nombre]);
    }
  });

  afterAll(async () => {
    await pool?.end();
  });

  beforeEach(async () => {
    for (const t of ["saas_private_ai_audit", "saas_private_ai_approvals"]) {
      await pool.query(`DELETE FROM ${t} WHERE tenant_id = ANY($1::uuid[])`, [[A, B]]);
    }
  });

  // -- trazabilidad ---------------------------------------------------------

  describe("trazabilidad", () => {
    const entrada = (t: string, texto: string) => ({
      tenantId: t,
      agentId: "seo",
      action: "advise",
      provider: "stub",
      model: "n/a",
      prompt: "prompt del agente",
      userInput: texto,
      output: `respuesta a ${texto}`,
      metadata: { mock: true },
    });

    it("una ejecucion queda registrada y se puede releer", async () => {
      const id = await audit.log(entrada(A, "posiciona mi web"));
      expect(id).toBeTruthy();

      const reciente = await audit.listRecent(A);
      expect(reciente.length).toBeGreaterThan(0); // control positivo
      expect(reciente[0]!.inputPreview).toContain("posiciona mi web");
      expect(reciente[0]!.agentId).toBe("seo");
    });

    it("EL CONTROL: la traza de A no aparece en la de B", async () => {
      await audit.log(entrada(A, "secreto de A"));
      const deA = await audit.listRecent(A);
      const deB = await audit.listRecent(B);
      expect(deA.length).toBeGreaterThan(0); // control positivo
      expect(JSON.stringify(deB)).not.toContain("secreto de A");
    });

    it("B escribe lo suyo y lo ve; A no lo ve", async () => {
      // La matriz completa, no media: A->A si, A->B no, B->B si, B->A no.
      await audit.log(entrada(B, "cosa de B"));
      const deB = await audit.listRecent(B);
      const deA = await audit.listRecent(A);
      expect(JSON.stringify(deB)).toContain("cosa de B");
      expect(JSON.stringify(deA)).not.toContain("cosa de B");
    });

    it("el prompt NO se guarda en claro, solo su huella", async () => {
      // Guardar el prompt entero seria guardar instrucciones y datos de negocio
      // en una tabla de auditoria que se consulta con otro proposito.
      await audit.log(entrada(A, "hola"));
      const fila = await pool.query<{ prompt_hash: string }>(
        "SELECT prompt_hash FROM saas_private_ai_audit WHERE tenant_id = $1",
        [A],
      );
      expect(fila.rows[0]!.prompt_hash).not.toContain("prompt del agente");
      expect(fila.rows[0]!.prompt_hash).toMatch(/^[0-9a-f]{16}$/);
    });

    it("el metadata viaja como jsonb y vuelve como objeto", async () => {
      // `pg` no serializa arrays/objetos de JS a JSON por su cuenta: manda un
      // literal de PostgreSQL. Contra jsonb eso se guarda mal o revienta. Es el
      // defecto que costo dos capacidades enteras en el Bloque 2.
      await audit.log({ ...entrada(A, "x"), metadata: { pasos: [{ ok: true }], n: 2 } });
      const fila = await pool.query<{ metadata: { pasos: Array<{ ok: boolean }>; n: number } }>(
        "SELECT metadata FROM saas_private_ai_audit WHERE tenant_id = $1",
        [A],
      );
      expect(Array.isArray(fila.rows[0]!.metadata.pasos)).toBe(true);
      expect(fila.rows[0]!.metadata.n).toBe(2);
    });
  });

  // -- aprobaciones ---------------------------------------------------------

  describe("aprobaciones", () => {
    it("una accion sensible se ENCOLA y queda pendiente", async () => {
      const id = await approvals.queue({
        tenantId: A,
        agentId: "marketing",
        actionType: "send_mass_campaign",
        payload: { destinatarios: 4000 },
        requestedBy: A,   // `requested_by` es uuid: los llamadores reales pasan userId
      });
      expect(id).toBeTruthy();

      const pendientes = await approvals.list(A, "pending");
      expect(pendientes.length).toBe(1);
      expect(JSON.stringify(pendientes[0])).toContain("send_mass_campaign");
    });

    it("el payload viaja como jsonb, no como literal de array", async () => {
      await approvals.queue({
        tenantId: A,
        agentId: "marketing",
        actionType: "send_mass_campaign",
        payload: { segmentos: ["a", "b"], n: 2 },
      });
      const fila = await pool.query<{ payload: { segmentos: string[]; n: number } }>(
        "SELECT payload FROM saas_private_ai_approvals WHERE tenant_id = $1",
        [A],
      );
      expect(Array.isArray(fila.rows[0]!.payload.segmentos)).toBe(true);
      expect(fila.rows[0]!.payload.n).toBe(2);
    });

    it("EL CONTROL: B no ve las aprobaciones pendientes de A", async () => {
      // Una cola de aprobaciones compartida seria peor que una fuga de lectura:
      // alguien de otro inquilino podria APROBAR una accion ajena.
      await approvals.queue({
        tenantId: A,
        agentId: "finance",
        actionType: "modify_billing",
        payload: { plan: "pro" },
      });
      const deA = await approvals.list(A, "pending");
      const deB = await approvals.list(B, "pending");
      expect(deA.length).toBe(1); // control positivo
      expect(deB.length).toBe(0);
    });

    it("una accion encolada NO queda marcada como ejecutada", async () => {
      // La regla del bloque: nada puede decir que se hizo si solo se preparo.
      await approvals.queue({
        tenantId: A,
        agentId: "social_media",
        actionType: "send_client_message",
        payload: { texto: "hola" },
      });
      const fila = await pool.query<{ status: string }>(
        "SELECT status FROM saas_private_ai_approvals WHERE tenant_id = $1",
        [A],
      );
      expect(fila.rows[0]!.status).toBe("pending");
      expect(fila.rows[0]!.status).not.toBe("executed");
    });

    it("sin inquilino no se ve NADA (fallo cerrado)", async () => {
      await approvals.queue({
        tenantId: A,
        agentId: "marketing",
        actionType: "send_mass_campaign",
        payload: {},
      });
      const sinContexto = await approvals.list("00000000-0000-4000-8000-000000000000", "pending");
      expect(sinContexto).toHaveLength(0);
    });
  });
});
