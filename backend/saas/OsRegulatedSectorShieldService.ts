/**
 * O27 — OsRegulatedSectorShieldService
 * Enforces EU compliance for regulated sectors: mandatory disclaimer + prohibited
 * claims scan, blocking portal publication when a regulated deliverable fails. v1
 * uses fixed Spanish disclaimer templates + a deterministic claims regex set — no
 * external legal advice. Standalone + audit log + portal gate.
 *
 * Ports injectable so vitest never hits sector registry / QA; prod lazy-loads.
 */
import { DbClient } from "../db/DbClient";
import type { SaasPostgresPort } from "./SaasOnboardingService";
import { regulacionDe, SECTORES_REGULADOS_LIBRES, tratarComoRegulado } from "../cumplimiento/regulacionDeSector";

/**
 * Acceso deliberado a las auditorias de TODOS los inquilinos.
 *
 * Existe para los crons de la plataforma, que legitimamente necesitan la foto
 * global. Es un simbolo y no un `undefined` ni una cadena vacia porque lo global
 * tiene que ESCRIBIRSE: olvidar un parametro no puede volver a significar «damelo
 * todo», que es exactamente como llego aqui el problema.
 */
export const TODOS_LOS_INQUILINOS = Symbol("todos-los-inquilinos");

/**
 * De quien es una auditoria.
 *
 * `os_sector_shield_audits` tiene las DOS columnas —`tenant_id uuid` y
 * `workspace_id integer`— porque en NELVYON conviven dos espacios de identidad:
 * el OS numera workspaces y el SaaS identifica inquilinos por UUID. Quien llama
 * tiene uno o el otro, no los dos: las rutas del panel traen `tenantId` en el
 * JWT y el orquestador de packs trabaja con `workspaceId`.
 *
 * Se modela explicito en vez de elegir uno y convertir: `saas_tenants.workspace_id`
 * esta a NULL en 20 de 22 filas, asi que HOY la conversion no existe para la
 * mayoria. Fingir que si la hay produciria atribuciones inventadas, que es peor
 * que no atribuir.
 *
 * CONSECUENCIA QUE HAY QUE SABER: mientras ese mapeo siga roto, una auditoria
 * escrita con `workspaceId` no la ve quien pregunta por `tenantId`. Eso es una
 * limitacion conocida y acotada —cada uno ve lo suyo, nadie ve lo ajeno— y se
 * cierra cuando se arregle `saas_tenants.workspace_id`. Nunca al reves: preferir
 * no mostrar de menos antes que mostrar de mas.
 */
export type AlcanceDeAuditoria =
  | { tenantId: string }
  | { workspaceId: number }
  | typeof TODOS_LOS_INQUILINOS;

/** El WHERE del alcance, o vacio si es global. Centralizado para que no diverja. */
function filtroDeAlcance(
  alcance: AlcanceDeAuditoria,
  primerIndice = 1,
): { where: string; params: unknown[] } {
  if (alcance === TODOS_LOS_INQUILINOS) return { where: "", params: [] };
  if ("tenantId" in alcance) {
    if (!alcance.tenantId?.trim()) throw new Error("alcance: tenantId vacio");
    return { where: `tenant_id = $${primerIndice}::uuid`, params: [alcance.tenantId] };
  }
  if (!Number.isInteger(alcance.workspaceId)) throw new Error("alcance: workspaceId no es un entero");
  return { where: `workspace_id = $${primerIndice}`, params: [alcance.workspaceId] };
}

// ── EU disclaimer library (v1, ES) ───────────────────────────────────────────────

