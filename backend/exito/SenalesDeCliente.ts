/**
 * CUSTOMER SUCCESS: detectar lo que se está atascando antes de que se note.
 *
 * Es el único departamento que el diagnóstico encontró REALMENTE ausente. Los
 * demás estaban diseñados y sin instanciar; éste no existía en ninguna forma. Y
 * su ausencia tiene una consecuencia medida: producción dejó de producir el 22
 * de julio y nadie se enteró hasta que alguien miró la base en agosto.
 *
 * QUÉ HACE. Mira el estado real de un cliente y produce SEÑALES. Cada señal es
 * una afirmación comprobable —«lleva 9 días sin completar el intake», «tiene 2
 * cuentas sin conectar que bloquean su SEO»— con la evidencia que la sostiene y
 * la acción interna que corresponde.
 *
 * QUÉ NO HACE, y es la parte importante:
 *
 *   - No envía nada. Produce señales; quien decide qué se hace con ellas es la
 *     cola, con su aprobación cuando toque. Un detector que además envía es un
 *     detector que no se puede ejecutar en seco.
 *
 *   - No inventa urgencia. Un cliente que lleva tres días sin contestar no
 *     está en riesgo de fuga: está ocupado. Los umbrales son deliberadamente
 *     holgados, porque una alerta que salta demasiado deja de leerse, y un
 *     detector que nadie lee es peor que ninguno.
 *
 *   - No hace upselling encubierto. La señal de expansión sólo se emite cuando
 *     hay un hecho que la sostiene: un servicio que ya está dando resultado y
 *     un servicio contiguo que el cliente no tiene. «Lleva tiempo con nosotros»
 *     no es un motivo para venderle nada.
 */

import type { CerebroDeNegocioService } from "../cerebro/CerebroDeNegocioService";
import type { CicloDelClienteService } from "../portal/CicloDelClienteService";

export type TipoDeSenal =
  | "onboarding_incompleto"
  | "conexiones_pendientes"
  | "servicio_bloqueado"
  | "aprobacion_atrasada"
  | "cliente_inactivo"
  | "sin_entregables"
  | "resultados_a_la_baja"
  | "oportunidad_de_expansion";

/**
 * Cuánto importa. No es una escala de 1 a 10 porque nadie sabe distinguir un 6
 * de un 7; son tres niveles con significado operativo distinto.
 */
export type Gravedad =
  /** Alguien tiene que mirarlo hoy: el cliente está pagando y no recibe nada. */
  | "bloqueante"
  /** Conviene resolverlo esta semana. */
  | "atencion"
  /** Es una oportunidad, no un problema. */
  | "informativa";

export interface Senal {
  tipo: TipoDeSenal;
  gravedad: Gravedad;
  workspaceId: number;
  clientId: string;
  /** Qué pasa, en una frase que se entienda sin abrir nada más. */
  resumen: string;
  /** Los hechos que la sostienen. Una señal sin evidencia es una corazonada. */
  evidencia: Record<string, unknown>;
  /** Qué debería hacer NELVYON. Interno, nunca un envío automático. */
  accionSugerida: string;
  /** Días que lleva así, cuando se puede saber. */
  diasAsi: number | null;
}

/**
 * Umbrales, en días. Holgados a propósito y en un solo sitio para poder
 * discutirlos sin buscarlos por el código.
 */
export const UMBRALES = {
  /** Intake sin terminar. Una semana es tiempo razonable para contestar. */
  onboardingIncompleto: 7,
  /** Cuentas sin conectar tras pedirlas. */
  conexionesPendientes: 7,
  /** Una aprobación esperando al cliente. */
  aprobacionAtrasada: 5,
  /** Sin entrar al portal. Un mes: menos que eso es simplemente estar ocupado. */
  clienteInactivo: 30,
  /** Servicio aceptado sin un solo entregable. */
  sinEntregables: 14,
} as const;

export interface AlmacenDeSenales {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
}

function dias(desde: Date | string | null): number | null {
  if (!desde) return null;
  const t = typeof desde === "string" ? new Date(desde).getTime() : desde.getTime();
  if (!Number.isFinite(t)) return null;
  return Math.floor((Date.now() - t) / 86_400_000);
}

export class SenalesDeCliente {
  constructor(
    private readonly db: AlmacenDeSenales,
    private readonly cerebro: CerebroDeNegocioService,
    private readonly ciclo: CicloDelClienteService,
  ) {}

