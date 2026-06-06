import type { OsDeliverableStatus } from "@/features/os-shell/deliverables/types";

const LABELS: Record<OsDeliverableStatus, string> = {
  draft: "Borrador",
  in_review: "En revisión",
  delivered: "Entregado",
  approved: "Aprobado (interno)",
  published: "Publicado",
  approved_by_client: "Aprobado cliente",
  changes_requested: "Cambios solicitados",
  rejected: "Rechazado",
  archived: "Archivado",
};

const TONES: Record<OsDeliverableStatus, "neutral" | "success" | "warning" | "danger" | "info"> = {
  draft: "neutral",
  in_review: "info",
  delivered: "info",
  approved: "success",
  published: "success",
  approved_by_client: "success",
  changes_requested: "warning",
  rejected: "danger",
  archived: "neutral",
};

export function deliverableStatusLabel(status: string): string {
  return LABELS[status as OsDeliverableStatus] ?? status.replace(/_/g, " ");
}

export function deliverableStatusTone(status: string): "neutral" | "success" | "warning" | "danger" | "info" {
  return TONES[status as OsDeliverableStatus] ?? "neutral";
}

export const OS_DELIVERABLE_STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Todos" },
  ...Object.entries(LABELS).map(([value, label]) => ({ value, label })),
];

export const OS_DELIVERABLE_VISIBILITY_OPTIONS = [
  { value: "internal", label: "Interno" },
  { value: "client_visible", label: "Visible cliente" },
] as const;

export type WorkflowAction =
  | "submit-review"
  | "deliver"
  | "approve"
  | "publish"
  | "reject"
  | "create-revision";

export function availableWorkflowActions(status: OsDeliverableStatus): WorkflowAction[] {
  switch (status) {
    case "draft":
      return ["submit-review"];
    case "in_review":
      return ["deliver", "reject"];
    case "delivered":
      return ["approve", "reject"];
    case "approved":
      return ["publish"];
    case "changes_requested":
      return ["create-revision"];
    default:
      return [];
  }
}
