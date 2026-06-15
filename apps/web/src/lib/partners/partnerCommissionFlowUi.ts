import type { PartnerHqResponse } from "@/features/partners/api";
import type { PartnerConnectStatus } from "@/lib/partners/partnerConnectTypes";

export type StepState = "done" | "current" | "upcoming";

export function connectStepBadge(connect: PartnerConnectStatus): { label: string; hint: string } {
  switch (connect.onboarding_status) {
    case "active":
      return { label: "Completo", hint: "Listo para recibir transferencias" };
    case "pending":
      return { label: "Pendiente", hint: "Termina la verificación en Stripe" };
    case "restricted":
      return { label: "Revisión", hint: "Contacta soporte o completa datos en Stripe" };
    default:
      return { label: "Sin configurar", hint: "Empieza aquí — 5 min" };
  }
}

export function resolveMarginHero(data: PartnerHqResponse) {
  const hasLedger = (data.ledger_entries?.length ?? 0) > 0 || data.metrics.ledger_margin_mtd_eur > 0;
  const mtd = hasLedger ? data.metrics.ledger_margin_mtd_eur : data.metrics.pack_margin_mtd_eur;
  const total = hasLedger ? data.metrics.ledger_margin_total_eur : data.metrics.pack_margin_mtd_eur;
  return { mtd, total, real: hasLedger };
}

export function stepStates(
  data: PartnerHqResponse,
  connect: PartnerConnectStatus,
): [StepState, StepState, StepState] {
  const step1Done = connect.onboarding_complete || connect.onboarding_status === "active";
  const step2Done = data.metrics.total_clients > 0;
  const step3Done = data.metrics.active_packs > 0;

  if (!step1Done) return ["current", "upcoming", "upcoming"];
  if (!step2Done) return ["done", "current", "upcoming"];
  if (!step3Done) return ["done", "done", "current"];
  return ["done", "done", "done"];
}
