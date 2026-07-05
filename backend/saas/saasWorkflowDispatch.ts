import type { SaasDeal } from "./SaasDealsService";
import type { SaasContact } from "./SaasCrmService";
import type { DealStage } from "./saasDealsDedupe";

/** Fire active workflows on contact_created (non-blocking). */
export async function dispatchContactCreated(tenantId: string, contact: SaasContact): Promise<void> {
  try {
    const { getSaasWorkflowService } = await import("./SaasWorkflowService");
    await getSaasWorkflowService().dispatchActiveWorkflows(tenantId, "contact_created", {
      contact: {
        id: contact.id,
        name: contact.name,
        email: contact.email,
        status: contact.status,
        pipeline_stage: contact.pipelineStage,
        value: contact.value,
      },
    });
  } catch (e) {
    console.error("[workflow-dispatch] contact_created failed", { tenantId, contactId: contact.id, err: e });
  }
}

/** Fire active workflows on contact pipeline_stage change (non-blocking). */
export async function dispatchContactStageChanged(
  tenantId: string,
  contact: SaasContact,
  previousStage: SaasContact["pipelineStage"],
): Promise<void> {
  try {
    const { getSaasWorkflowService } = await import("./SaasWorkflowService");
    await getSaasWorkflowService().dispatchActiveWorkflows(tenantId, "stage_changed", {
      contact: {
        id: contact.id,
        name: contact.name,
        email: contact.email,
        status: contact.status,
        pipeline_stage: contact.pipelineStage,
        previousStage,
        value: contact.value,
      },
    });
  } catch (e) {
    console.error("[workflow-dispatch] stage_changed failed", { tenantId, contactId: contact.id, err: e });
  }
}

/** Fire active workflows on form submission (non-blocking). */
export async function dispatchFormSubmitted(
  tenantId: string,
  formId: string,
  contactId: string | null,
  data: Record<string, unknown>,
): Promise<void> {
  try {
    const { getSaasWorkflowService } = await import("./SaasWorkflowService");
    await getSaasWorkflowService().dispatchActiveWorkflows(tenantId, "form_submitted", {
      form: { id: formId },
      contact: contactId ? { id: contactId } : {},
      submission: data,
    });
  } catch (e) {
    console.error("[workflow-dispatch] form_submitted failed", { tenantId, formId, err: e });
  }
}

/** Fire active workflows on tag added (non-blocking). */
export async function dispatchTagAdded(
  tenantId: string,
  contactId: string,
  tag: string,
): Promise<void> {
  try {
    const { getSaasWorkflowService } = await import("./SaasWorkflowService");
    await getSaasWorkflowService().dispatchActiveWorkflows(tenantId, "tag_added", {
      contact: { id: contactId },
      tag,
    });
  } catch (e) {
    console.error("[workflow-dispatch] tag_added failed", { tenantId, contactId, err: e });
  }
}

/** Fire active workflows on email open (non-blocking). */
export async function dispatchEmailOpened(
  tenantId: string,
  campaniaId: string,
  contactId: string,
): Promise<void> {
  try {
    const { getSaasWorkflowService } = await import("./SaasWorkflowService");
    await getSaasWorkflowService().dispatchActiveWorkflows(tenantId, "email_opened", {
      email: { campaniaId, contactId },
    });
  } catch (e) {
    console.error("[workflow-dispatch] email_opened failed", { tenantId, campaniaId, contactId, err: e });
  }
}

/** Fire active workflows on email link click (non-blocking). */
export async function dispatchEmailClicked(
  tenantId: string,
  campaniaId: string,
  contactId: string,
  url: string,
): Promise<void> {
  try {
    const { getSaasWorkflowService } = await import("./SaasWorkflowService");
    await getSaasWorkflowService().dispatchActiveWorkflows(tenantId, "email_clicked", {
      email: { campaniaId, contactId, url },
    });
  } catch (e) {
    console.error("[workflow-dispatch] email_clicked failed", { tenantId, campaniaId, contactId, err: e });
  }
}

/** Fire active workflows on incoming webhook (non-blocking). */
export async function dispatchWebhookIn(
  tenantId: string,
  source: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    const { getSaasWorkflowService } = await import("./SaasWorkflowService");
    await getSaasWorkflowService().dispatchActiveWorkflows(tenantId, "webhook_in", {
      source,
      payload,
    });
  } catch (e) {
    console.error("[workflow-dispatch] webhook_in failed", { tenantId, source, err: e });
  }
}

/** Fire date_reached workflows whose configured date is today (called from cron). */
export async function dispatchDateReached(tenantId: string): Promise<void> {
  try {
    const { getSaasWorkflowService } = await import("./SaasWorkflowService");
    await getSaasWorkflowService().dispatchActiveWorkflows(tenantId, "date_reached", {
      date: new Date().toISOString().slice(0, 10),
    });
  } catch (e) {
    console.error("[workflow-dispatch] date_reached failed", { tenantId, err: e });
  }
}

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
  } catch (e) {
    console.error("[workflow-dispatch] deal_stage_changed failed", { tenantId, dealId: deal.id, err: e });
  }
}
