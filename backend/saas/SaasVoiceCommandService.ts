/**
 * S55 — SaasVoiceCommandService
 * Parses voice transcripts into SaaS navigation/actions. Deterministic phrase
 * matching — no LLM, no API cost. The browser uses the free Web Speech API and
 * sends only the resulting text here for intent resolution + logging.
 */
import type { SaasPostgresPort } from "./SaasOnboardingService";

// ── Types ───────────────────────────────────────────────────────────────────────

export type VoiceActionType = "navigate" | "action" | "query" | "unknown";

export type VoiceCatalogItem = {
  id: string;
  phrases: string[]; // normalized trigger phrases (no accents, lowercase)
  actionType: VoiceActionType;
  route?: string;
  action?: string; // action id for action/query intents
  description: string;
};

export type VoiceIntent = {
  id: string;
  actionType: VoiceActionType;
  route?: string;
  action?: string;
  description: string;
};

export type VoiceCommandResult = {
  success: boolean;
  transcript: string;
  intent: VoiceIntent | null;
  message: string;
  route?: string;
  suggestions?: Array<{ id: string; example: string; description: string }>;
};

export type VoiceCommandLog = {
  id: string;
  tenantId: string;
  userId: string | null;
  transcript: string;
  matchedIntent: string | null;
  actionType: VoiceActionType;
  actionPayload: Record<string, unknown>;
  success: boolean;
  errorMessage: string | null;
  source: string;
  createdAt: string;
};

export type VoiceNavCatalogPort = {
  getCatalog(): VoiceCatalogItem[];
};

export type SaasVoiceCommandErrorCode = "VALIDATION";

export class SaasVoiceCommandError extends Error {
  constructor(
    public readonly code: SaasVoiceCommandErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "SaasVoiceCommandError";
  }
}

// ── Built-in intent catalog ──────────────────────────────────────────────────────

const INTENT_CATALOG: readonly VoiceCatalogItem[] = [
  // Navigation
  { id: "nav_dashboard", phrases: ["dashboard", "inicio", "panel", "home"], actionType: "navigate", route: "/saas/dashboard", description: "Ir al Dashboard" },
  { id: "nav_crm", phrases: ["crm", "contactos", "ir a crm", "abre crm", "abrir crm"], actionType: "navigate", route: "/saas/crm", description: "Abrir el CRM" },
  { id: "nav_pipeline", phrases: ["pipeline", "embudo", "oportunidades"], actionType: "navigate", route: "/saas/pipeline", description: "Abrir el Pipeline" },
  { id: "nav_campanias", phrases: ["campanias", "campanas", "email", "campanas de email", "correos"], actionType: "navigate", route: "/saas/campanias", description: "Abrir Campañas de email" },
  { id: "nav_workflows", phrases: ["workflows", "automatizaciones", "flujos"], actionType: "navigate", route: "/saas/workflows", description: "Abrir Workflows" },
  { id: "nav_inbox", phrases: ["inbox", "bandeja", "mensajes"], actionType: "navigate", route: "/saas/inbox", description: "Abrir la Bandeja unificada" },
  { id: "nav_entregables", phrases: ["entregables", "deliverables"], actionType: "navigate", route: "/saas/entregables", description: "Abrir Entregables" },
  { id: "nav_packs", phrases: ["pack store", "tienda de packs", "packs", "comprar pack"], actionType: "navigate", route: "/saas/packs", description: "Abrir el Pack Store" },
  { id: "nav_brief", phrases: ["lanzar pack", "brief", "nuevo pack", "crear pack"], actionType: "navigate", route: "/saas/brief-to-launch", description: "Ir a Lanzar Pack" },
  { id: "nav_playbooks", phrases: ["playbooks", "planes de accion", "recomendaciones"], actionType: "navigate", route: "/saas/playbooks", description: "Abrir Playbooks" },
  { id: "nav_benchmark", phrases: ["benchmark", "comparativa", "sector"], actionType: "navigate", route: "/saas/benchmark", description: "Abrir el Benchmark" },
  { id: "nav_compliance", phrases: ["compliance", "cumplimiento", "vault", "legal"], actionType: "navigate", route: "/saas/compliance", description: "Abrir el Compliance Vault" },
  { id: "nav_partner", phrases: ["partner", "partner zone", "zona partner", "agencia"], actionType: "navigate", route: "/saas/partner", description: "Abrir la Partner Zone" },
  { id: "nav_autopilot", phrases: ["autopilot", "piloto automatico", "automatico"], actionType: "navigate", route: "/saas/autopilot", description: "Abrir el Autopilot" },
  { id: "nav_subcuentas", phrases: ["subcuentas", "clientes", "cuentas"], actionType: "navigate", route: "/saas/subcuentas", description: "Abrir Subcuentas" },
  { id: "nav_reportes", phrases: ["reportes", "informes", "reporting"], actionType: "navigate", route: "/saas/reportes", description: "Abrir Reportes" },
  { id: "nav_billing", phrases: ["billing", "facturacion", "pago", "suscripcion"], actionType: "navigate", route: "/saas/billing", description: "Abrir Facturación" },
  { id: "nav_settings", phrases: ["settings", "configuracion", "ajustes", "preferencias"], actionType: "navigate", route: "/saas/settings", description: "Abrir Configuración" },
  // Actions (client triggers an API call after navigation)
  { id: "act_refresh_playbooks", phrases: ["sincronizar playbooks", "actualizar playbooks", "generar playbooks"], actionType: "action", action: "refresh_playbooks", route: "/saas/playbooks", description: "Regenerar tus playbooks" },
  { id: "act_refresh_benchmark", phrases: ["actualizar benchmark", "recalcular benchmark", "refrescar benchmark"], actionType: "action", action: "refresh_benchmark", route: "/saas/benchmark", description: "Actualizar el benchmark" },
  { id: "act_launch_pack", phrases: ["lanzar un pack ahora", "ejecutar pack", "lanzar ahora"], actionType: "action", action: "launch_pack", route: "/saas/brief-to-launch", description: "Iniciar el lanzamiento de un pack" },
  // Queries
  { id: "qry_subcuentas", phrases: ["cuantas subcuentas", "numero de subcuentas", "subcuentas activas"], actionType: "query", action: "count_subcuentas", description: "Cuántas subcuentas tienes" },
  { id: "qry_connect", phrases: ["estado connect", "estado de stripe", "stripe conectado"], actionType: "query", action: "connect_status", description: "Estado de Stripe Connect" },
] as const;

