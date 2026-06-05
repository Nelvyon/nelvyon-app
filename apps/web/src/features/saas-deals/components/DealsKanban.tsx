"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard } from "@/design-system/components";
import { cn } from "@/core/ui/utils";

import { resolveKanbanDrop, shouldSuppressKanbanClick } from "../kanbanDragUtils";
import type { DealStage, SaasDeal, SaasDealsMetrics } from "../types";
import { SAAS_DEAL_STAGES, dealStageLabel, formatDealValue, nextDealStage, prevDealStage } from "../stages";

type ContactLookup = Map<string, { name: string; company: string | null }>;

export function DealsKanban({
  deals,
  metrics,
  contactsById,
  isLoading,
  error,
  changingDealId,
  selectedDealId,
  onSelectDeal,
  onMoveStage,
  readOnly = false,
}: {
  deals: SaasDeal[];
  metrics?: SaasDealsMetrics;
  contactsById: ContactLookup;
  isLoading?: boolean;
  error?: unknown;
  changingDealId?: string | null;
  selectedDealId?: string | null;
  onSelectDeal?: (deal: SaasDeal) => void;
  onMoveStage: (deal: SaasDeal, stage: DealStage) => void;
  readOnly?: boolean;
}) {
  const [draggingDealId, setDraggingDealId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<DealStage | null>(null);
  const lastDragEndedAt = useRef(0);

  const finishDrag = useCallback(() => {
    lastDragEndedAt.current = Date.now();
    setDraggingDealId(null);
    setDragOverStage(null);
  }, []);

  const handleDrop = useCallback(
    (targetStage: DealStage) => {
      const resolved = resolveKanbanDrop(deals, draggingDealId, targetStage);
      if (resolved) {
        onMoveStage(resolved.deal, resolved.stage);
      }
      finishDrag();
    },
    [deals, draggingDealId, finishDrag, onMoveStage],
  );

  const handleCardClick = useCallback(
    (deal: SaasDeal) => {
      if (shouldSuppressKanbanClick(lastDragEndedAt.current)) return;
      onSelectDeal?.(deal);
    },
    [onSelectDeal],
  );

  const byStage = useMemo(() => {
    const map = new Map<DealStage, SaasDeal[]>();
    for (const s of SAAS_DEAL_STAGES) map.set(s, []);
    for (const d of deals) {
      const list = map.get(d.stage) ?? [];
      list.push(d);
      map.set(d.stage, list);
    }
    return map;
  }, [deals]);

  const stageStats = useMemo(() => {
    const map = new Map<DealStage, { count: number; totalValue: number }>();
    for (const s of SAAS_DEAL_STAGES) map.set(s, { count: 0, totalValue: 0 });
    for (const item of metrics?.byStage ?? []) {
      map.set(item.stage, { count: item.count, totalValue: item.totalValue });
    }
    return map;
  }, [metrics?.byStage]);

  if (isLoading) {
    return (
      <NelvyonDsCard title="Pipeline de deals">
        <p className="text-sm text-muted-foreground">Cargando oportunidades…</p>
      </NelvyonDsCard>
    );
  }

  if (error) {
    return (
      <NelvyonDsCard title="Pipeline de deals">
        <p className="text-sm text-destructive">
          {error instanceof Error ? error.message : "No se pudo cargar el pipeline."}
        </p>
      </NelvyonDsCard>
    );
  }

  const currency = metrics?.currency ?? "EUR";

  if (deals.length === 0) {
    return (
      <NelvyonDsCard title="Pipeline de deals">
        <p className="text-sm text-muted-foreground">
          Aún no hay oportunidades en el pipeline. Crea el primer deal con el botón «Nuevo deal».
        </p>
      </NelvyonDsCard>
    );
  }

  return (
    <section className="grid gap-3 lg:grid-cols-3 xl:grid-cols-6" aria-label="Kanban pipeline de deals">
      {SAAS_DEAL_STAGES.map((stage) => {
        const stats = stageStats.get(stage) ?? { count: 0, totalValue: 0 };
        const cards = byStage.get(stage) ?? [];
        const isDropTarget = dragOverStage === stage && draggingDealId !== null;
        return (
          <div
            key={stage}
            data-testid={`kanban-column-${stage}`}
            data-stage={stage}
            className={cn(
              "rounded-lg transition-colors",
              isDropTarget && "bg-primary/5 ring-2 ring-primary/50 ring-offset-2 ring-offset-background",
            )}
            onDragOver={(e) => {
              if (readOnly) return;
              e.preventDefault();
              if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
              setDragOverStage(stage);
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              setDragOverStage(stage);
            }}
            onDragLeave={(e) => {
              if (e.currentTarget.contains(e.relatedTarget as Node)) return;
              setDragOverStage((prev) => (prev === stage ? null : prev));
            }}
            onDrop={(e) => {
              if (readOnly) return;
              e.preventDefault();
              handleDrop(stage);
            }}
          >
            <NelvyonDsCard title={dealStageLabel(stage)}>
              <p className="mb-2 text-xs text-muted-foreground">
                {stats.count} · {formatDealValue(stats.totalValue, currency)}
              </p>
              <div className="min-h-[4rem] space-y-2">
                {cards.length === 0 ? <p className="text-xs text-muted-foreground">Sin deals</p> : null}
                {cards.map((deal) => {
                  const contact = deal.contactId ? contactsById.get(deal.contactId) : null;
                  const prev = prevDealStage(deal.stage);
                  const next = nextDealStage(deal.stage);
                  const busy = changingDealId === deal.id;
                  const selected = selectedDealId === deal.id;
                  const dragging = draggingDealId === deal.id;
                  return (
                    <div
                      key={deal.id}
                      data-testid={`kanban-deal-${deal.id}`}
                      data-deal-id={deal.id}
                      draggable={!busy && !readOnly}
                      aria-grabbed={dragging}
                      role="button"
                      tabIndex={0}
                      className={cn(
                        "rounded-md border bg-card p-2 text-xs transition-all",
                        busy && "pointer-events-none opacity-60",
                        readOnly ? "cursor-pointer hover:bg-muted/40" : dragging
                          ? "scale-[0.98] cursor-grabbing opacity-50 ring-2 ring-primary/40"
                          : "cursor-grab hover:bg-muted/40 active:cursor-grabbing",
                        selected && !dragging ? "border-primary ring-1 ring-primary/30" : "border-border",
                      )}
                      onDragStart={(e) => {
                        if (readOnly || busy) {
                          e.preventDefault();
                          return;
                        }
                        if (e.dataTransfer) {
                          e.dataTransfer.effectAllowed = "move";
                          e.dataTransfer.setData("text/plain", deal.id);
                        }
                        setDraggingDealId(deal.id);
                      }}
                      onDragEnd={finishDrag}
                      onClick={() => handleCardClick(deal)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleCardClick(deal);
                        }
                      }}
                    >
                      <p className="font-medium text-foreground">{deal.title}</p>
                      <p className="text-muted-foreground">{contact?.name ?? "Sin contacto"}</p>
                      <p className="text-muted-foreground">{contact?.company ?? "-"}</p>
                      <p className="text-muted-foreground">{formatDealValue(deal.value, deal.currency || currency)}</p>
                      <div className="mt-1 flex items-center gap-1">
                        <NelvyonDsBadge tone="neutral">{deal.probability}%</NelvyonDsBadge>
                        {busy ? (
                          <span className="text-[10px] text-muted-foreground" aria-live="polite">
                            Moviendo…
                          </span>
                        ) : null}
                      </div>
                      {!readOnly ? (
                        <div className="mt-2 flex gap-1">
                          <NelvyonDsButton
                            size="sm"
                            variant="secondary"
                            disabled={!prev || busy}
                            aria-label={`Mover ${deal.title} a etapa anterior`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (prev) onMoveStage(deal, prev);
                            }}
                          >
                            ◀
                          </NelvyonDsButton>
                          <NelvyonDsButton
                            size="sm"
                            variant="secondary"
                            disabled={!next || busy}
                            aria-label={`Mover ${deal.title} a etapa siguiente`}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (next) onMoveStage(deal, next);
                            }}
                          >
                            ▶
                          </NelvyonDsButton>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </NelvyonDsCard>
          </div>
        );
      })}
    </section>
  );
}
