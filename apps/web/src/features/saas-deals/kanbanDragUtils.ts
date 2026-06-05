import type { DealListResponse, DealStage, SaasDeal } from "./types";

/** Suppress card click briefly after a drag ends to avoid accidental selection. */
export const KANBAN_DRAG_CLICK_SUPPRESS_MS = 200;

export function shouldMoveDealOnDrop(currentStage: DealStage, targetStage: DealStage): boolean {
  return currentStage !== targetStage;
}

export function applyOptimisticStageChange(
  response: DealListResponse,
  dealId: string,
  newStage: DealStage,
): DealListResponse {
  return {
    ...response,
    deals: response.deals.map((d) => (d.id === dealId ? { ...d, stage: newStage } : d)),
  };
}

export function findDealForKanbanDrop(deals: SaasDeal[], dealId: string | null): SaasDeal | null {
  if (!dealId) return null;
  return deals.find((d) => d.id === dealId) ?? null;
}

export function resolveKanbanDrop(
  deals: SaasDeal[],
  dealId: string | null,
  targetStage: DealStage,
): { deal: SaasDeal; stage: DealStage } | null {
  const deal = findDealForKanbanDrop(deals, dealId);
  if (!deal || !shouldMoveDealOnDrop(deal.stage, targetStage)) return null;
  return { deal, stage: targetStage };
}

export function shouldSuppressKanbanClick(lastDragEndedAt: number, now = Date.now()): boolean {
  return now - lastDragEndedAt < KANBAN_DRAG_CLICK_SUPPRESS_MS;
}
