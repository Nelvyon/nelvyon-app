"use client";

import { useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { PanelCard } from "@/core/ui/PanelCard";
import { ReviewList } from "@/features/reputacion/components/ReputacionPanels";
import { ReputacionMockBadge, ReputacionSubNav } from "@/features/reputacion/components/ReputacionSubNav";
import { useReputacionReviews } from "@/features/reputacion/hooks";

const FILTERS = [
  { id: "all", label: "Todas" },
  { id: "positive", label: "Positivas" },
  { id: "neutral", label: "Neutras" },
  { id: "negative", label: "Negativas" },
] as const;

export function ResenasClient() {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const query = useReputacionReviews(filter === "all" ? undefined : filter);
  const items = query.data?.items ?? [];

  return (
    <ProtectedLayout module="reputacion">
      <div className="space-y-6">
        <ReputacionSubNav />
        <ReputacionMockBadge mock={query.data?.mock} />

        <PanelCard>
          <h2 className="text-base font-semibold">Listado de reseñas</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <button
                className={`rounded-md px-3 py-1 text-sm ${filter === f.id ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                key={f.id}
                onClick={() => setFilter(f.id)}
                type="button"
              >
                {f.label}
              </button>
            ))}
          </div>
          <div className="mt-4">
            <ReviewList items={items} />
          </div>
        </PanelCard>
      </div>
    </ProtectedLayout>
  );
}
