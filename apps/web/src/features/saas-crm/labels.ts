import type { ContactStatus, PipelineStage } from "./types";
import { dealStageLabel } from "@/features/saas-deals/stages";

const STATUS_LABELS: Record<ContactStatus, string> = {
  lead: "Lead",
  prospect: "Prospecto",
  client: "Cliente",
  churned: "Baja",
};

export function contactStatusLabel(status: ContactStatus): string {
  return STATUS_LABELS[status] ?? status;
}

export function contactStageLabel(stage: PipelineStage): string {
  return dealStageLabel(stage);
}

export const CONTACT_STATUSES: ContactStatus[] = ["lead", "prospect", "client", "churned"];
export const PIPELINE_STAGES: PipelineStage[] = [
  "new",
  "contacted",
  "qualified",
  "proposal",
  "won",
  "lost",
];
