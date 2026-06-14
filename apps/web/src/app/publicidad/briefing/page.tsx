"use client";

import { useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { PanelCard } from "@/core/ui/PanelCard";
import { PublicidadSubNav } from "@/features/publicidad/components/PublicidadSubNav";
import { useAdsBriefing } from "@/features/publicidad/hooks";
import type { AdsBriefingPayload } from "@/features/publicidad/types";

const DEFAULT_BRIEFING: AdsBriefingPayload = {
  product: "NELVYON",
  audience: "CMOs y founders SaaS en España",
  goal: "conversions",
  daily_budget_eur: 120,
  launch: true,
  notes: "",
};

export default function PublicidadBriefingPage() {
  const briefingMutation = useAdsBriefing();
  const [briefing, setBriefing] = useState<AdsBriefingPayload>(DEFAULT_BRIEFING);
  const [lastRun, setLastRun] = useState<string | null>(null);

  async function handleSubmit(launch: boolean) {
    const res = await briefingMutation.mutateAsync({ ...briefing, launch });
    setLastRun(res.run_id);
  }

  return (
    <ProtectedLayout module="ads">
      <div className="space-y-6">
        <PublicidadSubNav />

        <p className="text-sm text-muted-foreground">
          El agente de paid media genera estrategia cross-platform y puede lanzar en Google y Meta a la vez.
        </p>

        <PanelCard>
          <h2 className="text-base font-semibold">Briefing de campaña</h2>
          <div className="mt-4 space-y-3">
            <label className="block text-sm">
              <span className="font-medium">Producto / marca</span>
              <input
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                onChange={(e) => setBriefing((b) => ({ ...b, product: e.target.value }))}
                value={briefing.product}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Audiencia</span>
              <input
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                onChange={(e) => setBriefing((b) => ({ ...b, audience: e.target.value }))}
                value={briefing.audience}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Presupuesto diario (€)</span>
              <input
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                min={10}
                onChange={(e) => setBriefing((b) => ({ ...b, daily_budget_eur: Number(e.target.value) }))}
                type="number"
                value={briefing.daily_budget_eur}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium">Notas adicionales</span>
              <textarea
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                onChange={(e) => setBriefing((b) => ({ ...b, notes: e.target.value }))}
                rows={4}
                value={briefing.notes ?? ""}
              />
            </label>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button
              disabled={briefingMutation.isPending}
              onClick={() => void handleSubmit(false)}
              type="button"
              variant="outline"
            >
              {briefingMutation.isPending ? "Generando…" : "Solo estrategia"}
            </Button>
            <Button disabled={briefingMutation.isPending} onClick={() => void handleSubmit(true)} type="button">
              {briefingMutation.isPending ? "Lanzando…" : "Lanzar en Google + Meta"}
            </Button>
          </div>

          {lastRun ? (
            <p className="mt-4 text-xs text-muted-foreground">
              Última ejecución: <code>{lastRun}</code>
            </p>
          ) : null}
        </PanelCard>
      </div>
    </ProtectedLayout>
  );
}
