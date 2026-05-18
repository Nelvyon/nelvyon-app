import { OsAgentError } from "../os-agents/OsAgentError";
import { RateLimitExceededError } from "../usage/rateLimiter";

export type ErrorCode =
  | "RATE_LIMIT_EXCEEDED"
  | "UNAUTHORIZED"
  | "PLAN_REQUIRED"
  | "AGENT_NOT_FOUND"
  | "AGENT_FAILED"
  | "INVALID_INPUT"
  | "SERVICE_UNAVAILABLE"
  | "PAYMENT_REQUIRED"
  | "UNKNOWN_ERROR";

export interface AppErrorPayload {
  code: ErrorCode;
  message: string;
  action?: string;
  actionUrl?: string;
  statusCode: number;
}

export const ERROR_MAP: Record<ErrorCode, AppErrorPayload> = {
  RATE_LIMIT_EXCEEDED: {
    code: "RATE_LIMIT_EXCEEDED",
    message: "Has alcanzado el límite mensual de llamadas de tu plan.",
    action: "Actualiza tu plan para continuar",
    actionUrl: "/pricing",
    statusCode: 429,
  },
  UNAUTHORIZED: {
    code: "UNAUTHORIZED",
    message: "Tu sesión ha expirado. Vuelve a iniciar sesión.",
    action: "Iniciar sesión",
    actionUrl: "/login",
    statusCode: 401,
  },
  PLAN_REQUIRED: {
    code: "PLAN_REQUIRED",
    message: "Esta función requiere un plan activo.",
    action: "Ver planes",
    actionUrl: "/pricing",
    statusCode: 403,
  },
  AGENT_NOT_FOUND: {
    code: "AGENT_NOT_FOUND",
    message: "El agente solicitado no está disponible.",
    statusCode: 404,
  },
  AGENT_FAILED: {
    code: "AGENT_FAILED",
    message: "El agente no pudo completar la tarea. Inténtalo de nuevo.",
    action: "Reintentar",
    statusCode: 500,
  },
  INVALID_INPUT: {
    code: "INVALID_INPUT",
    message: "Los datos enviados no son válidos.",
    statusCode: 400,
  },
  SERVICE_UNAVAILABLE: {
    code: "SERVICE_UNAVAILABLE",
    message: "El servicio no está disponible temporalmente. Inténtalo en unos minutos.",
    statusCode: 503,
  },
  PAYMENT_REQUIRED: {
    code: "PAYMENT_REQUIRED",
    message: "Se requiere un método de pago válido para continuar.",
    action: "Actualizar método de pago",
    actionUrl: "/billing",
    statusCode: 402,
  },
  UNKNOWN_ERROR: {
    code: "UNKNOWN_ERROR",
    message: "Ha ocurrido un error inesperado. Si persiste, contacta con soporte.",
    statusCode: 500,
  },
};

export class AppError extends Error {
  public readonly payload: AppErrorPayload;

  constructor(code: ErrorCode, overrideMessage?: string) {
    const base = ERROR_MAP[code];
    super(overrideMessage ?? base.message);
    this.name = "AppError";
    this.payload = overrideMessage ? { ...base, message: overrideMessage } : base;
  }
}

export function toClientError(err: unknown): AppErrorPayload {
  if (err instanceof AppError) return err.payload;
  if (err instanceof RateLimitExceededError) {
    return ERROR_MAP.RATE_LIMIT_EXCEEDED;
  }
  if (err instanceof OsAgentError && err.message === "Unauthorized") {
    return ERROR_MAP.UNAUTHORIZED;
  }
  if (err instanceof Error) {
    if (err.name === "RateLimitExceededError") {
      return ERROR_MAP.RATE_LIMIT_EXCEEDED;
    }
    if (err.message.includes("Unauthorized") || err.message.includes("401")) {
      return ERROR_MAP.UNAUTHORIZED;
    }
    if (err.message.toLowerCase().includes("not found") || err.message.includes("404")) {
      return ERROR_MAP.AGENT_NOT_FOUND;
    }
  }
  return ERROR_MAP.UNKNOWN_ERROR;
}
