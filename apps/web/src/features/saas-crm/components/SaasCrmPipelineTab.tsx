"use client";

import { useMemo, useState } from "react";

import { NelvyonDsButton, NelvyonDsSectionHeader } from "@/design-system/components";
import { DealDetailPanel } from "@/features/saas-deals/components/DealDetailPanel";
import { DealFormModal } from "@/features/saas-deals/components/DealFormModal";
import { DealsKanban } from "@/features/saas-deals/components/DealsKanban";
import { DealsKpiRow } from "@/features/saas-deals/components/DealsKpiRow";
import {
  useChangeDealStage,
  useSaasDealMetrics,
  useSaasDeals,
} from "@/features/saas-deals/hooks";
import type { SaasDeal } from "@/features/saas-deals/types";
import { SaasCan } from "@/features/saas-shell/components/SaasCan";
import { SaasEmptyState } from "@/features/saas-shell/components/SaasEmptyState";

import { useSaasCrmContacts } from "../hooks";

export function SaasCrmPipelineTab({ readOnly }: { readOnly: boolean }) {
  const dealsQuery = useSaasDeals();
  const metricsQuery = useSaasDealMetrics();
  const contactsQuery = useSaasCrmContacts();
  const changeStage = useChangeDealStage();

  const [selectedDeal, setSelectedDeal] = useState<SaasDeal | null>(null);
  const [dealModalOpen, setDealModalOpen] = useState(false);
  const [dealModalMode, setDealModalMode] = useState<"create" | "edit">("create");
  const [editingDeal, setEditingDeal] = useState<SaasDeal | null>(null);
  const [changingDealId, setChangingDealId] = useState<string | null>(null);

  const contactsById = useMemo(() => {
    const map = new Map<string, { name: string; company: string | null }>();
    for (const c of contactsQuery.data?.contacts ?? []) {
      map.set(c.id, { name: c.name, company: c.company });
    }
    return map;
  }, [contactsQuery.data?.contacts]);

  const contactOptions = useMemo(
    () =>
      (contactsQuery.data?.contacts ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        company: c.company,
      })),
    [contactsQuery.data?.contacts],
  );

  const deals = dealsQuery.data?.deals ?? [];
  const metrics = metricsQuery.data?.metrics;
  const showEmpty =
    !dealsQuery.isLoading && !dealsQuery.error && deals.length === 0 && !metricsQuery.isLoading;

  async function handleMoveStage(deal: SaasDeal, stage: SaasDeal["stage"]) {
    setChangingDealId(deal.id);
    try {
      await changeStage.mutateAsync({ dealId: deal.id, stage });
      if (selectedDeal?.id === deal.id) {
        setSelectedDeal({ ...deal, stage });
      }
    } finally {
      setChangingDealId(null);
    }
  }

  function openCreateDeal() {
    setDealModalMode("create");
    setEditingDeal(null);
    setDealModalOpen(true);
  }

  function openEditDeal(deal: SaasDeal) {
    setDealModalMode("edit");
    setEditingDeal(deal);
    setDealModalOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <NelvyonDsSectionHeader
          eyebrow="Pipeline"
          title="Oportunidades comerciales"
          subtitle="Kanban sobre saas_deals con métricas reales del tenant."
        />
        <SaasCan action="deals.write">
          <NelvyonDsButton type="button" onClick={openCreateDeal} disabled={readOnly}>
            Nuevo deal
          </NelvyonDsButton>
        </SaasCan>
      </div>

      <DealsKpiRow metrics={metrics} isLoading={metricsQuery.isLoading} error={metricsQuery.error} />

      {showEmpty ? (
        <SaasEmptyState
          title="Pipeline vacío"
          description="Crea tu primera oportunidad o importa contactos y conviértelos en deals."
          action={
            <SaasCan action="deals.write">
              <NelvyonDsButton type="button" onClick={openCreateDeal} disabled={readOnly}>
                Crear primer deal
              </NelvyonDsButton>
            </SaasCan>
          }
        />
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
        <DealsKanban
          deals={deals}
          metrics={metrics}
          contactsById={contactsById}
          isLoading={dealsQuery.isLoading}
          error={dealsQuery.error}
          changingDealId={changingDealId}
          selectedDealId={selectedDeal?.id ?? null}
          onSelectDeal={setSelectedDeal}
          onMoveStage={(deal, stage) => void handleMoveStage(deal, stage)}
          readOnly={readOnly}
        />
        <DealDetailPanel
          deal={selectedDeal}
          contactsById={contactsById}
          onEdit={openEditDeal}
          onDeleted={() => setSelectedDeal(null)}
          onClose={() => setSelectedDeal(null)}
        />
      </div>

      <DealFormModal
        open={dealModalOpen}
        mode={dealModalMode}
        deal={editingDeal}
        contacts={contactOptions}
        onClose={() => setDealModalOpen(false)}
        onSuccess={(deal) => setSelectedDeal(deal)}
      />
    </div>
  );
}
