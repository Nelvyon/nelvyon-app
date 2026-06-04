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
