"use client";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { PanelCard } from "@/core/ui/PanelCard";
import { ErrorNotice } from "@/core/ui/pageStatus";
import { SkeletonListRows } from "@/core/ui/Skeleton";
import { AutomatizacionSubNav } from "@/features/automatizacion/components/AutomatizacionSubNav";
import { automatizacionApi } from "@/features/automatizacion/api";
import { useAutomatizacionRules } from "@/features/automatizacion/hooks";

export function ReglasClient() {
  const query = useAutomatizacionRules();
  const items = query.data?.items ?? [];

  return (
    <ProtectedLayout module="automations">
      <div className="space-y-6">
        <AutomatizacionSubNav />

        {query.error ? (
          <ErrorNotice>
            <p>No pudimos cargar las reglas CRM.</p>
          </ErrorNotice>
        ) : null}

        <PanelCard>
          <h2 className="text-base font-semibold">Reglas del motor CRM</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Triggers automáticos en deals, contactos y etapas del pipeline.
          </p>
          {query.isLoading ? (
            <SkeletonListRows rows={4} />
          ) : items.length ? (
            <ul className="mt-4 divide-y divide-border text-sm">
              {items.map((rule) => (
                <li className="flex flex-wrap items-center justify-between gap-2 py-3" key={rule.id}>
                  <div>
                    <p className="font-medium">{rule.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {rule.trigger_type} → {rule.action_type} · {rule.runs_count} runs
                    </p>
                  </div>
                  <Button
                    onClick={() => void automatizacionApi.executeRule(rule.id)}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Ejecutar
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Crea reglas desde Recetas o configura triggers en el motor workflow-engine.
            </p>
          )}
        </PanelCard>
      </div>
    </ProtectedLayout>
  );
}
