/**
 * BLOQUE 2 · lote 5 — inbox/helpdesk, packs y entregables.
 *
 * El inbox es donde el cliente habla con SUS clientes: un mensaje que se cruza de
 * inquilino no es una fuga de datos, es una conversación entregada a la persona
 * equivocada.
 *
 * Los packs llevan aparejado un CONSUMO: cada lanzamiento gasta un derecho. Ahí
 * lo que hay que probar no es que funcione una vez, sino que dos lanzamientos
 * simultáneos no gasten un solo derecho dos veces — o al revés, que uno gaste
 * dos.
 *
 * Contra PostgreSQL real, con los servicios REALES.
 *
 * Se salta sin `NELVYON_B2_DSN`.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { SaasDeliverablesHubService } from "../SaasDeliverablesHubService";
import { SaasInboxService } from "../SaasInboxService";
import { SaasPackStoreService } from "../SaasPackStoreService";

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

async function sembrarContacto(inquilino: string, nombre: string): Promise<string> {
  const r = await pool.query<{ id: string }>(
    `INSERT INTO saas_contacts (tenant_id, name, email, status, pipeline_stage, value, updated_at)
     VALUES ($1, $2, $3, 'lead', 'new', 0, NOW()) RETURNING id`,
    [inquilino, nombre, `${nombre.toLowerCase().replace(/ /g, ".")}@cliente.test`]);
  return r.rows[0]!.id;
}

describeSiHayPg("BLOQUE 2 · lote 5", () => {
  beforeAll(async () => {
    const { Pool } = await import("pg");
    pool = new Pool({ connectionString: DSN, max: 8 });
    await sembrarInquilinos();
  });

  afterAll(async () => { await pool?.end(); });

  // ══════════════════════════════════════════════════════════════════════════
  // inbox / helpdesk
  // ══════════════════════════════════════════════════════════════════════════

  describe("inbox", () => {
    let svc: SaasInboxService;
    beforeAll(() => { svc = new SaasInboxService(puerto() as never); });
    beforeEach(async () => {
      await pool.query("DELETE FROM saas_conversation_messages WHERE tenant_id = ANY($1)", [[A, B]]).catch(() => {});
      await pool.query("DELETE FROM saas_conversations WHERE tenant_id = ANY($1)", [[A, B]]).catch(() => {});
      await pool.query("DELETE FROM saas_contacts WHERE tenant_id = ANY($1)", [[A, B]]);
    });

    it("crear conversación → releer conserva su contacto", async () => {
      const contacto = await sembrarContacto(A, "Persona Que Escribe");
      const c = await svc.createConversation(A, { contactId: contacto, channel: "email" } as never);

      const leida = await svc.getConversation(A, c.id);
      expect(leida?.id).toBe(c.id);
    });

    it("un mensaje enviado queda en el hilo y se relee", async () => {
      const contacto = await sembrarContacto(A, "Persona Que Escribe");
      const c = await svc.createConversation(A, { contactId: contacto, channel: "email" } as never);
      await svc.sendMessage(A, c.id, { body: "Hola, ¿en qué puedo ayudarte?", direction: "outbound" } as never);

      const mensajes = await svc.listMessages(A, c.id);
      expect(mensajes.length).toBeGreaterThan(0);
      expect(mensajes[0]?.body).toContain("ayudarte");
    });

    it("EL CONTROL: B no lee la conversación de A ni sus mensajes", async () => {
      // Un mensaje que se cruza de inquilino no es una fuga: es una conversación
      // entregada a la persona equivocada.
      const contacto = await sembrarContacto(A, "Persona Que Escribe");
      const c = await svc.createConversation(A, { contactId: contacto, channel: "email" } as never);
      await svc.sendMessage(A, c.id, { body: "Secreto de A", direction: "outbound" } as never);

      expect(await svc.getConversation(B, c.id)).toBeNull();
      const deB = await svc.listMessages(B, c.id).catch(() => []);
      expect(JSON.stringify(deB)).not.toContain("Secreto de A");
    });

    it("B no puede responder en la conversación de A", async () => {
      const contacto = await sembrarContacto(A, "Persona Que Escribe");
      const c = await svc.createConversation(A, { contactId: contacto, channel: "email" } as never);
      await svc.replyToConversation(B, c.id, "Respuesta intrusa").catch(() => {});

      const mensajes = await svc.listMessages(A, c.id);
      expect(JSON.stringify(mensajes)).not.toContain("Respuesta intrusa");
    });

    it("la política de SLA se guarda y se relee", async () => {
      await svc.setSlaPolicy(A, { firstResponseMinutes: 45 } as never);
      const p = await svc.getSlaPolicy(A);
      expect(Number(p.firstResponseMinutes)).toBe(45);
    });

    it("la política de A no es la de B", async () => {
      await svc.setSlaPolicy(A, { firstResponseMinutes: 45 } as never);
      await svc.setSlaPolicy(B, { firstResponseMinutes: 120 } as never);
      expect(Number((await svc.getSlaPolicy(A)).firstResponseMinutes)).toBe(45);
      expect(Number((await svc.getSlaPolicy(B)).firstResponseMinutes)).toBe(120);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // packs — derechos y consumo
  // ══════════════════════════════════════════════════════════════════════════

  describe("packs", () => {
    let svc: SaasPackStoreService;
    beforeAll(() => { svc = new SaasPackStoreService(puerto() as never); });
    beforeEach(async () => {
      await pool.query("DELETE FROM saas_pack_launches WHERE tenant_id = ANY($1)", [[A, B]]).catch(() => {});
      await pool.query("DELETE FROM saas_pack_entitlements WHERE tenant_id = ANY($1)", [[A, B]]).catch(() => {});
    });

    /** El primer pack del catálogo, sea cual sea: no se inventa un id.
     *
     * `getCatalog` es del PUERTO, no del servicio; el del servicio es
     * `getStoreCatalog(tenantId)`. Llamar al que no es da un «is not a function»
     * que parece un servicio roto y es la prueba equivocándose de método.
     */
    async function unPack(): Promise<string> {
      const catalogo = await svc.getStoreCatalog(A);
      const lista = (Array.isArray(catalogo) ? catalogo
        : (catalogo as { packs?: unknown[] }).packs ?? []) as Array<{ id?: string; packId?: string }>;
      return String(lista[0]?.id ?? lista[0]?.packId);
    }

    it("el catálogo existe y no está vacío", async () => {
      const c = await svc.getStoreCatalog(A);
      expect(Array.isArray(c) ? c.length : Object.keys(c as object).length).toBeGreaterThan(0);
    });

    it("los derechos del plan se conceden y se releen", async () => {
      await svc.grantFromPlan(A);
      const derechos = await svc.listEntitlements(A);
      expect(derechos.length).toBeGreaterThan(0);
    });

    it("EL CONTROL: los derechos de A no son los de B", async () => {
      await svc.grantFromPlan(A);
      const deB = await svc.listEntitlements(B);
      const deA = await svc.listEntitlements(A);
      expect(deA.length).toBeGreaterThan(0);        // control positivo
      expect(deB.length).toBe(0);
    });

    it("consumir un lanzamiento GASTA cupo", async () => {
      // El contrato real: `consumeLaunch` decrementa el derecho. La tabla
      // `saas_pack_launches` la escribe otro servicio —`SaasBriefToLaunchService`—
      // y no este. Mi primera versión la miraba a ella y parecía que el consumo
      // no dejaba rastro: era la prueba mirando el sitio equivocado.
      await svc.grantFromPlan(A);
      const pack = await unPack();

      const antes = await pool.query<{ launches_remaining: number; launches_used: number }>(
        "SELECT launches_remaining, launches_used FROM saas_pack_entitlements WHERE tenant_id=$1 AND pack_id=$2 AND status='active'",
        [A, pack]);
      await svc.consumeLaunch(A, pack);
      const despues = await pool.query<{ launches_remaining: number; launches_used: number }>(
        "SELECT launches_remaining, launches_used FROM saas_pack_entitlements WHERE tenant_id=$1 AND pack_id=$2 AND status='active'",
        [A, pack]);

      expect(Number(despues.rows[0]!.launches_used))
        .toBe(Number(antes.rows[0]!.launches_used) + 1);
      expect(Number(despues.rows[0]!.launches_remaining))
        .toBe(Number(antes.rows[0]!.launches_remaining) - 1);
    });

    it("cuatro consumos SIMULTÁNEOS gastan exactamente cuatro", async () => {
      // Un consumo es gasto. Si el decremento fuera leer-y-luego-escribir, cuatro
      // lanzamientos a la vez gastarían menos de cuatro: el cliente pagaría uno y
      // usaría varios. Aquí se exige la cuenta exacta.
      await svc.grantFromPlan(A);
      const pack = await unPack();
      // Cupo de sobra para que el suelo en 0 no enmascare una pérdida.
      await pool.query(
        "UPDATE saas_pack_entitlements SET launches_remaining = 50, launches_used = 0 WHERE tenant_id=$1 AND pack_id=$2 AND status='active'",
        [A, pack]);

      await Promise.all(Array.from({ length: 4 }, () => svc.consumeLaunch(A, pack)));

      const fila = await pool.query<{ launches_used: number; launches_remaining: number }>(
        "SELECT launches_used, launches_remaining FROM saas_pack_entitlements WHERE tenant_id=$1 AND pack_id=$2 AND status='active'",
        [A, pack]);
      expect(Number(fila.rows[0]!.launches_used)).toBe(4);
      expect(Number(fila.rows[0]!.launches_remaining)).toBe(46);
    });

    it("B no puede gastar el cupo de A", async () => {
      // Gastar el cupo ajeno es robo silencioso: el cliente descubre que no le
      // quedan lanzamientos sin haber lanzado nada.
      await svc.grantFromPlan(A);
      const pack = await unPack();
      await pool.query(
        "UPDATE saas_pack_entitlements SET launches_remaining = 50, launches_used = 0 WHERE tenant_id=$1 AND pack_id=$2 AND status='active'",
        [A, pack]);

      await svc.consumeLaunch(B, pack).catch(() => {});

      const fila = await pool.query<{ launches_used: number }>(
        "SELECT launches_used FROM saas_pack_entitlements WHERE tenant_id=$1 AND pack_id=$2 AND status='active'",
        [A, pack]);
      expect(Number(fila.rows[0]!.launches_used)).toBe(0);
    });

    it("B no puede revocar el derecho de A", async () => {
      await svc.grantFromPlan(A);
      const pack = await unPack();

      await svc.revokeEntitlement(B, pack).catch(() => {});
      expect((await svc.listEntitlements(A)).length).toBeGreaterThan(0);
    });

    it("revocar marca la fila como revocada", async () => {
      await svc.grantFromPlan(A);
      const pack = await unPack();
      await svc.revokeEntitlement(A, pack);

      const fila = await pool.query<{ status: string }>(
        "SELECT status FROM saas_pack_entitlements WHERE tenant_id=$1 AND pack_id=$2 ORDER BY updated_at DESC LIMIT 1",
        [A, pack]);
      expect(fila.rows[0]?.status).toBe("revoked");
    });

    it("HALLAZGO: revocar un pack INCLUIDO EN EL PLAN no dura", async () => {
      // Esto NO afirma que esté bien: documenta lo que hay.
      //
      // `canLaunch` llama a `ensurePlanEntitlements` ANTES de comprobar nada, y
      // eso vuelve a conceder lo que el plan incluye. El índice único es parcial
      // —solo cubre `status='active'`—, así que la fila revocada no estorba y se
      // crea otra activa. Resultado: revocar un pack del plan informa de éxito y
      // en la siguiente lectura vuelve a estar permitido.
      //
      // Puede ser lo pretendido —el plan como fuente de verdad— o puede ser que
      // `revokeEntitlement` prometa más de lo que puede cumplir. Es semántica de
      // producto y no la decido yo. Cuando se decida, esta prueba se invierte.
      await svc.grantFromPlan(A);
      const pack = await unPack();
      await svc.revokeEntitlement(A, pack);

      const tras = await svc.canLaunch(A, pack);
      expect(tras.allowed).toBe(true);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // entregables
  // ══════════════════════════════════════════════════════════════════════════

  describe("entregables", () => {
    let svc: SaasDeliverablesHubService;
    beforeAll(() => { svc = new SaasDeliverablesHubService(puerto() as never); });

    it("el listado responde y no mezcla inquilinos", async () => {
      const deA = await svc.listDeliverables(A);
      const deB = await svc.listDeliverables(B);
      expect(Array.isArray(deA)).toBe(true);
      // Ninguno de A puede aparecer en B; con las listas vacías la comprobación
      // sigue siendo cierta y el resumen de abajo cubre el control positivo.
      const idsA = new Set(deA.map((x) => x.id));
      expect(deB.some((x) => idsA.has(x.id))).toBe(false);
    });

    it("el resumen responde con estructura, no con un objeto vacío", async () => {
      const r = await svc.getSummary(A);
      expect(r).toBeTruthy();
      expect(Object.keys(r as object).length).toBeGreaterThan(0);
    });

    it("un entregable de otro inquilino no se lee por id", async () => {
      const deA = await svc.listDeliverables(A);
      if (deA.length === 0) return;   // sin datos no hay nada que cruzar
      expect(await svc.getDeliverable(B, deA[0]!.id)).toBeNull();
    });
  });
});
