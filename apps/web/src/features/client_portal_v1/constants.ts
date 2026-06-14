import type { PortalDeliverableStatus } from "@/features/client_portal_v1/types";

export const PORTAL_DELIVERABLE_STATUS_LABEL: Record<PortalDeliverableStatus, string> = {
  published: "Pendiente de revisión",
  approved_by_client: "Aprobado",
  changes_requested: "Cambios solicitados",
};

export const PORTAL_DELIVERABLE_TYPE_LABEL: Record<string, string> = {
  landing: "Landing page",
  seo: "Informe SEO",
  chatbot: "Chatbot / IA",
  report: "Informe",
  creative: "Creatividades",
  email: "Email / campaña",
  ads: "Anuncios",
  document: "Documento",
};

export function portalDeliverableStatusLabel(status: string): string {
  if (status in PORTAL_DELIVERABLE_STATUS_LABEL) {
    return PORTAL_DELIVERABLE_STATUS_LABEL[status as PortalDeliverableStatus];
  }
  return status.replace(/_/g, " ");
}

export function portalDeliverableTypeLabel(type?: string | null): string {
  if (!type) return "Entregable";
  const key = type.toLowerCase();
  if (key in PORTAL_DELIVERABLE_TYPE_LABEL) return PORTAL_DELIVERABLE_TYPE_LABEL[key];
  return type.replace(/_/g, " ");
}

export function portalProjectStatusLabel(status: string): string {
  const map: Record<string, string> = {
    active: "Activo",
    paused: "Pausado",
    completed: "Completado",
    draft: "Borrador",
  };
  return map[status.toLowerCase()] ?? status.replace(/_/g, " ");
}

export function canReviewDeliverable(status: string): boolean {
  return status === "published";
}
