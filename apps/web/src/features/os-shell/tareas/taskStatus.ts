type Tone = "neutral" | "success" | "warning" | "danger" | "info";

export function taskStatusTone(status: string): Tone {
  switch (status) {
    case "completada":
      return "success";
    case "bloqueada":
      return "danger";
    case "en_progreso":
      return "info";
    default:
      return "warning";
  }
}

export function taskStatusLabel(status: string): string {
  const map: Record<string, string> = {
    pendiente: "Pendiente",
    en_progreso: "En progreso",
    bloqueada: "Bloqueada",
    completada: "Completada",
  };
  return map[status] ?? status;
}

export function taskPriorityTone(priority: string): Tone {
  if (priority === "alta") return "danger";
  if (priority === "baja") return "neutral";
  return "warning";
}

export function isTaskOverdue(dueDate: string | null | undefined): boolean {
  if (!dueDate) return false;
  const d = new Date(dueDate);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}