const defaultCatalogPort: VoiceNavCatalogPort = {
  getCatalog: () => [...INTENT_CATALOG],
};

// ── Normalization ────────────────────────────────────────────────────────────────

export function normalizeTranscript(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "") // strip accents
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Strip common leading verbs so "abre el crm" matches "crm". */
function stripFillers(text: string): string {
  return text
    .replace(/^(ve |vete |ir |irse |abre |abrir |abreme |muestra |muestrame |ensename |llevame |vamos |quiero |dame )/g, "")
    .replace(/^(a |al |el |la |los |las |un |una |hacia |para )/g, "")
    .replace(/^(open |go to |show |show me |take me to )/g, "")
    .trim();
}

// ── Row mapping ──────────────────────────────────────────────────────────────────

type LogRow = {
  id: string;
  tenant_id: string;
  user_id: string | null;
  transcript: string;
  matched_intent: string | null;
  action_type: VoiceActionType;
  action_payload: Record<string, unknown>;
  success: boolean;
  error_message: string | null;
  source: string;
  created_at: string;
};

function rowToLog(r: LogRow): VoiceCommandLog {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    userId: r.user_id,
    transcript: r.transcript,
    matchedIntent: r.matched_intent,
    actionType: r.action_type,
    actionPayload: r.action_payload ?? {},
    success: r.success,
    errorMessage: r.error_message,
    source: r.source,
    createdAt: r.created_at,
  };
}

// ── Singleton ─────────────────────────────────────────────────────────────────────

let _instance: SaasVoiceCommandService | null = null;

export function getSaasVoiceCommandService(): SaasVoiceCommandService {
  if (!_instance) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { DbClient } = require("../db/DbClient") as { DbClient: { getInstance(): SaasPostgresPort } };
    _instance = new SaasVoiceCommandService(DbClient.getInstance());
  }
  return _instance;
}

export function resetSaasVoiceCommandServiceForTests(): void {
  _instance = null;
}

