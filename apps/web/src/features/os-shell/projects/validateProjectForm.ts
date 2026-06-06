import type { OsProjectCreateInput } from "@/features/os-shell/projects/types";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateProjectForm(form: OsProjectCreateInput): string | null {
  if (!form.client_id?.trim() || !UUID_RE.test(form.client_id.trim())) {
    return "Selecciona un cliente válido (UUID os_clients).";
  }
  if (!form.name?.trim()) return "El nombre del proyecto es obligatorio.";
  if (form.budget != null && form.budget !== "") {
    const n = Number(form.budget);
    if (!Number.isFinite(n) || n < 0) return "El presupuesto debe ser un número ≥ 0.";
  }
  if (form.start_date && form.due_date && form.start_date > form.due_date) {
    return "La fecha de inicio no puede ser posterior a la fecha límite.";
  }
  return null;
}