  /**
   * Todas las señales de UN cliente.
   *
   * Acotado por workspace en cada consulta. No existe una variante que mire
   * «todos los clientes» sin inquilino: el barrido de la agencia recorre
   * inquilinos uno a uno, precisamente para que no pueda mezclarlos.
   */
  async deCliente(workspaceId: number, clientId: string): Promise<Senal[]> {
    const senales: Senal[] = [];
    const base = { workspaceId, clientId };

    const [solicitudes, conexiones, completitud] = await Promise.all([
      this.ciclo.solicitudesDe(workspaceId, clientId),
      this.ciclo.conexionesDe(workspaceId, clientId),
      this.cerebro.completitud(workspaceId, clientId),
    ]);

    const activos = solicitudes.filter((s) => s.estado === "aceptado");

    // ── 1 · Onboarding sin terminar ────────────────────────────────────────
    //
    // Sólo cuenta si ha pedido algo: un cliente que aún no ha pedido nada no
    // tiene un onboarding pendiente, tiene un onboarding que no ha empezado, y
    // perseguirlo por eso es perseguir a alguien que no ha dicho que sí.
    if (solicitudes.length > 0 && !completitud.listoParaOperar) {
      const desde = solicitudes[solicitudes.length - 1].creada;
      const d = dias(desde);
      const faltan = completitud.huecosDelCliente.filter((h) => h.imprescindible);
      if (faltan.length > 0 && (d ?? 0) >= UMBRALES.onboardingIncompleto) {
        senales.push({
          ...base,
          tipo: "onboarding_incompleto",
          gravedad: activos.length > 0 ? "bloqueante" : "atencion",
          resumen: `Faltan ${faltan.length} datos imprescindibles desde hace ${d} días`,
          evidencia: { dimensiones: faltan.map((f) => f.dimension), desde: desde.toISOString() },
          accionSugerida:
            "Recordarle por su canal preferido, con las preguntas concretas y no con un enlace genérico",
          diasAsi: d,
        });
      }
    }

    // ── 2 · Cuentas sin conectar ───────────────────────────────────────────
    const pendientes = conexiones.filter((c) => c.estado === "necesaria" || c.estado === "invitada");
    if (pendientes.length > 0 && activos.length > 0) {
      const bloqueados = new Set(pendientes.flatMap((c) => c.servicios));
      senales.push({
        ...base,
        tipo: "conexiones_pendientes",
        gravedad: "bloqueante",
        resumen: `${pendientes.length} cuentas sin conectar bloquean ${bloqueados.size} servicio(s)`,
        evidencia: {
          proveedores: pendientes.map((c) => c.proveedor),
          serviciosBloqueados: [...bloqueados],
        },
        accionSugerida:
          "Explicarle para qué es cada una y ofrecer hacerlo con él; si dice que no, registrarlo y replantear el servicio",
        diasAsi: null,
      });
    }

    // ── 3 · Servicio aceptado sin un solo entregable ───────────────────────
    //
    // Ésta es la señal que habría detectado el 22 de julio.
    for (const s of activos) {
      const filas = await this.db.query<{ n: string; ultimo: string | null }>(
        `SELECT COUNT(*)::text AS n, MAX(created_at)::text AS ultimo
           FROM os_deliverables
          WHERE workspace_id = $1 AND client_id = $2 AND archived_at IS NULL`,
        [workspaceId, clientId],
      );
      const n = Number(filas[0]?.n ?? 0);
      const d = dias(s.creada);
      if (n === 0 && (d ?? 0) >= UMBRALES.sinEntregables) {
        senales.push({
          ...base,
          tipo: "sin_entregables",
          gravedad: "bloqueante",
          resumen: `"${s.serviceId}" lleva ${d} días aceptado y no ha producido nada`,
          evidencia: { serviceId: s.serviceId, aceptadoHace: d, entregables: 0 },
          accionSugerida:
            "Mirar la cola: puede haber un trabajo en dead_letter, esperando aprobación, o nunca encolado",
          diasAsi: d,
        });
      }
      break; // una señal de este tipo basta; el detalle está en la evidencia
    }

    // ── 4 · Aprobación esperando al cliente ────────────────────────────────
    //
    // `os_deliverables` NO tiene un estado 'pending_approval': sus estados son
    // draft, in_review, delivered, approved, published, rejected y archived. Un
    // entregable que espera al cliente es uno ENTREGADO, visible para él, sin
    // `approved_at` y sin `client_reviewed_at`. Consultar un estado que no
    // existe habría devuelto cero siempre, y la señal nunca habría saltado.
    const esperando = await this.db.query<{ n: string; mas_antiguo: string | null }>(
      `SELECT COUNT(*)::text AS n, MIN(delivered_at)::text AS mas_antiguo
         FROM os_deliverables
        WHERE workspace_id = $1 AND client_id = $2
          AND archived_at IS NULL
          AND visibility = 'client_visible'
          AND status = 'delivered'
          AND approved_at IS NULL
          AND client_reviewed_at IS NULL`,
      [workspaceId, clientId],
    );
    const nEsperando = Number(esperando[0]?.n ?? 0);
    const dEsperando = dias(esperando[0]?.mas_antiguo ?? null);
    if (nEsperando > 0 && (dEsperando ?? 0) >= UMBRALES.aprobacionAtrasada) {
      senales.push({
        ...base,
        tipo: "aprobacion_atrasada",
        gravedad: "atencion",
        resumen: `${nEsperando} entregable(s) esperan su aprobación desde hace ${dEsperando} días`,
        evidencia: { pendientes: nEsperando, masAntiguoHace: dEsperando },
        accionSugerida:
          "Preguntarle si le falta información para decidir; puede que no sepa que le toca a él",
        diasAsi: dEsperando,
      });
    }

    // ── 5 · Trabajos atascados ─────────────────────────────────────────────
    //
    // `dead_letter` significa que NELVYON se rindió. Que el cliente no lo sepa
    // es peor que el propio fallo.
    const atascados = await this.db.query<{ estado: string; n: string }>(
      `SELECT status AS estado, COUNT(*)::text AS n
         FROM os_jobs
        WHERE client_id = $1 AND status IN ('dead_letter', 'waiting_approval')
        GROUP BY status`,
      [clientId],
    );
    for (const a of atascados) {
      if (Number(a.n) === 0) continue;
      senales.push({
        ...base,
        tipo: "servicio_bloqueado",
        gravedad: a.estado === "dead_letter" ? "bloqueante" : "atencion",
        resumen:
          a.estado === "dead_letter"
            ? `${a.n} trabajo(s) han fallado definitivamente y nadie los ha mirado`
            : `${a.n} trabajo(s) esperan una decisión interna`,
        evidencia: { estado: a.estado, cuantos: Number(a.n) },
        accionSugerida:
          a.estado === "dead_letter"
            ? "Diagnosticar la causa antes de reencolar: reintentar sin mirar repite el fallo"
            : "Resolver la aprobación pendiente o escalarla",
        diasAsi: null,
      });
    }

    return senales;
  }

