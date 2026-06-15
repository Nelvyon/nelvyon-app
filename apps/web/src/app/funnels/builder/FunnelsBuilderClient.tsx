"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { PanelCard } from "@/core/ui/PanelCard";
import { ErrorNotice } from "@/core/ui/pageStatus";
import { SkeletonListRows } from "@/core/ui/Skeleton";
import { FunnelStepPipeline } from "@/features/funnels/components/FunnelPanels";
import { FunnelTemplateQuickLaunch } from "@/features/funnels/components/FunnelTemplateQuickLaunch";
import { FunnelsSubNav } from "@/features/funnels/components/FunnelsSubNav";
import {
  buildFunnelCreatePayload,
  listFunnelElitePresets,
  type FunnelElitePreset,
} from "@/lib/eliteTemplates/funnelTemplates";
import { ELITE_SECTOR_GROUP_LABELS, type EliteSectorGroup } from "@/lib/eliteTemplates/types";
import { useCreateFunnel, useFunnelsList } from "@/features/funnels/hooks";

const GROUPS: EliteSectorGroup[] = ["local", "ecommerce", "saas_b2b"];

export function FunnelsBuilderClient() {
  const router = useRouter();
  const listQuery = useFunnelsList();
  const createMutation = useCreateFunnel();
  const [activeGroup, setActiveGroup] = useState<EliteSectorGroup>("ecommerce");
  const [selected, setSelected] = useState<FunnelElitePreset | null>(null);

  const presets = listFunnelElitePresets(activeGroup);

  async function launch(preset: FunnelElitePreset) {
    const payload = buildFunnelCreatePayload(preset);
    const funnel = await createMutation.mutateAsync(payload);
    if (funnel?.id && funnel.id !== "mock-funnel") {
      router.push(`/funnels/${funnel.id}`);
    }
  }

  const items = listQuery.data?.items ?? [];

  return (
    <ProtectedLayout module="funnels">
      <div className="space-y-6">
        <FunnelsSubNav />

        {listQuery.error ? (
          <ErrorNotice>
            <p>No pudimos cargar tus embudos.</p>
          </ErrorNotice>
        ) : null}

        <FunnelTemplateQuickLaunch />

        <PanelCard>
          <h2 className="text-base font-semibold">Builder por sector</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Elige variante, revisa pasos y crea en un clic — sin pantalla vacía.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {GROUPS.map((g) => (
              <Button
                key={g}
                onClick={() => {
                  setActiveGroup(g);
                  setSelected(null);
                }}
                size="sm"
                type="button"
                variant={activeGroup === g ? "default" : "outline"}
              >
                {ELITE_SECTOR_GROUP_LABELS[g]}
              </Button>
            ))}
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {presets.map((preset) => (
              <button
                className={`rounded-lg border px-4 py-3 text-left transition ${
                  selected?.id === preset.id
                    ? "border-primary bg-primary/5"
                    : "border-border bg-muted/20 hover:border-primary/40"
                }`}
                key={preset.id}
                onClick={() => setSelected(preset)}
                type="button"
              >
                <p className="font-medium">{preset.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{preset.tagline}</p>
              </button>
            ))}
          </div>
          {selected ? (
            <div className="mt-4 space-y-3">
              <FunnelStepPipeline steps={selected.steps} />
              <Button
                disabled={createMutation.isPending}
                onClick={() => void launch(selected)}
                type="button"
              >
                {createMutation.isPending ? "Creando…" : `Crear · ${selected.label}`}
              </Button>
            </div>
          ) : null}
        </PanelCard>

        <PanelCard>
          <h2 className="text-base font-semibold">Embudos existentes</h2>
          {listQuery.isLoading ? (
            <SkeletonListRows rows={4} />
          ) : items.length ? (
            <ul className="mt-3 divide-y divide-border">
              {items.map((f) => (
                <li className="flex flex-wrap items-center justify-between gap-2 py-3" key={f.id}>
                  <div>
                    <p className="font-medium">{f.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {f.step_count ?? f.steps?.length ?? 0} pasos · {f.status}
                    </p>
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/funnels/${f.id}`}>Editar y métricas</Link>
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Usa la plantilla élite superior para crear tu primer embudo.
            </p>
          )}
        </PanelCard>
      </div>
    </ProtectedLayout>
  );
}