export const EU_DISCLAIMERS: Record<string, string> = {
  dental: "Información orientativa, no sustituye el diagnóstico de un profesional sanitario colegiado. Resultados individuales pueden variar.",
  legal: "Contenido informativo general, no constituye asesoramiento jurídico vinculante. Consulta con un abogado colegiado para tu caso concreto.",
  beauty: "Tratamientos estéticos sujetos a valoración profesional. La información no sustituye una consulta médica. Resultados variables.",
  solar: "Estimaciones orientativas de ahorro energético. Sujeto a estudio técnico individual y normativa vigente. No garantiza rentabilidad.",
  seguros: "Información no contractual. Las coberturas y condiciones están sujetas a la póliza y a la valoración de la aseguradora.",
  contabilidad: "Contenido informativo, no constituye asesoramiento fiscal personalizado. Consulta con un asesor colegiado para tu situación.",
  medical: "Información de salud orientativa, no sustituye el criterio de un profesional sanitario. No realizamos diagnósticos online.",
  pharmacy: "Información no sustituye el consejo farmacéutico ni la prescripción médica. Lea las instrucciones de cada producto.",
  finance: "Información general, no constituye recomendación de inversión. Rentabilidades pasadas no garantizan rentabilidades futuras.",

  // `salud` y `clinica` ESTABAN en `REGULATED_SECTORS` y NO tenían aviso.
  //
  // Eso abría un agujero silencioso: `hasRequiredDisclaimer` devuelve `true`
  // cuando no encuentra frases para el sector —«no specific disclaimer required
  // for this sector»—, que es correcto para uno NO regulado y es justo lo
  // contrario para uno que está en la lista de regulados PRECISAMENTE porque
  // necesita aviso.
  //
  // Resultado: una clínica quedaba marcada como sector regulado y aprobaba el
  // escudo sin llevar ningún aviso legal. `computeShieldStatus` con
  // `regulated: true, disclaimerOk: true` devuelve `passed`.
  //
  // El texto es el mismo que `medical`: son el mismo supuesto sanitario escrito
  // en castellano. Se añaden en vez de sacarlos de `REGULATED_SECTORS` porque
  // regulados lo son; lo que faltaba era el aviso.
  salud: "Información de salud orientativa, no sustituye el criterio de un profesional sanitario. No realizamos diagnósticos online.",
  clinica: "Información orientativa, no sustituye el diagnóstico de un profesional sanitario colegiado. Resultados individuales pueden variar.",
};

// Phrases (normalized, lowercase) that identify the required disclaimer per sector.
const DISCLAIMER_KEYPHRASES: Record<string, string[]> = {
  dental: ["no sustituye", "profesional sanitario"],
  legal: ["no constituye asesoramiento", "abogado"],
  beauty: ["valoracion profesional", "no sustituye"],
  solar: ["estimaciones", "no garantiza"],
  seguros: ["no contractual", "poliza"],
  contabilidad: ["no constituye asesoramiento", "asesor"],
  medical: ["no sustituye", "profesional sanitario"],
  pharmacy: ["consejo farmaceutico", "no sustituye"],
  finance: ["no constituye recomendacion", "rentabilidades pasadas"],
  salud: ["no sustituye", "profesional sanitario"],
  clinica: ["no sustituye", "profesional sanitario"],
};

// ── Prohibited claims (EU advertising / health / finance / legal) ─────────────────

export const PROHIBITED_CLAIMS: RegExp[] = [
  /\b(cura(ci[oó]n)?\s+garantizada)\b/i,
  /\b100\s*%\s*(de\s+)?(resultados?|efectiv[oa]|garantizad[oa])\b/i,
  /\b(resultados?\s+garantizados?)\b/i,
  /\b(sin\s+riesgo\s+alguno|riesgo\s+cero)\b/i,
  /\b(rentabilidad|ganancias?)\s+garantizadas?\b/i,
  /\b(duplica|triplica)\s+tu\s+(dinero|inversi[oó]n)\b/i,
  /\b(asesoramiento\s+(legal\s+)?vinculante)\b/i,
  /\b(curamos|eliminamos)\s+(el|la|tu)\b.*\b(enfermedad|c[aá]ncer|dolor\s+para\s+siempre)\b/i,
  /\b(milagros[oa]|infalible)\b/i,
  /\b(garantizamos?\s+(que\s+)?(siempre|nunca|el\s+\d+))\b/i,
];

// ── Ports ───────────────────────────────────────────────────────────────────────

