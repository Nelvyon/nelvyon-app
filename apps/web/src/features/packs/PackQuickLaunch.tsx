"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { Button } from "@/core/ui/button";
import { PanelCard } from "@/core/ui/PanelCard";
import { GrowthPackKickoffForm, PackRunProgress } from "@/features/packs/GrowthPackComponents";
import type { PackMeta } from "@/lib/packs/packRegistry";
import {
  getPackFeaturedPreset,
  getPackTemplateGallery,
  listPackSectorPresets,
  type PackElitePreset,
} from "@/lib/packs/packEliteTemplates";
import { SAAS_ERRORS, SAAS_KICKOFF } from "@/lib/saas/copy";
import { resolvePackFocus } from "@/lib/saas/packFocusCopy";
import type { PackId, PackRunRecord } from "@/lib/packs/types";

type PackQuickLaunchProps = {
  packId: PackId;
  meta: PackMeta;
  onKickoff: (body: Record<string, unknown>) => Promise<PackRunRecord>;
  extraFields?: React.ReactNode;
  mergeKickoffBody?: (body: Record<string, unknown>) => Record<string, unknown>;
};

export function PackQuickLaunch(props: PackQuickLaunchProps) {
  return (
    <Suspense fallback={null}>
      <PackQuickLaunchInner {...props} />
    </Suspense>
  );
}

function PackQuickLaunchInner({
  packId,
  meta,
  onKickoff,
  extraFields,
  mergeKickoffBody,
}: PackQuickLaunchProps) {
  const [runId, setRunId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedSector, setSelectedSector] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const catalogFocus = resolvePackFocus(searchParams?.get("focus") ?? null);

  const withCatalogFocus = (body: Record<string, unknown>) =>
    catalogFocus ? { ...body, catalog_focus: catalogFocus } : body;

  const featured = getPackFeaturedPreset(packId);
  const gallery = getPackTemplateGallery(packId);
  const sectorPresets = listPackSectorPresets(
    packId,
    meta.sectors.map((s) => s.id),
  );

  const launchPreset = async (preset: PackElitePreset) => {
    setPending(true);
    setError(null);
    try {
      const body = mergeKickoffBody
        ? mergeKickoffBody(withCatalogFocus({ ...preset.intake, elite_preset_id: preset.id }))
        : withCatalogFocus({ ...preset.intake, elite_preset_id: preset.id });
      const run = await onKickoff(body);
      setRunId(run.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : SAAS_ERRORS.packLaunch);
    } finally {
      setPending(false);
    }
  };

  const activePreset =
    sectorPresets.find((p) => p.sector === selectedSector) ?? featured;

  return (
    <div className="space-y-6">
      <PanelCard accent={meta.accent}>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          {SAAS_KICKOFF.eliteTemplates}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{SAAS_KICKOFF.eliteHint}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {gallery.map((item) => (
            <Link
              className="rounded-lg border border-border bg-muted/20 px-4 py-3 transition hover:border-primary/40"
              href={item.previewPath}
              key={item.key}
              target="_blank"
            >
              <p className="text-sm font-medium text-foreground">{item.title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{item.description}</p>
              <p className="mt-2 text-xs font-medium text-link">Ver preview →</p>
            </Link>
          ))}
        </div>
      </PanelCard>

      <PanelCard accent={meta.accent}>
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          {SAAS_KICKOFF.quickLaunch}
        </p>
        <h2 className="mt-1 text-lg font-semibold">{featured.label}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{featured.tagline}</p>
        <Button
          className="mt-4"
          disabled={pending}
          onClick={() => void launchPreset(featured)}
          type="button"
        >
          {pending ? SAAS_KICKOFF.demoRunning : SAAS_KICKOFF.demoButton}
        </Button>
        {error ? (
          <p className="mt-3 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </PanelCard>

      <PanelCard>
        <p className="text-sm font-medium text-foreground">{SAAS_KICKOFF.sectorPick}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {meta.sectors.map((s) => (
            <Button
              key={s.id}
              onClick={() => setSelectedSector(s.id)}
              size="sm"
              type="button"
              variant={selectedSector === s.id ? "default" : "outline"}
            >
              {s.label}
            </Button>
          ))}
        </div>
        {selectedSector ? (
          <Button
            className="mt-4"
            disabled={pending}
            onClick={() => void launchPreset(activePreset)}
            type="button"
            variant="secondary"
          >
            {pending ? "Ejecutando…" : `Lanzar pack · ${activePreset.label}`}
          </Button>
        ) : null}
      </PanelCard>

      <div>
        <Button
          className="text-muted-foreground"
          onClick={() => setShowForm((v) => !v)}
          size="sm"
          type="button"
          variant="ghost"
        >
          {showForm ? "Ocultar brief personalizado" : "Personalizar brief (opcional)"}
        </Button>
        {showForm ? (
          <div className="mt-4">
            <GrowthPackKickoffForm
              defaultValues={featured.intake}
              extraFields={extraFields}
              meta={meta}
              onKickoff={(body) => onKickoff(withCatalogFocus(body))}
              onSuccess={setRunId}
            />
          </div>
        ) : null}
      </div>

      {runId ? <PackRunProgress packId={packId} runId={runId} /> : null}
    </div>
  );
}
