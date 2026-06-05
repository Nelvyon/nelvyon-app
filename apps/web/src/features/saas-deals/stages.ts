import type { DealStage } from "./types";

export const SAAS_DEAL_STAGES: readonly DealStage[] = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "won",
  "lost",
] as const;

export type SaasDealStageMeta = {
  id: DealStage;
  label: string;
  tone: "primary" | "success" | "warning" | "neutral" | "danger";
};

export const SAAS_DEAL_STAGE_META: Record<DealStage, SaasDealStageMeta> = {
  new: { id: "new", label: "Nuevo", tone: "primary" },
  contacted: { id: "contacted", label: "Contactado", tone: "primary" },
  qualified: { id: "qualified", label: "Calificado", tone: "warning" },
  proposal: { id: "proposal", label: "Propuesta", tone: "warning" },
  won: { id: "won", label: "Ganado", tone: "success" },
  lost: { id: "lost", label: "Perdido", tone: "danger" },
};

export function dealStageLabel(stage: DealStage): string {
  return SAAS_DEAL_STAGE_META[stage]?.label ?? stage;
}

export function isOpenDealStage(stage: DealStage): boolean {
  return stage !== "won" && stage !== "lost";
}

export function nextDealStage(stage: DealStage): DealStage | null {
  const idx = SAAS_DEAL_STAGES.indexOf(stage);
  if (idx < 0 || idx >= SAAS_DEAL_STAGES.length - 1) return null;
  return SAAS_DEAL_STAGES[idx + 1] ?? null;
}

export function prevDealStage(stage: DealStage): DealStage | null {
  const idx = SAAS_DEAL_STAGES.indexOf(stage);
  if (idx <= 0) return null;
  return SAAS_DEAL_STAGES[idx - 1] ?? null;
}

export function formatDealValue(value: number, currency = "EUR"): string {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(value);
}