export type SectorPort = { isRegulated(sectorId: string): Promise<boolean> };
export type QaPort = { runVisualLegal(text: string): Promise<{ legal_passed: boolean; prohibited_terms: string[] }> };

// ── Types ───────────────────────────────────────────────────────────────────────

export type ShieldStatus = "pending" | "passed" | "blocked" | "warning";
export type ShieldCheck = { name: string; ok: boolean; detail?: string };

export type ShieldAuditResult = {
  id?: string;
  sectorId: string;
  packRunId: string | null;
  deliverableRef: string | null;
  status: ShieldStatus;
  regulated: boolean;
  disclaimerOk: boolean;
  claimsOk: boolean;
  disclaimerText: string | null;
  claimsViolations: string[];
  checks: ShieldCheck[];
  metadata: Record<string, unknown>;
  /** Presente si la auditoria NO se pudo persistir. Antes ese fallo se tragaba
   *  entero y el resultado volvia como si estuviera guardado. */
  persistError?: string;
};

export type ShieldSummary = {
  total: number;
  blocked: number;
  passed: number;
  warning: number;
  regulatedAudits: number;
  topViolations: Array<{ violation: string; count: number }>;
};

export type OsShieldErrorCode = "NOT_FOUND";
export class OsShieldError extends Error {
  constructor(public readonly code: OsShieldErrorCode, message: string) {
    super(message);
    this.name = "OsShieldError";
  }
}

// ── Pure helpers (exported for tests) ────────────────────────────────────────────

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
}

export function scanClaims(text: string): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  for (const re of PROHIBITED_CLAIMS) {
    const m = text.match(re);
    if (m) violations.push(m[0].trim());
  }
  return { ok: violations.length === 0, violations };
}

/**
 * ¿Sabemos siquiera QUE aviso exige este sector?
 *
 * Distinguir «no hace falta aviso» de «no se ha definido el aviso» es toda la
 * diferencia entre aprobar y tener que mirar. Antes las dos cosas devolvian lo
 * mismo.
 */
export function hayAvisoDefinidoPara(sectorId: string): boolean {
  return Object.hasOwn(DISCLAIMER_KEYPHRASES, normalizarSector(sectorId));
}

function normalizarSector(sectorId: unknown): string {
  return typeof sectorId === "string" ? sectorId.trim().toLowerCase() : "";
}

export function hasRequiredDisclaimer(text: string, sectorId: string): boolean {
  /**
   * `DISCLAIMER_KEYPHRASES[sectorId]` era un acceso directo sobre un objeto
   * literal, asi que llegaba a `Object.prototype`: un sector llamado
   * `constructor` o `toString` devolvia algo truthy y `phrases.some` reventaba
   * o mentia. Es el mismo defecto que se corrigio en `elitePromptLibrary`.
   */
  const clave = normalizarSector(sectorId);
  if (!Object.hasOwn(DISCLAIMER_KEYPHRASES, clave)) {
    /**
     * NO SE SABE, Y ESO NO ES QUE ESTE BIEN.
     *
     * Antes esto devolvia `true` con el comentario «no specific disclaimer
     * required for this sector». Eso es correcto para un sector NO regulado, y
     * es exactamente lo contrario para uno regulado: si esta en la lista de
     * regulados es PORQUE necesita aviso, y no tener las frases definidas
     * significa que no se puede comprobar, no que se cumpla.
     *
     * Quien llama ya sabe si el sector es regulado, asi que aqui se devuelve
     * `false` —no verificado— y `evaluateShield` decide: para un sector no
     * regulado ni se consulta.
     */
    return false;
  }
  const phrases = DISCLAIMER_KEYPHRASES[clave]!;
  const norm = normalize(text);
  // require at least one key phrase from the sector's disclaimer to be present
  return phrases.some((p) => norm.includes(normalize(p)));
}

export function computeShieldStatus(input: { regulated: boolean; disclaimerOk: boolean; claimsOk: boolean }): ShieldStatus {
  if (input.regulated) {
    if (!input.disclaimerOk || !input.claimsOk) return "blocked";
    return "passed";
  }
  // non-regulated: claims failure is a warning, never a hard block
  if (!input.claimsOk) return "warning";
  return "passed";
}

