/**
 * Centralized Error Handler for NELVYON
 * Replaces all empty catch {} blocks with real error handling:
 * - Logs to observability module
 * - Shows user-friendly toast notifications
 * - Categorizes errors by severity
 */

import { recordError, type CriticalFlow } from "./observability";

export type ErrorContext =
  | "auth"
  | "api"
  | "crm"
  | "payments"
  | "campaigns"
  | "calendar"
  | "blog"
  | "forms"
  | "helpdesk"
  | "workflows"
  | "funnels"
  | "websites"
  | "pipelines"
  | "conversations"
  | "marketing"
  | "social"
  | "video"
  | "contracts"
  | "settings"
  | "agents"
  | "autopilot"
  | "reports"
  | "analytics"
  | "admin"
  | "billing"
  | "cybersecurity"
  | "segmentation"
  | "partners"
  | "templates"
  | "presentations"
  | "pdf"
  | "export"
  | "general";

const CONTEXT_TO_FLOW: Partial<Record<ErrorContext, CriticalFlow>> = {
  auth: "onboarding",
  crm: "crm_ia_qa",
  payments: "payments",
  billing: "payments",
  campaigns: "marketing",
  marketing: "marketing",
  social: "marketing",
  helpdesk: "helpdesk",
  conversations: "helpdesk",
};

// Toast notification queue (consumed by UI)
type ToastEntry = { id: string; message: string; type: "error" | "warning" | "info"; timestamp: number };
const _toastQueue: ToastEntry[] = [];
const _toastListeners: Array<(toast: ToastEntry) => void> = [];

let _toastCounter = 0;

/** Subscribe to toast notifications */
export function onToast(listener: (toast: ToastEntry) => void): () => void {
  _toastListeners.push(listener);
  return () => {
    const idx = _toastListeners.indexOf(listener);
    if (idx >= 0) _toastListeners.splice(idx, 1);
  };
}

function emitToast(message: string, type: "error" | "warning" | "info" = "error") {
  const toast: ToastEntry = {
    id: `toast-${++_toastCounter}`,
    message,
    type,
    timestamp: Date.now(),
  };
  _toastQueue.push(toast);
  if (_toastQueue.length > 50) _toastQueue.shift();
  for (const listener of _toastListeners) {
    try { listener(toast); } catch (err) { /* prevent listener errors from cascading */ }
  }
}

/** User-friendly error messages by context */
const USER_MESSAGES: Partial<Record<ErrorContext, string>> = {
  auth: "Error de autenticación. Por favor, inicia sesión de nuevo.",
  api: "Error de conexión con el servidor.",
  crm: "Error al procesar datos de CRM.",
  payments: "Error en el procesamiento de pagos.",
  campaigns: "Error al gestionar la campaña.",
  calendar: "Error al gestionar el calendario.",
  blog: "Error al gestionar el blog.",
  forms: "Error al gestionar formularios.",
  helpdesk: "Error en el sistema de soporte.",
  workflows: "Error al gestionar flujos de trabajo.",
  funnels: "Error al gestionar embudos.",
  websites: "Error al gestionar sitios web.",
  pipelines: "Error al gestionar pipelines.",
  conversations: "Error al cargar conversaciones.",
  marketing: "Error en marketing.",
  social: "Error en redes sociales.",
  video: "Error al gestionar vídeos.",
  contracts: "Error al gestionar contratos.",
  settings: "Error al guardar configuración.",
  agents: "Error al gestionar agentes.",
  autopilot: "Error en el sistema autopilot.",
  reports: "Error al generar reportes.",
  analytics: "Error al cargar analíticas.",
  admin: "Error en el panel de administración.",
  billing: "Error en facturación.",
  cybersecurity: "Error en seguridad.",
  segmentation: "Error en segmentación.",
  partners: "Error al gestionar partners.",
  templates: "Error al gestionar plantillas.",
  presentations: "Error al gestionar presentaciones.",
  pdf: "Error al generar PDF.",
  export: "Error al exportar datos.",
  general: "Ha ocurrido un error inesperado.",
};

/**
 * Handle an error with logging, observability recording, and user notification.
 * 
 * @param error - The caught error
 * @param context - Module/feature context
 * @param operation - What was being attempted (e.g., "loading contacts", "saving deal")
 * @param options - Additional options
 * @returns void
 * 
 * Usage:
 *   try { await fetchContacts(); }
 *   catch (err) { handleError(err, "crm", "loading contacts"); }
 */
export function handleError(
  error: unknown,
  context: ErrorContext,
  operation: string,
  options: {
    silent?: boolean;       // Don't show toast to user
    endpoint?: string;      // API endpoint that failed
    rethrow?: boolean;      // Re-throw after handling
    userId?: string;        // Current user ID
  } = {},
): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const statusCode = extractStatusCode(error);
  const endpoint = options.endpoint || `${context}/${operation}`;

  // Log to console in development
  if (import.meta.env.DEV) {
    console.error(`[NELVYON:${context}] ${operation} failed:`, error);
  }

  // Record in observability
  recordError({
    module: context,
    endpoint,
    error: errorMessage,
    statusCode,
    flowId: CONTEXT_TO_FLOW[context],
    userId: options.userId,
    payloadKeys: [],
  });

  // Show user-friendly toast unless silent
  if (!options.silent) {
    const baseMessage = USER_MESSAGES[context] || USER_MESSAGES.general!;
    const detail = operation ? ` (${operation})` : "";
    emitToast(`${baseMessage}${detail}`, statusCode && statusCode >= 500 ? "error" : "warning");
  }

  // Re-throw if requested
  if (options.rethrow) {
    throw error;
  }
}

/**
 * Wrap an async function with error handling.
 * Returns [result, error] tuple.
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  context: ErrorContext,
  operation: string,
  options: { silent?: boolean; endpoint?: string } = {},
): Promise<[T | null, Error | null]> {
  try {
    const result = await fn();
    return [result, null];
  } catch (err) {
    handleError(err, context, operation, options);
    return [null, err instanceof Error ? err : new Error(String(err))];
  }
}

/** Extract HTTP status code from various error shapes */
function extractStatusCode(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const e = error as Record<string, unknown>;
  // Axios-style
  if (e.response && typeof e.response === "object") {
    const resp = e.response as Record<string, unknown>;
    if (typeof resp.status === "number") return resp.status;
  }
  // Direct status
  if (typeof e.status === "number") return e.status;
  if (typeof e.statusCode === "number") return e.statusCode;
  return undefined;
}

/** Get recent toast queue (for debugging) */
export function getRecentToasts(): ToastEntry[] {
  return [..._toastQueue];
}