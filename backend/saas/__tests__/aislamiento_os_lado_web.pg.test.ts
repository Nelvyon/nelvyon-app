/**
 * Aislamiento entre inquilinos de los servicios OS, contra PostgreSQL REAL.
 *
 * POR QUE NO VALE UN DOBLE DE BASE DE DATOS AQUI
 * -----------------------------------------------
 * Las pruebas unitarias de estos servicios usan un `SaasPostgresPort` falso y
 * comprueban el SQL que sale. Eso detecta que falte un `WHERE`, pero no
 * demuestra que el `WHERE` haga lo que promete: un filtro con el tipo mal, un
 * parametro en la posicion equivocada o un `::uuid` sobre un entero pasan la
 * inspeccion del texto y fallan contra el motor.
 *
 * Aqui se insertan filas de DOS inquilinos en una base real y se cuentan las que
 * vuelven por el camino del servicio.
 *
 * LAS CINCO PREGUNTAS, Y POR QUE LAS CINCO
 * -----------------------------------------
 *     A -> A     tiene que PODER              (control positivo)
 *     A -> B     no puede
 *     B -> B     tiene que PODER              (control positivo del otro lado)
 *     B -> A     no puede
 *     sin nadie  no puede                     (fail-closed)
 *
 * Los dos controles positivos no son adorno. Una implementacion que devuelva
 * cero filas SIEMPRE aprueba las tres negativas y no aisla nada: solo esta rota.
 * «Nadie ve nada» no es aislamiento, y sin A->A y B->B no se distinguen.
 *
 * POR QUE ESTOS SERVICIOS Y NO LA RLS
 * ------------------------------------
 * El servicio `@nelvyon/web` conecta a produccion como `postgres`, que es
 * SUPERUSUARIO: las 1.763 politicas RLS no se le aplican, y `FORCE ROW LEVEL
 * SECURITY` tampoco. En ese runtime el aislamiento depende ENTERAMENTE de que
 * cada consulta lo escriba, sin ninguna red debajo. Por eso se certifica la
 * consulta, que hoy es la unica defensa que hay.
 *
 * Se salta sin `NELVYON_WEB_CERT_DSN` para no exigir PostgreSQL a quien solo
 * corre las unitarias.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  OsRegulatedSectorShieldService,
  TODOS_LOS_INQUILINOS,
} from "../OsRegulatedSectorShieldService";
import { OsTruthGuardService } from "../OsTruthGuardService";
import { OsAgentAuditTrailService } from "../OsAgentAuditTrailService";
import { OsDeliveryCertificateService, TODOS_LOS_CERTIFICADOS } from "../OsDeliveryCertificateService";
import { OsAgentDataService, TODA_LA_CACHE } from "../OsAgentDataService";
import type { SaasPostgresPort } from "../SaasOnboardingService";

const DSN = process.env.NELVYON_WEB_CERT_DSN;
const describeSiHayPg = DSN ? describe : describe.skip;

const WS_A = 101;
const WS_B = 202;
const PACK_A = "aaaaaaaa-0000-4000-8000-000000000001";
const PACK_B = "bbbbbbbb-0000-4000-8000-000000000002";

let pool: import("pg").Pool;
let db: SaasPostgresPort;

describeSiHayPg("aislamiento OS del lado web (PostgreSQL real)", () => {
  beforeAll(async () => {
    const { Pool } = await import("pg");
    pool = new Pool({ connectionString: DSN, max: 4 });
    db = {
      query: async <T>(sql: string, params?: unknown[]) =>
        (await pool.query(sql, params as never[])).rows as T[],
    } as unknown as SaasPostgresPort;
  });

  afterAll(async () => { await pool?.end(); });

  beforeEach(async () => {
    await pool.query("TRUNCATE os_truth_guard_audits, os_agent_audit_events, os_sector_shield_audits, os_delivery_certificates, os_agent_data_cache");
    for (const [ws, pack] of [[WS_A, PACK_A], [WS_B, PACK_B]] as const) {
      // La marca lleva el numero de workspace DENTRO del contenido. Asi, si una
      // consulta se colara, no habria que deducirlo de un recuento: la fila
      // ajena se reconoce por su texto.
      const marca = `pertenece-al-workspace-${ws}`;
      await pool.query(
        `INSERT INTO os_truth_guard_audits (channel, workspace_id, pack_run_id, status, violations, content_preview)
         VALUES ('landing',$1,$2::uuid,'blocked',$3::jsonb,$4),
                ('email',  $1,$2::uuid,'passed', '[]'::jsonb,$4)`,
        [ws, pack, JSON.stringify([`afirmacion prohibida de ${marca}`]), marca]);
      await pool.query(
        `INSERT INTO os_agent_audit_events (pack_run_id, sku, workspace_id, agent_id, output_artifact)
         VALUES ($2::uuid,$3,$1,'redactor',$4),
                ($2::uuid,$3,$1,'revisor', $4)`,
        [ws, pack, `SKU-${marca}`, `texto de ${marca}`]);
      await pool.query(
        `INSERT INTO os_sector_shield_audits (sector_id, workspace_id, pack_run_id, status, claims_violations)
         VALUES ('dental',$1,$2::uuid,'blocked',$3::jsonb)`,
        [ws, pack, JSON.stringify([`curacion garantizada de ${marca}`])]);
      await pool.query(
        `INSERT INTO os_delivery_certificates (pack_run_id, pack_id, workspace_id, status, qa_score, html_body)
         VALUES ($2::uuid,$3,$1,'issued',90,$4)`,
        [ws, pack, `PACK-${marca}`, `<html>entregable de ${marca}</html>`]);
      await pool.query(
        `INSERT INTO os_agent_data_cache (tenant_id, provider, query_type, query_key, domain, expires_at, payload)
         VALUES ($1,'semrush','keywords',$2,$3, NOW() + INTERVAL '1 hour', $4::jsonb)`,
        [String(ws), `clave-${marca}`, `dominio-${ws}.example`,
         JSON.stringify({ keywords: [marca] })]);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Shield — ya corregido; aqui se demuestra contra el motor
  // ═══════════════════════════════════════════════════════════════════════════

  describe("shield de sector regulado", () => {
    const svc = () => new OsRegulatedSectorShieldService(
      db, { isRegulated: async () => true },
      { runVisualLegal: async () => ({ legal_passed: true, prohibited_terms: [] }) });

    it("A ve lo suyo (control positivo)", async () => {
      const filas = await svc().listAudits({ workspaceId: WS_A });
      expect(filas.length).toBeGreaterThan(0);
      expect(filas.every((f) => f.claimsViolations.some((v) => v.includes(`workspace-${WS_A}`)))).toBe(true);
    });

    it("A no ve nada de B", async () => {
      const filas = await svc().listAudits({ workspaceId: WS_A });
      expect(filas.some((f) => JSON.stringify(f).includes(`workspace-${WS_B}`))).toBe(false);
    });

    it("B ve lo suyo (control positivo del otro lado)", async () => {
      const filas = await svc().listAudits({ workspaceId: WS_B });
      expect(filas.length).toBeGreaterThan(0);
    });

    it("B no ve nada de A", async () => {
      const filas = await svc().listAudits({ workspaceId: WS_B });
      expect(filas.some((f) => JSON.stringify(f).includes(`workspace-${WS_A}`))).toBe(false);
    });

    it("sin inquilino, denegado (no «todo»)", async () => {
      // @ts-expect-error se comprueba el guardia en ejecucion, no el tipo
      await expect(svc().listAudits(undefined)).rejects.toThrow();
    });

    it("el resumen tambien cuenta solo lo del inquilino", async () => {
      const a = await svc().getSummary({ workspaceId: WS_A });
      const todos = await svc().getSummary(TODOS_LOS_INQUILINOS);
      expect(a.total).toBeGreaterThan(0);
      expect(todos.total).toBeGreaterThan(a.total);
    });

    it("una auditoria nueva no puede escribirse en el inquilino ajeno por accidente", async () => {
      await svc().evaluateAndPersist(
        { sectorId: "dental", htmlOrText: "texto sin disclaimer" }, { workspaceId: WS_A });
      const deB = await svc().listAudits({ workspaceId: WS_B });
      expect(deB).toHaveLength(1); // solo la sembrada; la nueva es de A
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Truth guard — hoy el alcance es OPCIONAL, y omitirlo devuelve todo
  // ═══════════════════════════════════════════════════════════════════════════

  describe("truth guard", () => {
    const svc = () => new OsTruthGuardService(db);

    it("A ve lo suyo (control positivo)", async () => {
      const filas = await svc().listAudits({ workspaceId: WS_A });
      expect(filas.length).toBeGreaterThan(0);
    });

    it("A no ve nada de B", async () => {
      const filas = await svc().listAudits({ workspaceId: WS_A });
      expect(filas.some((f) => JSON.stringify(f).includes(`workspace-${WS_B}`))).toBe(false);
    });

    it("B ve lo suyo (control positivo del otro lado)", async () => {
      expect((await svc().listAudits({ workspaceId: WS_B })).length).toBeGreaterThan(0);
    });

    it("B no ve nada de A", async () => {
      const filas = await svc().listAudits({ workspaceId: WS_B });
      expect(filas.some((f) => JSON.stringify(f).includes(`workspace-${WS_A}`))).toBe(false);
    });

    it("sin inquilino, denegado (no «todo»)", async () => {
      // LA PRUEBA. Hoy `workspaceId` es opcional: omitirlo devuelve las
      // auditorias de TODOS los inquilinos en vez de negar.
      // @ts-expect-error se comprueba el guardia en ejecucion, no el tipo
      await expect(svc().listAudits(undefined)).rejects.toThrow();
    });

    it("el resumen tambien acota", async () => {
      const a = await svc().getSummary({ workspaceId: WS_A });
      expect(a.total).toBe(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Rastro de agentes — mismo patron de alcance opcional
  // ═══════════════════════════════════════════════════════════════════════════

  describe("rastro de auditoria de agentes", () => {
    const svc = () => new OsAgentAuditTrailService(db);

    it("A ve lo suyo (control positivo)", async () => {
      expect((await svc().listEvents({ workspaceId: WS_A })).length).toBeGreaterThan(0);
    });

    it("A no ve nada de B", async () => {
      const ev = await svc().listEvents({ workspaceId: WS_A });
      expect(ev.some((e) => JSON.stringify(e).includes(`workspace-${WS_B}`))).toBe(false);
    });

    it("B ve lo suyo (control positivo del otro lado)", async () => {
      expect((await svc().listEvents({ workspaceId: WS_B })).length).toBeGreaterThan(0);
    });

    it("B no ve nada de A", async () => {
      const ev = await svc().listEvents({ workspaceId: WS_B });
      expect(ev.some((e) => JSON.stringify(e).includes(`workspace-${WS_A}`))).toBe(false);
    });

    it("sin inquilino, denegado (no «todo»)", async () => {
      // @ts-expect-error se comprueba el guardia en ejecucion, no el tipo
      await expect(svc().listEvents(undefined)).rejects.toThrow();
    });

    it("el rastro de un pack ajeno no se entrega pidiendolo por id", async () => {
      // El `packRunId` viene del cliente. Sin acotar, conocerlo —o adivinarlo—
      // basta para leer el rastro completo de otro inquilino: que agente hizo
      // que, con que modelo y con que resultado de QA.
      const ajeno = await svc().getTrailForPackRun(PACK_B, { workspaceId: WS_A });
      expect(ajeno).toHaveLength(0);
      const propio = await svc().getTrailForPackRun(PACK_A, { workspaceId: WS_A });
      expect(propio.length).toBeGreaterThan(0); // control positivo
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Certificados de entrega — 674 filas reales en produccion, con `html_body`
  // ═══════════════════════════════════════════════════════════════════════════

  describe("certificados de entrega", () => {
    // `packRuns` es obligatorio en el constructor; estas pruebas solo tocan
    // lecturas, asi que un puerto que no responde nada es suficiente y ademas
    // garantiza que ninguna de ellas dependa de el sin que se note.
    const svc = () => new OsDeliveryCertificateService(
      db, { getPackRun: async () => null } as never);

    it("A ve los suyos (control positivo)", async () => {
      const l = await svc().listCertificates({ workspaceId: WS_A });
      expect(l.length).toBeGreaterThan(0);
    });

    it("A no ve ninguno de B", async () => {
      const l = await svc().listCertificates({ workspaceId: WS_A });
      expect(l.some((c) => JSON.stringify(c).includes(`workspace-${WS_B}`))).toBe(false);
    });

    it("B ve los suyos (control positivo del otro lado)", async () => {
      expect((await svc().listCertificates({ workspaceId: WS_B })).length).toBeGreaterThan(0);
    });

    it("B no ve ninguno de A", async () => {
      const l = await svc().listCertificates({ workspaceId: WS_B });
      expect(l.some((c) => JSON.stringify(c).includes(`workspace-${WS_A}`))).toBe(false);
    });

    it("sin inquilino, denegado (no «todos»)", async () => {
      // @ts-expect-error se comprueba el guardia en ejecucion, no el tipo
      await expect(svc().listCertificates(undefined)).rejects.toThrow();
    });

    it("el certificado de otro no se descarga pidiendolo por su pack", async () => {
      // `html_body` es el entregable COMPLETO del cliente. Conocer el packRunId
      // bastaba para bajarselo.
      expect(await svc().getByPackRun(PACK_B, { workspaceId: WS_A })).toBeNull();
      expect(await svc().getByPackRun(PACK_A, { workspaceId: WS_A })).not.toBeNull();
    });

    it("pedir por id un certificado ajeno da NOT_FOUND, no el certificado", async () => {
      const ajeno = (await svc().listCertificates({ workspaceId: WS_B }))[0]!;
      await expect(svc().getCertificate(ajeno.id, { workspaceId: WS_A })).rejects.toThrow();
      // control positivo: el propio si se entrega
      const propio = (await svc().listCertificates({ workspaceId: WS_A }))[0]!;
      expect((await svc().getCertificate(propio.id, { workspaceId: WS_A })).id).toBe(propio.id);
    });

    it("el resumen no promedia la calidad de entrega de los demas", async () => {
      const a = await svc().getSummary({ workspaceId: WS_A });
      const todos = await svc().getSummary(TODOS_LOS_CERTIFICADOS);
      expect(a.total).toBe(1);
      expect(todos.total).toBe(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Cache de datos de agentes — `tenant_id` aqui es TEXT, no uuid
  // ═══════════════════════════════════════════════════════════════════════════

  describe("cache de datos de agentes", () => {
    // Los puertos externos se inyectan para que estas pruebas no intenten
    // cargar los adaptadores de SEMrush/DataForSeo: aqui se certifica el
    // aislamiento de la cache, no la integracion con el proveedor.
    const svc = () => new OsAgentDataService(
      db,
      { isConfigured: () => false } as never,
      { isConfigured: () => false } as never);

    it("A ve lo suyo (control positivo)", async () => {
      const r = await svc().listRecent({ tenantId: String(WS_A) });
      expect(r.length).toBeGreaterThan(0);
    });

    it("A no ve la cache de B", async () => {
      const r = await svc().listRecent({ tenantId: String(WS_A) });
      expect(r.some((x) => JSON.stringify(x).includes(`dominio-${WS_B}`))).toBe(false);
    });

    it("B ve lo suyo (control positivo del otro lado)", async () => {
      expect((await svc().listRecent({ tenantId: String(WS_B) })).length).toBeGreaterThan(0);
    });

    it("sin inquilino, denegado (no «toda la cache»)", async () => {
      // @ts-expect-error se comprueba el guardia en ejecucion, no el tipo
      await expect(svc().listRecent(undefined)).rejects.toThrow();
    });

    it("la vista global sigue disponible para el administrador", async () => {
      const todos = await svc().getSummary(TODA_LA_CACHE);
      const a = await svc().getSummary({ tenantId: String(WS_A) });
      expect(todos.totalCached).toBe(2);
      expect(a.totalCached).toBe(1);
    });

    it("la cache de un inquilino no se sirve a otro", async () => {
      // Es lo que hace peligrosa una cache: acertar la clave devuelve el
      // resultado ya calculado de otro. Aqui la clave lleva la marca del
      // inquilino, pero un atacante la construiria igual: lo que separa es el
      // `tenant_id`, no lo dificil que sea adivinar la clave.
      const claveDeB = `clave-pertenece-al-workspace-${WS_B}`;
      expect(await svc().getCached(claveDeB, "keywords", String(WS_A))).toBeNull();
      expect(await svc().getCached(claveDeB, "keywords", String(WS_B))).not.toBeNull();
    });
  });
});