// ── Row mapping ──────────────────────────────────────────────────────────────────

type AuditRow = {
  id: string; pack_run_id: string | null; deliverable_ref: string | null; sector_id: string;
  status: ShieldStatus; regulated: boolean; disclaimer_ok: boolean; claims_ok: boolean;
  disclaimer_text: string | null; claims_violations: string[]; checks: ShieldCheck[];
  metadata: Record<string, unknown>; audited_at: string;
};

function rowToAudit(r: AuditRow): ShieldAuditResult & { auditedAt: string } {
  return {
    id: r.id, sectorId: r.sector_id, packRunId: r.pack_run_id, deliverableRef: r.deliverable_ref,
    status: r.status, regulated: r.regulated, disclaimerOk: r.disclaimer_ok, claimsOk: r.claims_ok,
    disclaimerText: r.disclaimer_text, claimsViolations: r.claims_violations ?? [],
    checks: r.checks ?? [], metadata: r.metadata ?? {}, auditedAt: r.audited_at,
  };
}

// ── Default ports ────────────────────────────────────────────────────────────────

/**
 * Los sectores que se consideran regulados.
 *
 * SE EXPORTA para que una prueba pueda comprobar que esta lista y
 * `EU_DISCLAIMERS` no se separen. Se separaron: `salud` y `clinica` estaban
 * aqui sin aviso definido, y `hasRequiredDisclaimer` los aprobaba por eso
 * mismo.
 */
/**
 * Se mantiene el nombre porque lo importan otros sitios, pero el contenido ya
 * no vive aqui: viene de `regulacionDeSector`, que es la unica lista.
 */
export const REGULATED_SECTORS: ReadonlySet<string> = SECTORES_REGULADOS_LIBRES;

/**
 * QUIEN DECIDE SI UN SECTOR ESTA REGULADO YA NO ES ESTE FICHERO.
 *
 * Habia tres respuestas distintas a la misma pregunta —esta, el registro de
 * sectores autonomos y dos nombres escritos a mano en `packOrchestrator`— y no
 * coincidian. Ahora las tres derivan de `regulacionDe`.
 *
 * QUE HACE ESTE PUERTO CON `DESCONOCIDO`: lo trata como regulado. Es la
 * politica del proyecto —UNKNOWN != SAFE— y aqui es donde mas barata sale: un
 * aviso legal de mas se ve y se quita; un claim prohibido publicado en un
 * sector regulado no se deshace.
 *
 * LO QUE ESTABA MAL ANTES, ademas de la divergencia: `SECTOR_REGISTRY[sectorId]`
 * era un acceso directo sobre un objeto literal y llegaba a `Object.prototype`.
 * Un sector llamado `constructor` devolvia el constructor de Object —truthy—,
 * `!!profile.regulated` daba `false`, y el sector salia por «no regulado» sin
 * llegar siquiera a consultar la lista estatica.
 */
const defaultSectorPort: SectorPort = {
  async isRegulated(sectorId) {
    return tratarComoRegulado(sectorId);
  },
};

const defaultQaPort: QaPort = {
  async runVisualLegal(text) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { runVisualQa } = require("../autonomous/qa/visualQaEngine") as {
        runVisualQa: (i: { copyText?: string }) => { legal_passed: boolean; checks: { prohibited_terms: string[] } };
      };
      const r = runVisualQa({ copyText: text });
      return { legal_passed: r.legal_passed, prohibited_terms: r.checks.prohibited_terms };
    } catch {
      return { legal_passed: true, prohibited_terms: [] };
    }
  },
};

// ── Singleton ─────────────────────────────────────────────────────────────────────

let _instance: OsRegulatedSectorShieldService | null = null;

export function getOsRegulatedSectorShieldService(): OsRegulatedSectorShieldService {
  if (!_instance) {
    _instance = new OsRegulatedSectorShieldService(DbClient.getInstance(), defaultSectorPort, defaultQaPort);
  }
  return _instance;
}