// ── Service ───────────────────────────────────────────────────────────────────────

export class SaasVoiceCommandService {
  constructor(
    private readonly db: SaasPostgresPort,
    private readonly catalogPort: VoiceNavCatalogPort = defaultCatalogPort,
  ) {}

  getCatalog(): VoiceCatalogItem[] {
    return this.catalogPort.getCatalog();
  }

  /** Match a transcript to an intent via normalized phrase containment. */
  parseTranscript(transcript: string, _locale = "es-ES"): VoiceCommandResult {
    const raw = (transcript ?? "").trim();
    if (!raw) {
      throw new SaasVoiceCommandError("VALIDATION", "transcript vacío");
    }
    const normalized = normalizeTranscript(raw);
    const stripped = stripFillers(normalized);
    const catalog = this.getCatalog();

    let best: { item: VoiceCatalogItem; score: number } | null = null;

    for (const item of catalog) {
      for (const phrase of item.phrases) {
        let score = 0;
        if (normalized === phrase || stripped === phrase) score = 100;
        else if (normalized.includes(phrase) || stripped.includes(phrase)) score = 60 + phrase.length;
        else if (phrase.includes(stripped) && stripped.length >= 3) score = 30 + stripped.length;
        if (score > 0 && (!best || score > best.score)) best = { item, score };
      }
    }

    if (!best) {
      return {
        success: false,
        transcript: raw,
        intent: null,
        message: "No reconocí ese comando. Prueba con «ir a CRM» o «lanzar pack».",
        suggestions: this.topSuggestions(3),
      };
    }

    const item = best.item;
    const intent: VoiceIntent = {
      id: item.id,
      actionType: item.actionType,
      route: item.route,
      action: item.action,
      description: item.description,
    };
    return {
      success: true,
      transcript: raw,
      intent,
      message: item.description,
      route: item.route,
    };
  }

  private topSuggestions(n: number): Array<{ id: string; example: string; description: string }> {
    return this.getCatalog()
      .filter((i) => i.actionType === "navigate")
      .slice(0, n)
      .map((i) => ({ id: i.id, example: i.phrases[0]!, description: i.description }));
  }

  // ── Logging / history ────────────────────────────────────────────────────────

  async logCommand(
    tenantId: string,
    payload: {
      userId?: string | null;
      transcript: string;
      matchedIntent?: string | null;
      actionType: VoiceActionType;
      actionPayload?: Record<string, unknown>;
      success: boolean;
      errorMessage?: string | null;
      source?: "web_speech" | "media_upload";
    },
  ): Promise<VoiceCommandLog> {
    const rows = await this.db.query<LogRow>(
      `INSERT INTO saas_voice_commands
         (tenant_id, user_id, transcript, matched_intent, action_type,
          action_payload, success, error_message, source)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9)
       RETURNING *`,
      [
        tenantId,
        payload.userId ?? null,
        payload.transcript,
        payload.matchedIntent ?? null,
        payload.actionType,
        JSON.stringify(payload.actionPayload ?? {}),
        payload.success,
        payload.errorMessage ?? null,
        payload.source ?? "web_speech",
      ],
    );
    return rowToLog(rows[0]!);
  }

  async listHistory(tenantId: string, limit = 20): Promise<VoiceCommandLog[]> {
    const rows = await this.db.query<LogRow>(
      `SELECT * FROM saas_voice_commands
       WHERE tenant_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [tenantId, limit],
    );
    return rows.map(rowToLog);
  }

  /** Parse + persist a command in one step (used by /execute). */
  async executeCommand(
    tenantId: string,
    transcript: string,
    opts?: { userId?: string | null; source?: "web_speech" | "media_upload" },
  ): Promise<VoiceCommandResult> {
    const result = this.parseTranscript(transcript);
    try {
      await this.logCommand(tenantId, {
        userId: opts?.userId ?? null,
        transcript: result.transcript,
        matchedIntent: result.intent?.id ?? null,
        actionType: result.intent?.actionType ?? "unknown",
        actionPayload: result.intent ? { route: result.intent.route, action: result.intent.action } : {},
        success: result.success,
        errorMessage: result.success ? null : "no_match",
        source: opts?.source ?? "web_speech",
      });
    } catch { /* logging must never break the command */ }
    return result;
  }
}
