"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { cn } from "@/core/ui/utils";
import { DashboardListShell, SkeletonTable } from "@/features/dashboard/components/DashboardTabs";
import { analyticsIntelligenceApi, type LeadRankingItem } from "@/features/analytics/api";

const TIER_STYLES: Record<string, string> = {
  cold: "bg-slate-100 text-slate-700",
  warm: "bg-amber-100 text-amber-800",
  hot: "bg-orange-100 text-orange-800",
  ready: "bg-green-100 text-green-800",
};

const TIER_LABELS: Record<string, string> = {
  cold: "Cold",
  warm: "Warm",
  hot: "Hot",
  ready: "Ready to buy",
};

export default function LeadScoringPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<LeadRankingItem[]>([]);
  const [scoringId, setScoringId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await analyticsIntelligenceApi.leadRanking(100);
      setItems(data.items ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  async function rescore(contactId: string) {
    setScoringId(contactId);
    try {
      await analyticsIntelligenceApi.scoreLead(contactId);
      await load();
    } finally {
      setScoringId(null);
    }
  }

  return (
    <ProtectedLayout module="os">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Leads ordenados por score IA (GPT-4o + señales CRM)</p>
        <button
          className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted"
          disabled={loading}
          onClick={() => load()}
          type="button"
        >
          Actualizar
        </button>
      </div>
      <DashboardListShell
        empty={!loading && items.length === 0}
        emptyDescription="Puntúa contactos desde el CRM o con Re-score."
        emptyTitle="Sin leads puntuados"
        loading={loading}
        skeleton={<SkeletonTable cols={5} rows={8} />}
      >
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Lead</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">Siguiente acción</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((lead) => (
                <tr className="border-b last:border-0" key={lead.contact_id}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{lead.name || "—"}</div>
                    <div className="text-xs text-muted-foreground">{lead.email}</div>
                    {lead.company ? <div className="text-xs text-muted-foreground">{lead.company}</div> : null}
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums">{lead.score}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium",
                        TIER_STYLES[lead.tier] ?? TIER_STYLES.cold,
                      )}
                    >
                      {TIER_LABELS[lead.tier] ?? lead.tier}
                    </span>
                  </td>
                  <td className="max-w-xs px-4 py-3 text-muted-foreground">{lead.next_action ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      className="mr-2 text-xs text-primary hover:underline"
                      href={`/dashboard/crm/contactos/${lead.contact_id}`}
                    >
                      Ver
                    </Link>
                    <button
                      className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
                      disabled={scoringId === lead.contact_id}
                      onClick={() => rescore(lead.contact_id)}
                      type="button"
                    >
                      {scoringId === lead.contact_id ? "..." : "Re-score"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DashboardListShell>
    </ProtectedLayout>
  );
}