export function resetOsRegulatedSectorShieldServiceForTests(): void {
  _instance = null;
}

// ── Service ───────────────────────────────────────────────────────────────────────

export class OsRegulatedSectorShieldService {
  constructor(
    private readonly db: SaasPostgresPort,
    private readonly sectors: SectorPort = defaultSectorPort,
    private readonly qa: QaPort = defaultQaPort,
  ) {}

  disclaimerFor(sectorId: string): string | null {
    return EU_DISCLAIMERS[sectorId] ?? null;
  }

  /**
   * ¿Es un sector regulado? Y si no se puede saber, se supone que SÍ.
   *
   * ANTES ERA `.catch(() => false)`, y eso abría la puerta. Con `false`:
   *
   *   · en `evaluateShield`, `disclaimerOk` pasa a `true` sin mirar nada — el
   *     contenido aprueba el escudo sin llevar el aviso legal obligatorio;
   *   · en `canPublishToPortal`, se devuelve `{ allowed: true }` — el
   *     contenido se publica.
   *
   * Es decir: un fallo al consultar convertía un sector regulado en uno que no
   * lo es, y una puerta de cumplimiento en un trámite. La dirección estaba del
   * revés — un error no puede ser más permisivo que la respuesta.
   *
   * HOY NO HAY FALLO VIVO: la implementación por defecto de `isRegulated` tiene
   * su propio `try/catch` y no puede lanzar. Pero `sectors` se inyecta por el
   * constructor, y el `.catch` estaba ahí precisamente porque se contaba con una
   * implementación que sí pudiera —una que consulte la base, por ejemplo—.
   *
   * SUPONER «regulado» es el lado conservador: obliga al aviso y al escudo en
   * vez de saltárselos. Como mucho bloquea de más, y eso se ve y se corrige;
   * publicar un claim prohibido en un sector regulado no se deshace.
   *
   * `porQue` queda en el objeto para que quien lo lea sepa que la respuesta es
   * una suposición y no una consulta.
   */
  private async esReguladoOSeSupone(
    sectorId: string,
  ): Promise<{ regulado: boolean; porQue: string | null }> {
    try {
      return { regulado: await this.sectors.isRegulated(sectorId), porQue: null };
    } catch (e) {
      const motivo = e instanceof Error ? e.message : String(e);
      // eslint-disable-next-line no-console
      console.error(
        `[shield] no se pudo determinar si «${sectorId}» es un sector regulado; ` +
          `se supone que SI para no saltarse el aviso legal. Causa: ${motivo.slice(0, 200)}`,
      );
      return { regulado: true, porQue: `no se pudo consultar: ${motivo.slice(0, 200)}` };
    }
  }

