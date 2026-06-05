import type { SaasDeal } from "./SaasDealsService";
import type { DealStage } from "./saasDealsDedupe";

/** Fire active workflows listening for deal stage changes (non-blocking for deal mutation). */
export async function dispatchDealStageChanged(
  tenantId: string,
  deal: SaasDeal,
  previousStage: DealStage,
): Promise<void> {
  try {
    const { getSaasWorkflowService } = await import("./SaasWorkflowService");
    await getSaasWorkflowService().dispatchActiveWorkflows(tenantId, "deal_stage_changed", {
      deal: {
        id: deal.id,
        stage: deal.stage,
        previousStage,
        contactId: deal.contactId,
        title: deal.title,
        value: deal.value,
        probability: deal.probability,
      },
      contact: deal.contactId ? { id: deal.contactId } : {},
    });
  } catch {
    // Workflow dispatch must not roll back deal stage changes.
  }
}
