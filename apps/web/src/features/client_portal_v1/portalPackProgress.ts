import { getPackDeliverablesCatalog } from "@/lib/packs/packDeliverablesCatalog";
import type { PackId } from "@/lib/packs/types";

import type {
  PortalDeliverable,
  PortalPackSummary,
  PortalPackTaskItem,
  PortalPackTaskStatus,
} from "@/features/client_portal_v1/types";

const PACK_LABELS: Record<string, string> = {
  "local-business-growth": "Local Growth Pack",
  "ecommerce-growth": "Ecommerce Growth Pack",
  "saas-b2b-growth": "SaaS B2B Growth Pack",
};

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9áéíóúñü]+/gi, " ").trim();
}

function matchDeliverable(catalogTitle: string, deliverables: PortalDeliverable[]): PortalDeliverable | undefined {
  const ct = normalize(catalogTitle);
  const ctTokens = ct.split(" ").filter((t) => t.length > 3);
  return deliverables.find((d) => {
    const dt = normalize(d.title);
    if (dt.includes(ct.slice(0, 14)) || ct.includes(dt.slice(0, 14))) return true;
    return ctTokens.some((tok) => dt.includes(tok));
  });
}

function taskStatusFromDeliverable(del?: PortalDeliverable): PortalPackTaskStatus {
  if (!del) return "pending";
  if (del.status === "approved_by_client") return "done";
  if (del.status === "changes_requested") return "changes";
  return "review";
}

export function portalPackLabel(packId?: string | null): string | null {
  if (!packId) return null;
  return PACK_LABELS[packId] ?? packId.replace(/-/g, " ");
}

export function findPackSummary(deliverables: PortalDeliverable[]): PortalPackSummary | null {
  for (const d of deliverables) {
    if (d.pack_summary) return d.pack_summary;
  }
  return null;
}

export function buildPackPortalView(
  packId: string,
  deliverables: PortalDeliverable[],
  packSummary?: PortalPackSummary | null,
) {
  const catalog = getPackDeliverablesCatalog(packId as PackId);
  const tasks: PortalPackTaskItem[] = catalog.map((item) => {
    const linked = matchDeliverable(item.title, deliverables);
    return {
      catalogTitle: item.title,
      description: item.description,
      portalLabel: item.portalLabel,
      deliverableId: linked?.id,
      status: taskStatusFromDeliverable(linked),
    };
  });

  const changes = deliverables.filter((d) => d.status === "changes_requested");
  const approved = deliverables.filter((d) => d.status === "approved_by_client").length;
  const pending = deliverables.filter((d) => d.status === "published").length;

  return {
    packLabel: portalPackLabel(packId) ?? packId,
    packSummary: packSummary ?? findPackSummary(deliverables),
    tasks,
    changes,
    stats: {
      approved,
      pending,
      changes: changes.length,
      total: deliverables.length,
    },
  };
}
