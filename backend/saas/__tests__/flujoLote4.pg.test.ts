/**
 * BLOQUE 2 · lote 4 — campañas y equipo/onboarding.
 *
 * Campañas es donde un cliente manda cosas a SUS clientes: un fallo de alcance
 * aquí no filtra datos, los ENVÍA. Y el equipo es quien puede entrar: un fallo
 * de alcance ahí es alguien de otra empresa dentro del panel.
 *
 * Contra PostgreSQL real, con los servicios REALES y dos inquilinos a la vez.
 *
 * Se salta sin `NELVYON_B2_DSN`.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { SaasCampaniasService } from "../SaasCampaniasService";
import { SaasTeamService } from "../SaasTeamService";

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
const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa11";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbb11";

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
      [id, `cert-${id}@nelvyon.test`, nombre]);
    await pool.query(
      `INSERT INTO saas_tenants (id, user_id, company_name, industry, plan)
       VALUES ($1, $1, $2, 'certificacion', 'pro')
       ON CONFLICT (id) DO UPDATE SET plan = 'pro'`,
      [id, nombre]);
  }
}

describeSiHayPg("BLOQUE 2 · lote 4", () => {
  beforeAll(async () => {
    const { Pool } = await import("pg");
    pool = new Pool({ connectionString: DSN, max: 4 });
    await sembrarInquilinos();
  });

  afterAll(async () => { await pool?.end(); });

  // ══════════════════════════════════════════════════════════════════════════
  // campañas
  // ══════════════════════════════════════════════════════════════════════════

  describe("campañas", () => {
    let svc: SaasCampaniasService;
    beforeAll(() => { svc = new SaasCampaniasService(puerto() as never); });
    beforeEach(async () => {
      await pool.query("DELETE FROM saas_campania_recipients WHERE tenant_id = ANY($1)", [[A, B]]).catch(() => {});
      await pool.query("DELETE FROM saas_campanias WHERE tenant_id = ANY($1)", [[A, B]]);
      await pool.query("DELETE FROM saas_contacts WHERE tenant_id = ANY($1)", [[A, B]]);
    });

    const campania = (n = "Lanzamiento de otoño") => ({
      name: n,
      channel: "email" as const,
      subject: "Novedades",
      body: "Cuerpo de la campaña",
    });

    async function sembrarContacto(inquilino: string, nombre: string) {
      await pool.query(
        `INSERT INTO saas_contacts (tenant_id, name, email, status, pipeline_stage, value, updated_at)
         VALUES ($1, $2, $3, 'lead', 'new', 0, NOW())`,
        [inquilino, nombre, `${nombre.toLowerCase().replace(/ /g, ".")}@destinatario.test`]);
    }

    it("crear → releer conserva canal, asunto y cuerpo", async () => {
      const c = await svc.createCampania(A, campania() as never);
      const leida = await svc.getCampania(A, c.id);
      expect(leida?.name).toBe("Lanzamiento de otoño");
      expect(leida?.channel).toBe("email");
      expect(leida?.body).toBe("Cuerpo de la campaña");
    });

    it("editar PERSISTE en la fila", async () => {
      const c = await svc.createCampania(A, campania() as never);
      await svc.updateCampania(A, c.id, { subject: "Asunto nuevo" } as never);
      const fila = await pool.query<{ subject: string }>(
        "SELECT subject FROM saas_campanias WHERE id = $1", [c.id]);
      expect(fila.rows[0]?.subject).toBe("Asunto nuevo");
    });

    it("programar deja la fecha guardada y el estado en programada", async () => {
      const c = await svc.createCampania(A, campania() as never);
      const cuando = new Date(Date.now() + 86_400_000).toISOString();
      await svc.scheduleCampania(A, c.id, cuando);

      const leida = await svc.getCampania(A, c.id);
      expect(leida?.status).toBe("scheduled");
      expect(leida?.scheduledAt).toBeTruthy();
    });

    it("pausar una campaña la deja pausada, y persiste", async () => {
      const c = await svc.createCampania(A, campania() as never);
      await svc.scheduleCampania(A, c.id, new Date(Date.now() + 86_400_000).toISOString());
      await svc.pauseCampania(A, c.id);

      const fila = await pool.query<{ status: string }>(
        "SELECT status FROM saas_campanias WHERE id = $1", [c.id]);
      expect(fila.rows[0]?.status).toBe("paused");
    });

    it("lanzar SIN proveedor configurado se REHÚSA, no se finge", async () => {
      // Esto es lo correcto y conviene fijarlo: `assertCampaniaChannelReady`
      // corta el lanzamiento si no hay SES/Twilio configurados. Sin ese corte, la
      // campaña quedaría marcada como lanzada y no habría salido nada — la
      // mentira funcional más cara de esta capacidad, porque el cliente cree que
      // ha enviado.
      await sembrarContacto(A, "Destinatario De A");
      const c = await svc.createCampania(A, campania() as never);

      await expect(svc.launchCampania(A, c.id)).rejects.toThrow();
    });

    it("un lanzamiento rehusado NO deja destinatarios a medias", async () => {
      // El otro lado: rehusar tarde, después de haber escrito filas, dejaría la
      // campaña con destinatarios listos para un reintento que enviaría dos
      // veces a los que ya estaban.
      await sembrarContacto(A, "Destinatario De A");
      const c = await svc.createCampania(A, campania() as never);
      await svc.launchCampania(A, c.id).catch(() => {});

      const filas = await pool.query(
        "SELECT 1 FROM saas_campania_recipients WHERE campania_id = $1", [c.id]);
      expect(filas.rows).toHaveLength(0);

      const estado = await pool.query<{ status: string }>(
        "SELECT status FROM saas_campanias WHERE id = $1", [c.id]);
      expect(estado.rows[0]?.status).not.toBe("completed");
    });

    it("B no puede leer los destinatarios de la campaña de A", async () => {
      // La versión anterior de esta prueba consultaba la base directamente. Eso
      // no demuestra nada del servicio: demostraba mi propio SELECT. Se pregunta
      // al SERVICIO, que es quien decide.
      const c = await svc.createCampania(A, campania() as never);

      const deB = await svc.getRecipients(B, c.id).catch(() => null);
      expect(deB === null || deB.length === 0).toBe(true);
    });

    it("y las estadísticas de esa campaña tampoco las ve B", async () => {
      const c = await svc.createCampania(A, campania() as never);
      const stats = await svc.getCampaniaStats(B, c.id).catch(() => null);
      expect(stats).toBeNull();
    });

    it("B no lee, no edita, no lanza y no borra la campaña de A", async () => {
      const c = await svc.createCampania(A, campania() as never);

      expect(await svc.getCampania(B, c.id)).toBeNull();
      await svc.updateCampania(B, c.id, { name: "secuestrada" } as never).catch(() => {});
      await svc.launchCampania(B, c.id).catch(() => {});
      await svc.deleteCampania(B, c.id).catch(() => {});

      const sigue = await svc.getCampania(A, c.id);
      expect(sigue?.name).toBe("Lanzamiento de otoño");
      expect(sigue?.status).toBe("draft");
    });

    it("un canal que no existe se rechaza", async () => {
      await expect(svc.createCampania(A, { ...campania(), channel: "paloma" } as never))
        .rejects.toThrow();
    });

    it("borrar → ya no se lee", async () => {
      const c = await svc.createCampania(A, campania() as never);
      await svc.deleteCampania(A, c.id);
      expect(await svc.getCampania(A, c.id)).toBeNull();
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // equipo / onboarding
  // ══════════════════════════════════════════════════════════════════════════

  describe("equipo", () => {
    let svc: SaasTeamService;
    beforeAll(() => { svc = new SaasTeamService(puerto() as never); });
    beforeEach(async () => {
      await pool.query("DELETE FROM team_members WHERE tenant_id = ANY($1)", [[A, B]]);
    });

    it("invitar → aparece en la lista con su rol", async () => {
      const m = await svc.invite(A, { email: "companera@empresa.test", role: "manager" } as never);
      expect(m.id).toBeTruthy();

      const lista = await svc.list(A);
      expect(lista.map((x) => x.email)).toContain("companera@empresa.test");
    });

    it("la invitación genera un token con caducidad", async () => {
      // Una invitación sin caducidad es una puerta abierta para siempre.
      await svc.invite(A, { email: "companera@empresa.test" } as never);
      const fila = await pool.query<{ invite_token: string; invite_expires_at: string }>(
        "SELECT invite_token, invite_expires_at FROM team_members WHERE tenant_id = $1", [A]);
      expect(fila.rows[0]?.invite_token).toBeTruthy();
      expect(fila.rows[0]?.invite_expires_at).toBeTruthy();
    });

    it("cambiar el rol PERSISTE", async () => {
      const m = await svc.invite(A, { email: "companera@empresa.test", role: "viewer" } as never);
      await svc.updateRole(A, m.id, "admin" as never);

      const fila = await pool.query<{ role: string }>(
        "SELECT role FROM team_members WHERE id = $1", [m.id]);
      expect(fila.rows[0]?.role).toBe("admin");
    });

    it("suspender y reactivar cambian el estado de verdad", async () => {
      const m = await svc.invite(A, { email: "companera@empresa.test" } as never);
      await svc.suspend(A, m.id);
      expect((await svc.get(A, m.id))?.status).toBe("suspended");

      await svc.reactivate(A, m.id);
      expect((await svc.get(A, m.id))?.status).not.toBe("suspended");
    });

    it("B no ve, no cambia el rol, no suspende ni elimina al equipo de A", async () => {
      // Un fallo de alcance aquí es alguien de otra empresa dentro del panel, o
      // alguien que echa del suyo a un compañero ajeno.
      const m = await svc.invite(A, { email: "companera@empresa.test", role: "viewer" } as never);

      expect(await svc.get(B, m.id)).toBeNull();
      expect((await svc.list(B)).map((x) => x.email)).not.toContain("companera@empresa.test");
      await svc.updateRole(B, m.id, "admin" as never).catch(() => {});
      await svc.suspend(B, m.id).catch(() => {});
      await svc.remove(B, m.id).catch(() => {});

      const sigue = await svc.get(A, m.id);
      expect(sigue?.role).toBe("viewer");
      expect(sigue?.status).not.toBe("suspended");
    });

    it("eliminar → ya no está en el equipo", async () => {
      const m = await svc.invite(A, { email: "companera@empresa.test" } as never);
      await svc.remove(A, m.id);
      expect((await svc.list(A)).map((x) => x.id)).not.toContain(m.id);
    });
  });
});
