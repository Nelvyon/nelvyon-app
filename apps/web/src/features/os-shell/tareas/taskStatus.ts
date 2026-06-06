type Tone = "neutral" | "success" | "warning" | "danger" | "info";

/** Legacy Spanish status tones (entities/os_tasks). */
export function taskStatusTone(status: string): Tone {
  switch (status) {
    case "completada":
    case "completed":
      return "success";
    case "bloqueada":
    case "blocked":
      return "danger";
    case "en_progreso":
    case "in_progress":
      return "info";
    default:
      return "warning";
  }
}

export function taskStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pendiente: "Pendiente",
    pending: "Pendiente",
    en_progreso: "En progreso",
    in_progress: "En progreso",
    bloqueada: "Bloqueada",
    blocked: "Bloqueada",
    completada: "Completada",
    completed: "Completada",
    archived: "Archivada",
  };
  return map[status] ?? status;
}

export function taskPriorityTone(priority: string): Tone {
  if (priority === "alta" || priority === "high" || priority === "urgent") return "danger";
  if (priority === "baja" || priority === "low") return "neutral";
  return "warning";
}

export function taskPriorityLabel(priority: string): string {
  const map: Record<string, string> = {
    baja: "Baja",
    low: "Baja",
    media: "Media",
    medium: "Media",
    alta: "Alta",
    high: "Alta",
    urgent: "Urgente",
  };
  return map[priority] ?? priority;
}

export function isTaskOverdue(dueDate: string | null | undefined, status?: string): boolean {
  if (!dueDate) return false;
  if (status === "completada" || status === "completed" || status === "archived") return false;
  const d = new Date(dueDate);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

export const OS_CANONICAL_TASK_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Todos" },
  { value: "pending", label: "Pendiente" },
  { value: "in_progress", label: "En progreso" },
  { value: "blocked", label: "Bloqueada" },
  { value: "completed", label: "Completada" },
  { value: "archived", label: "Archivada" },
];

export const OS_CANONICAL_TASK_STATUS_FORM_OPTIONS = OS_CANONICAL_TASK_STATUS_OPTIONS.filter(
  (o) => o.value,
);

export const OS_CANONICAL_TASK_PRIORITY_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Todas" },
  { value: "low", label: "Baja" },
  { value: "medium", label: "Media" },
  { value: "high", label: "Alta" },
  { value: "urgent", label: "Urgente" },
];

export const OS_CANONICAL_TASK_PRIORITY_FORM_OPTIONS = OS_CANONICAL_TASK_PRIORITY_OPTIONS.filter(
  (o) => o.value,
);
