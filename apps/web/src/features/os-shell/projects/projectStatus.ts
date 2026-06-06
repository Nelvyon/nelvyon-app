import type { OsProjectPriority, OsProjectStatus } from "@/features/os-shell/projects/types";

const STATUS_LABELS: Record<OsProjectStatus, string> = {
  draft: "Borrador",
  active: "Activo",
  paused: "Pausado",
  completed: "Completado",
  cancelled: "Cancelado",
  archived: "Archivado",
};

const STATUS_TONES: Record<OsProjectStatus, "success" | "neutral" | "warning" | "danger" | "info"> = {
  draft: "neutral",
  active: "success",
  paused: "warning",
  completed: "info",
  cancelled: "danger",
  archived: "neutral",
};

const PRIORITY_LABELS: Record<OsProjectPriority, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

const PRIORITY_TONES: Record<OsProjectPriority, "success" | "neutral" | "warning" | "danger" | "info"> = {
  low: "neutral",
  medium: "info",
  high: "warning",
  urgent: "danger",
};

export function projectStatusLabel(status: string): string {
  return STATUS_LABELS[status as OsProjectStatus] ?? status;
}

export function projectStatusTone(status: string): "success" | "neutral" | "warning" | "danger" | "info" {
  return STATUS_TONES[status as OsProjectStatus] ?? "neutral";
}

export function projectPriorityLabel(priority: string): string {
  return PRIORITY_LABELS[priority as OsProjectPriority] ?? priority;
}

export function projectPriorityTone(priority: string): "success" | "neutral" | "warning" | "danger" | "info" {
  return PRIORITY_TONES[priority as OsProjectPriority] ?? "neutral";
}

export const OS_CANONICAL_PROJECT_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "draft", label: "Borrador" },
  { value: "active", label: "Activo" },
  { value: "paused", label: "Pausado" },
  { value: "completed", label: "Completado" },
  { value: "cancelled", label: "Cancelado" },
  { value: "archived", label: "Archivado" },
];

export const OS_CANONICAL_PROJECT_STATUS_FORM_OPTIONS = OS_CANONICAL_PROJECT_STATUS_OPTIONS.filter(
  (o) => o.value,
);

export const OS_CANONICAL_PROJECT_PRIORITY_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Todas" },
  { value: "low", label: "Baja" },
  { value: "medium", label: "Media" },
  { value: "high", label: "Alta" },
  { value: "urgent", label: "Urgente" },
];

export const OS_CANONICAL_PROJECT_PRIORITY_FORM_OPTIONS = OS_CANONICAL_PROJECT_PRIORITY_OPTIONS.filter(
  (o) => o.value,
);
