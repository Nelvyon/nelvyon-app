"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/core/ui/button";
import { PanelCard } from "@/core/ui/PanelCard";
import { FunnelStepPipeline } from "@/features/funnels/components/FunnelPanels";
import { useCreateFunnel } from "@/features/funnels/hooks";
import {
  buildFunnelCreatePayload,
  FUNNEL_FEATURED_PRESET,
  listFunnelElitePresets,
  type FunnelElitePreset,
} from "@/lib/eliteTemplates/funnelTemplates";
import { ELITE_SECTOR_GROUP_LABELS, type EliteSectorGroup } from "@/lib/eliteTemplates/types";

const GROUPS: EliteSectorGroup[] = ["local", "ecommerce", "saas_b2b"];

export function FunnelTemplateQuickLaunch({ compact }: { compact?: boolean }) {
  const router = useRouter();
  const createMutation = useCreateFunnel();
  const [activeGroup, setActiveGroup] = useState<EliteSectorGroup>("saas_b2b");
  const [selected, setSelected] = useState<FunnelElitePreset | null>(null);
  const [error, setError] = useState<string | null>(null);

  const presets = listFunnelElitePresets(activeGroup);

  const launch = async (preset: FunnelElitePreset) => {
    setError(null);
    try {
      const payload = buildFunnelCreatePayload(preset);
      const funnel = await createMutation.mutateAsync(payload);
      if (funnel?.id && funnel.id !== "mock-funnel") {
        router.push(`/funnels/${funnel.id}`);
      }
    } catch {
      setError("No se pudo crear el embudo desde la plantilla.");
    }
  };

  if (compact) {
    return (
      <PanelCard>
        <h2 className="text-base font-semibold">Plantilla élite recomendada</h2>
        <p className="mt-1 text-sm text-muted-foreground">{FUNNEL_FEATURED_PRESET.tagline}</p>
        <div className="mt-4">
          <FunnelStepPipeline steps={FUNNEL_FEATURED_PRESET.steps} />
        </div>
        <Button
          className="mt-4"
          disabled={createMutation.isPending}
          onClick={() => void launch(FUNNEL_FEATURED_PRESET)}
          type="button"
        >
          {createMutation.isPending ? "Creando…" : "Crear embudo demo (1 clic)"}
        </Button>
      </PanelCard>
    );
  }

  return (
    <div className="space-y-4">
      <PanelCard accent="from-violet-500/10 via-card to-card">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          Plantillas élite · Embudos
        </p>
        <h2 className="mt-1 text-lg font-semibold">{FUNNEL_FEATURED_PRESET.label}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{FUNNEL_FEATURED_PRESET.tagline}</p>
        <div className="mt-4">
          <FunnelStepPipeline steps={FUNNEL_FEATURED_PRESET.steps} />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            disabled={createMutation.isPending}
            onClick={() => void launch(FUNNEL_FEATURED_PRESET)}
            type="button"
          >
            {createMutation.isPending ? "Creando…" : "Crear embudo demo (1 clic)"}
          </Button>
          <Button asChild type="button" variant="outline">
            <Link href="/funnels/builder">Abrir builder</Link>
          </Button>
        </div>
        {error ? (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </PanelCard>

      <PanelCard>
        <p className="text-sm font-medium">Variantes por sector (2 clics)</p>
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
              <p className="font-medium text-foreground">{preset.label}</p>
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
    </div>
  );
}