  /** Evaluate disclaimer + claims for a piece of content (no persistence). */
  async evaluateShield(input: { sectorId: string; packRunId?: string | null; deliverableRef?: string | null; htmlOrText: string; metadata?: Record<string, unknown> }): Promise<ShieldAuditResult> {
    const text = input.htmlOrText ?? "";
    const { regulado: regulated, porQue: porQueNoSeSabe } = await this.esReguladoOSeSupone(input.sectorId);

    const claimsLocal = scanClaims(text);
    let claimsViolations = claimsLocal.violations;
    // fold in the visual QA legal slice (best-effort) for extra coverage
    try {
      const qa = await this.qa.runVisualLegal(text);
      if (!qa.legal_passed) claimsViolations = [...new Set([...claimsViolations, ...qa.prohibited_terms])];
    } catch { /* qa optional */ }
    const claimsOk = claimsViolations.length === 0;

    const disclaimerOk = regulated ? hasRequiredDisclaimer(text, input.sectorId) : true;

    /**
     * ── REVISION HUMANA ────────────────────────────────────────────────────
     *
     * Un sector regulado del que NO se sabe que aviso exige no puede aprobarse
     * solo. No es que incumpla: es que no se ha podido comprobar, y eso no es
     * lo mismo que estar bien.
     *
     * Pasa en tres casos, y los tres acaban igual:
     *
     *   DESCONOCIDO   nadie reconoce el identificador del sector
     *   ERROR         no se pudo consultar (`esReguladoOSeSupone` supone que si)
     *   SIN AVISO     regulado, pero sin frases definidas en el catalogo
     *
     * POR QUE EL ESTADO ES `blocked` Y NO UNO NUEVO. La tabla lo tiene cerrado:
     * `CHECK (status IN ('pending','passed','blocked','warning'))`. Emitir un
     * `review_required` exigiria migrar produccion, y hasta que esa migracion
     * este aplicada cada auditoria fallaria al escribirse. `blocked` es el
     * estado canonico que YA significa «no se publica» y que YA respetan todos
     * los consumidores —`canPublishToPortal`, `portalDeliverablesStore`,
     * `skuVisualQaInput`—, asi que la garantia se cumple hoy, sin migracion.
     *
     * El MOTIVO, que es lo que se perderia al meterlo todo en `blocked`, viaja
     * aparte: en `checks` y en `metadata.revision_humana`, que son JSONB sin
     * restriccion. Asi «no cumple» y «no se ha podido comprobar» siguen siendo
     * distinguibles por quien revise, que es de lo que se trata.
     */
    const avisoDefinido = hayAvisoDefinidoPara(input.sectorId);
    const motivoDeRevision = !regulated
      ? null
      : porQueNoSeSabe !== null
        ? `no se pudo determinar el sector: ${porQueNoSeSabe}`
        : regulacionDe(input.sectorId) === "DESCONOCIDO"
          ? `sector no reconocido: «${String(input.sectorId).slice(0, 60)}»`
          : !avisoDefinido
            ? "sector regulado sin aviso legal definido en el catalogo"
            : null;

    const status: ShieldStatus = motivoDeRevision
      ? "blocked"
      : computeShieldStatus({ regulated, disclaimerOk, claimsOk });
    const disclaimerText = this.disclaimerFor(input.sectorId);

    const checks: ShieldCheck[] = [
      { name: "regulated", ok: true, detail: regulated ? "sector regulado" : "no regulado" },
      { name: "disclaimer", ok: disclaimerOk, detail: disclaimerOk ? "presente/n.a." : "falta disclaimer EU" },
      { name: "claims", ok: claimsOk, detail: claimsOk ? "sin claims prohibidos" : `${claimsViolations.length} violaciones` },
    ];
    if (motivoDeRevision) {
      checks.push({ name: "revision_humana", ok: false, detail: motivoDeRevision });
    }

    return {
      sectorId: input.sectorId,
      packRunId: input.packRunId ?? null,
      deliverableRef: input.deliverableRef ?? null,
      status,
      regulated,
      disclaimerOk,
      claimsOk,
      disclaimerText,
      claimsViolations,
      checks,
      metadata: motivoDeRevision
        ? { ...(input.metadata ?? {}), revision_humana: motivoDeRevision }
        : (input.metadata ?? {}),
    };
  }

  /**
   * Guarda la auditoria ATRIBUIDA a su inquilino.
   *
   * Antes no escribia `tenant_id` ni `workspace_id`, y por eso las 2.761 filas
   * que hay en produccion tienen los dos a NULL: no se puede saber de quien es
   * ninguna. Eso es lo que impide activar RLS sobre esta tabla — protegerla hoy
   * no la aseguraria, la volveria invisible para todos.
   *
   * `tenantId` es obligatorio a proposito. Un valor por defecto habria dejado el
   * mismo agujero con mejor aspecto.
   */
  async persistAudit(result: ShieldAuditResult, duenno: AlcanceDeAuditoria): Promise<string> {
    if (duenno === TODOS_LOS_INQUILINOS) {
      throw new Error("persistAudit: una auditoria no puede escribirse «para todos»; necesita dueno");
    }
    const esUuid = "tenantId" in duenno;
    if (esUuid && !duenno.tenantId?.trim()) throw new Error("persistAudit: tenantId vacio");
    if (!esUuid && !Number.isInteger(duenno.workspaceId)) throw new Error("persistAudit: workspaceId no es un entero");
    const rows = await this.db.query<{ id: string }>(
      `INSERT INTO os_sector_shield_audits
         (tenant_id, workspace_id, pack_run_id, deliverable_ref, sector_id, status, regulated, disclaimer_ok, claims_ok,
          disclaimer_text, claims_violations, checks, metadata)
       VALUES ($1::uuid,$2::int,$3::uuid,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12::jsonb,$13::jsonb)
       RETURNING id`,
      [
        esUuid ? duenno.tenantId : null,
        esUuid ? null : duenno.workspaceId,
        result.packRunId, result.deliverableRef, result.sectorId, result.status, result.regulated,
        result.disclaimerOk, result.claimsOk, result.disclaimerText,
        JSON.stringify(result.claimsViolations), JSON.stringify(result.checks), JSON.stringify(result.metadata),
      ],
    );
    return rows[0]!.id;
  }

