import type { PortalDeliverableStatus } from "@/features/client_portal_v1/types";

export const PORTAL_DELIVERABLE_STATUS_LABEL: Record<PortalDeliverableStatus, string> = {
  published: "Pending your review",
  approved_by_client: "Approved",
  changes_requested: "Changes requested",
};

export function portalDeliverableStatusLabel(status: string): string {
  if (status in PORTAL_DELIVERABLE_STATUS_LABEL) {
    return PORTAL_DELIVERABLE_STATUS_LABEL[status as PortalDeliverableStatus];
  }
  return status.replace(/_/g, " ");
}

export function canReviewDeliverable(status: string): boolean {
  return status === "published";
}
