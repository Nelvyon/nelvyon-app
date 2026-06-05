import { isOpenDealStage, type DealStage } from "./saasDealsDedupe";

export type PipelineStageDealInput = {
  stage: DealStage;
  value: number;
  updatedAt: string | Date;
};

/**
 * Etapa principal del contacto derivada de sus deals.
 * 1. Deals abiertos: mayor value; empate → updated_at más reciente.
 * 2. Sin abiertos: won/lost más reciente por updated_at.
 * 3. Sin deals: null (el caller puede usar "new").
 */
export function pickPrimaryPipelineStage(deals: PipelineStageDealInput[]): DealStage | null {
  if (deals.length === 0) return null;

  const open = deals.filter((d) => isOpenDealStage(d.stage));
  const pool = open.length > 0 ? open : deals;

  const sorted = [...pool].sort((a, b) => {
    if (open.length > 0 && b.value !== a.value) {
      return b.value - a.value;
    }
    const au = toTime(a.updatedAt);
    const bu = toTime(b.updatedAt);
    return bu - au;
  });

  return sorted[0]?.stage ?? null;
}

function toTime(v: string | Date): number {
  const t = typeof v === "string" ? new Date(v).getTime() : v.getTime();
  return Number.isFinite(t) ? t : 0;
}
