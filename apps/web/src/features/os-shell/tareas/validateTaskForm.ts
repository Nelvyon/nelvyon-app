import type { OsTaskCreateInput } from "@/features/os-shell/tareas/types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateTaskForm(form: OsTaskCreateInput): string | null {
  if (!form.title?.trim()) return "El título es obligatorio.";
  if (form.client_id && !UUID_RE.test(form.client_id)) return "client_id inválido.";
  if (form.project_id && !UUID_RE.test(form.project_id)) return "project_id inválido.";
  return null;
}