  /**
   * Señales de todos los clientes de UN workspace.
   *
   * El barrido de la agencia llama a esto por inquilino. No hay versión que
   * mire todos a la vez: un método así acaba usándose sin inquilino, y el
   * primer bug que produce es contarle a un cliente el problema de otro.
   */
  async deWorkspace(workspaceId: number): Promise<Senal[]> {
    const clientes = await this.db.query<{ id: string }>(
      `SELECT id FROM os_clients WHERE workspace_id = $1`,
      [workspaceId],
    );
    const todas: Senal[] = [];
    for (const c of clientes) {
      todas.push(...(await this.deCliente(workspaceId, c.id)));
    }
    return ordenarPorUrgencia(todas);
  }
}

const ORDEN: Record<Gravedad, number> = { bloqueante: 0, atencion: 1, informativa: 2 };

/** Lo que bloquea primero, y dentro de eso lo que lleva más tiempo así. */
export function ordenarPorUrgencia(senales: Senal[]): Senal[] {
  return [...senales].sort(
    (a, b) => ORDEN[a.gravedad] - ORDEN[b.gravedad] || (b.diasAsi ?? 0) - (a.diasAsi ?? 0),
  );
}

/** Cuántas hay de cada gravedad, para poder mirar una consola sin contarlas. */
export function recuento(senales: Senal[]): Record<Gravedad, number> {
  const r: Record<Gravedad, number> = { bloqueante: 0, atencion: 0, informativa: 0 };
  for (const s of senales) r[s.gravedad] += 1;
  return r;
}