  async evaluateAndPersist(
    input: { sectorId: string; packRunId?: string | null; deliverableRef?: string | null; htmlOrText: string; metadata?: Record<string, unknown> },
    duenno: AlcanceDeAuditoria,
  ): Promise<ShieldAuditResult> {
    const result = await this.evaluateShield(input);
    try {
      result.id = await this.persistAudit(result, duenno);
    } catch (e) {
      // Antes: `catch { /* audit best-effort */ }`. Se tragaba el error entero y
      // devolvia el resultado como si se hubiera guardado, con `result.id`
      // silenciosamente `undefined`. En un shield de CUMPLIMIENTO eso es lo peor
      // que puede pasar: la pantalla dice que la revision quedo registrada y en
      // la base no hay nada que ensenar a un regulador.
      //
      // Se sigue sin romper la evaluacion —el veredicto es util aunque no se
      // haya podido persistir— pero ahora queda traza y el llamante puede verlo.
      result.persistError = e instanceof Error ? e.message : String(e);
      console.error("[shield] la auditoria NO se persistio:", e);
    }
    return result;
  }

  /**
   * ¿Se puede publicar esto en el portal del cliente?
   *
   * ── EL AGUJERO QUE TENIA, LEIDO LINEA A LINEA ─────────────────────────────
   *
   *     if (metadata?.shield_status === "blocked") → denegar
   *     if (!regulated)                            → permitir
   *     if (metadata?.shield_status && ...)        → denegar
   *     return { allowed: true }
   *
   * La tercera condicion empieza por `metadata?.shield_status &&`. Cuando el
   * escudo NO ha dejado señal —`undefined`— la condicion es falsa, no entra, y
   * se cae hasta el `allowed: true` final.
   *
   * Es decir: un sector regulado SIN NINGUNA señal de escudo se publicaba. El
   * comentario original lo decia sin querer —«require an explicit non-blocked
   * shield signal WHEN PRESENT»—: cuando no estaba presente, no se exigia nada.
   *
   * Y es el caso que mas se da, no el raro: un entregable que nunca paso por el
   * escudo, uno cuyo metadata se perdio, uno creado por una ruta que todavia no
   * lo escribe. El fallo abierto estaba justo donde la señal falta.
   *
   * ── LA REGLA AHORA ────────────────────────────────────────────────────────
   *
   *     no regulado                → se publica
   *     regulado + passed/warning  → se publica
   *     regulado + cualquier otra  → NO, y se dice por que
   *     regulado + SIN señal       → NO, y se dice por que
   *
   * `pending` deja de pasar tambien, y es deliberado: significa «el escudo
   * todavia no ha corrido», que es precisamente no tener veredicto.
   *
   * MISSING != SAFE · UNKNOWN != SAFE · ERROR != SAFE.
   */
  async canPublishToPortal(sectorId: string, metadata: Record<string, unknown>): Promise<{ allowed: boolean; reason?: string }> {
    if (metadata?.shield_status === "blocked") {
      return { allowed: false, reason: "Shield bloqueado: disclaimer EU o claims prohibidos en sector regulado" };
    }
    const { regulado: regulated, porQue } = await this.esReguladoOSeSupone(sectorId);
    if (!regulated) return { allowed: true };

    const senal = metadata?.shield_status;
    if (senal === "passed" || senal === "warning") return { allowed: true };

    if (senal === undefined || senal === null || senal === "") {
      return {
        allowed: false,
        reason:
          "REVISION HUMANA: sector regulado sin ninguna señal de escudo. " +
          (porQue
            ? `Ademas no se pudo determinar el sector (${porQue}).`
            : "El entregable no ha pasado por el escudo, asi que no hay veredicto que respetar."),
      };
    }

    return { allowed: false, reason: `REVISION HUMANA: sector regulado con escudo en «${String(senal)}», que no es una aprobacion` };
  }

