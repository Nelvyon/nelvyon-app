"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@/core/ui/button";
import { PanelCard } from "@/core/ui/PanelCard";
import { useAdsBriefing } from "@/features/publicidad/hooks";
import {
  ADS_FEATURED_PRESET,
  ADS_OS_PREVIEW,
  buildAdsBriefingFromPreset,
  listAdsElitePresets,
  type AdsElitePreset,
} from "@/lib/eliteTemplates/adsTemplates";
import { ELITE_SECTOR_GROUP_LABELS, type EliteSectorGroup } from "@/lib/eliteTemplates/types";

const GROUPS: EliteSectorGroup[] = ["local", "ecommerce", "saas_b2b"];

export function AdsTemplateQuickLaunch() {
  const briefingMutation = useAdsBriefing();
  const [activeGroup, setActiveGroup] = useState<EliteSectorGroup>("ecommerce");
  const [lastRunId, setLastRunId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const presets = listAdsElitePresets(activeGroup);

  const launch = async (preset: AdsElitePreset) => {
    setError(null);
    try {
      const res = await briefingMutation.mutateAsync(buildAdsBriefingFromPreset(preset, true));
      setLastRunId(res.run_id);
    } catch {
      setError("No se pudo lanzar la plantilla de publicidad.");
    }
  };

  return (
    <div className="space-y-4">
      <PanelCard accent="from-blue-500/10 via-card to-card">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          Plantillas élite · Publicidad
        </p>
        <h2 className="mt-1 text-lg font-semibold">{ADS_FEATURED_PRESET.label}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{ADS_FEATURED_PRESET.tagline}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            disabled={briefingMutation.isPending}
            onClick={() => void launch(ADS_FEATURED_PRESET)}
            type="button"
          >
            {briefingMutation.isPending ? "Lanzando…" : "Lanzar plantilla demo (1 clic)"}
          </Button>
          <Button asChild type="button" variant="outline">
            <Link href={ADS_OS_PREVIEW} target="_blank">
              Ver preview OS
            </Link>
          </Button>
        </div>
        {lastRunId ? (
          <p className="mt-3 text-sm text-success-foreground">
            Estrategia generada · run <code className="text-xs">{lastRunId}</code>
          </p>
        ) : null}
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
              onClick={() => setActiveGroup(g)}
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
            <div
              className="rounded-lg border border-border bg-muted/20 px-4 py-3"
              key={preset.id}
            >
              <p className="font-medium text-foreground">{preset.label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{preset.tagline}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {preset.platforms.map((p) => (p === "google" ? "Google" : "Meta")).join(" + ")} ·{" "}
                {preset.templateId}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  disabled={briefingMutation.isPending}
                  onClick={() => void launch(preset)}
                  size="sm"
                  type="button"
                >
                  Lanzar
                </Button>
                <Button asChild size="sm" variant="ghost">
                  <Link href={preset.previewPath} target="_blank">
                    Preview
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </PanelCard>
    </div>
  );
}
