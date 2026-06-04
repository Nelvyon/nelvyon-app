/** Estados de proyecto en nelvyon_projects (valores libres en DB; UI normaliza visual). */
export const OS_PROJECT_STATUS_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "draft", label: "Borrador" },
  { value: "active", label: "Activo" },
  { value: "in_progress", label: "En curso" },
  { value: "qa_review", label: "En QA" },
  { value: "completed", label: "Completado" },
  { value: "cancelled", label: "Cancelado" },
  { value: "on_hold", label: "En pausa" },
] as const;

export const OS_PROJECT_TYPE_OPTIONS = [
  { value: "web", label: "Web" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "social", label: "Social" },
  { value: "ads", label: "Ads" },
  { value: "audit", label: "Auditoría" },
  { value: "proposal", label: "Propuesta" },
  { value: "branding", label: "Branding" },
] as const;

export const TERMINAL_PROJECT_STATUSES = new Set(["completed", "cancelled", "delivered", "archived"]);

export type OsClientOperationalStatus = "con_proyectos" | "sin_proyectos" | "todos";

/** Pipeline interno OS (os_deals) — separado de crm_deals / saas_deals */
export const OS_DEAL_STATUS_OPTIONS = [
  { value: "nuevo", label: "Nuevo" },
  { value: "contactado", label: "Contactado" },
  { value: "propuesta", label: "Propuesta" },
  { value: "ganado", label: "Ganado" },
  { value: "perdido", label: "Perdido" },
] as const;

export const OS_DEAL_OPEN_STATUSES = new Set(["nuevo", "contactado", "propuesta"]);

/** Tareas internas OS (os_tasks) */
export const OS_TASK_STATUS_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "pendiente", label: "Pendiente" },
  { value: "en_progreso", label: "En progreso" },
  { value: "bloqueada", label: "Bloqueada" },
  { value: "completada", label: "Completada" },
] as const;

export const OS_TASK_PRIORITY_OPTIONS = [
  { value: "", label: "Todas" },
  { value: "baja", label: "Baja" },
  { value: "media", label: "Media" },
  { value: "alta", label: "Alta" },
] as const;

export const OS_TASK_ACTIVE_STATUSES = new Set(["pendiente", "en_progreso", "bloqueada"]);