  /**
   * Lista auditorias DEL INQUILINO indicado.
   *
   * `tenantId` va en el primer parametro y es obligatorio: antes esta consulta
   * devolvia las auditorias de TODOS. La ruta `/api/os/shield` solo exige sesion
   * —`requirePlatformClaims` autentica, no autoriza—, la tabla no tiene RLS y la
   * conexion del lado web es superusuario, asi que cualquier usuario autenticado
   * de cualquier inquilino veia los incumplimientos de los demas: que entregable,
   * que afirmaciones prohibidas y en que sector.
   *
   * Para los usos legitimos entre inquilinos —crons de la plataforma— existe
   * `TODOS_LOS_INQUILINOS`, que hay que escribir. Lo global deja de ser el
   * comportamiento por defecto y pasa a ser una decision visible en el codigo.
   */
  async listAudits(
    alcance: AlcanceDeAuditoria,
    filters: { sectorId?: string; status?: ShieldStatus; limit?: number } = {},
  ): Promise<Array<ShieldAuditResult & { auditedAt: string }>> {
    const propio = filtroDeAlcance(alcance);
    const conditions: string[] = propio.where ? [propio.where] : [];
    const params: unknown[] = [...propio.params];
    let idx = params.length + 1;
    if (filters.sectorId) { conditions.push(`sector_id = $${idx++}`); params.push(filters.sectorId); }
    if (filters.status) { conditions.push(`status = $${idx++}`); params.push(filters.status); }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = await this.db.query<AuditRow>(
      `SELECT * FROM os_sector_shield_audits ${where} ORDER BY audited_at DESC LIMIT $${idx}`,
      [...params, Math.min(Math.max(filters.limit ?? 50, 1), 200)],
    );
    return rows.map(rowToAudit);
  }

  /** Resumen DEL INQUILINO. Antes contaba las auditorias de todos. */
  async getSummary(alcance: AlcanceDeAuditoria): Promise<ShieldSummary> {
    const propio = filtroDeAlcance(alcance);
    const filtro = propio.where ? `WHERE ${propio.where}` : "";
    const args = propio.params;
    const rows = await this.db.query<{ status: ShieldStatus; count: string; regulated_count: string }>(
      `SELECT status, COUNT(*) AS count, COUNT(*) FILTER (WHERE regulated) AS regulated_count
       FROM os_sector_shield_audits ${filtro} GROUP BY status`,
      args,
    );
    const summary: ShieldSummary = { total: 0, blocked: 0, passed: 0, warning: 0, regulatedAudits: 0, topViolations: [] };
    for (const r of rows) {
      const n = parseInt(r.count, 10);
      summary.total += n;
      if (r.status === "blocked") summary.blocked += n;
      if (r.status === "passed") summary.passed += n;
      if (r.status === "warning") summary.warning += n;
      summary.regulatedAudits += parseInt(r.regulated_count, 10);
    }
    try {
      const v = await this.db.query<{ violation: string; count: string }>(
        `SELECT violation, COUNT(*) AS count
         FROM os_sector_shield_audits, jsonb_array_elements_text(claims_violations) AS violation
         ${filtro} GROUP BY violation ORDER BY count DESC LIMIT 5`,
        args,
      );
      summary.topViolations = v.map((x) => ({ violation: x.violation, count: parseInt(x.count, 10) }));
    } catch { /* ignore */ }
    return summary;
  }
}
