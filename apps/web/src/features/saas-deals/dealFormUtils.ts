import type { DealStage, SaasDeal } from "./types";

export type DealFormState = {
  title: string;
  contact_id: string;
  value: string;
  currency: string;
  stage: DealStage;
  probability: string;
  expected_close_date: string;
  source: string;
  notes: string;
};

export const DEFAULT_DEAL_FORM: DealFormState = {
  title: "",
  contact_id: "",
  value: "0",
  currency: "EUR",
  stage: "new",
  probability: "50",
  expected_close_date: "",
  source: "",
  notes: "",
};

export function dealToFormState(deal: SaasDeal): DealFormState {
  return {
    title: deal.title,
    contact_id: deal.contactId ?? "",
    value: String(deal.value),
    currency: deal.currency || "EUR",
    stage: deal.stage,
    probability: String(deal.probability),
    expected_close_date: deal.expectedCloseDate ?? "",
    source: deal.source ?? "",
    notes: deal.notes ?? "",
  };
}

export function emptyDealForm(presetContactId?: string | null): DealFormState {
  return {
    ...DEFAULT_DEAL_FORM,
    contact_id: presetContactId ?? "",
  };
}

export type DealFormValidation = {
  valid: boolean;
  error?: string;
};

export function validateDealForm(form: DealFormState): DealFormValidation {
  const title = form.title.trim();
  if (title.length === 0) {
    return { valid: false, error: "El título es obligatorio." };
  }
  const value = Number(form.value);
  if (!Number.isFinite(value) || value < 0) {
    return { valid: false, error: "El valor debe ser un número mayor o igual a 0." };
  }
  const probability = Number(form.probability);
  if (!Number.isFinite(probability) || probability < 0 || probability > 100) {
    return { valid: false, error: "La probabilidad debe estar entre 0 y 100." };
  }
  return { valid: true };
}

export function formStateToCreatePayload(form: DealFormState) {
  const validation = validateDealForm(form);
  if (!validation.valid) throw new Error(validation.error);

  return {
    title: form.title.trim(),
    contact_id: form.contact_id.trim() || null,
    value: Number(form.value),
    currency: form.currency.trim() || "EUR",
    stage: form.stage,
    probability: Number(form.probability),
    expected_close_date: form.expected_close_date.trim() || null,
    source: form.source.trim() || null,
    notes: form.notes.trim() || null,
  };
}

export function formStateToUpdatePayload(form: DealFormState) {
  const validation = validateDealForm(form);
  if (!validation.valid) throw new Error(validation.error);

  return {
    title: form.title.trim(),
    contact_id: form.contact_id.trim() || null,
    value: Number(form.value),
    currency: form.currency.trim() || "EUR",
    stage: form.stage,
    probability: Number(form.probability),
    expected_close_date: form.expected_close_date.trim() || null,
    source: form.source.trim() || null,
    notes: form.notes.trim() || null,
  };
}
