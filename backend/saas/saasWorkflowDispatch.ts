import type { SaasDeal } from "./SaasDealsService";
import type { SaasContact } from "./SaasCrmService";
import type { DealStage } from "./saasDealsDedupe";
import type { SequenceTrigger } from "./SaasSequencesService";

/** Enroll contact into active sequences matching trigger (non-blocking). */
export async function dispatchSequenceTriggers(
  tenantId: string,
  trigger: SequenceTrigger,
  contactId: string,
): Promise<void> {
  try {
    const { getSaasSequencesService } = await import("./SaasSequencesService");
    const sequences = await getSaasSequencesService().list(tenantId);
    for (const seq of sequences) {
      if (seq.status !== "active" || seq.triggerType !== trigger) continue;
      try {
        await getSaasSequencesService().enroll(tenantId, seq.id, contactId);
      } catch (e) {
        console.error("[sequence-dispatch] enroll failed", {
          tenantId,
          sequenceId: seq.id,
          contactId,
          trigger,
          err: e,
        });
      }
    }
  } catch (e) {
    console.error("[sequence-dispatch] trigger dispatch failed", { tenantId, contactId, trigger, err: e });
  }
}

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
  await dispatchSequenceTriggers(tenantId, "contact_created", contact.id);
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
  if (contactId) {
    await dispatchSequenceTriggers(tenantId, "form_submitted", contactId);
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
  await dispatchSequenceTriggers(tenantId, "tag_added", contactId);
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
