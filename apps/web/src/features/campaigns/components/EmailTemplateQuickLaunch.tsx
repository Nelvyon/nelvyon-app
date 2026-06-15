"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/core/ui/button";
import { PanelCard } from "@/core/ui/PanelCard";
import { useCreateCampaign } from "@/features/campaigns/hooks";
import { useClients } from "@/features/crm/hooks";
import {
  buildEmailCampaignFromPreset,
  EMAIL_FEATURED_PRESET,
  EMAIL_OS_PREVIEW,
  listEmailElitePresets,
  type EmailElitePreset,
} from "@/lib/eliteTemplates/emailTemplates";
import { ELITE_SECTOR_GROUP_LABELS, type EliteSectorGroup } from "@/lib/eliteTemplates/types";

const GROUPS: EliteSectorGroup[] = ["local", "ecommerce", "saas_b2b"];

export function EmailTemplateQuickLaunch() {
  const router = useRouter();
  const clientsQuery = useClients();
  const createMutation = useCreateCampaign();
  const [activeGroup, setActiveGroup] = useState<EliteSectorGroup>("ecommerce");
  const [error, setError] = useState<string | null>(null);

  const clients = clientsQuery.data?.items ?? [];
  const defaultClientId = clients[0]?.id;
  const presets = listEmailElitePresets(activeGroup);

  const launch = async (preset: EmailElitePreset) => {
    setError(null);
    if (!defaultClientId) {
      setError("Añade un cliente en Revenue antes de lanzar la secuencia.");
      return;
    }
    try {
      const created = await createMutation.mutateAsync(
        buildEmailCampaignFromPreset(preset, defaultClientId),
      );
      router.push(`/campaigns/${created.id}`);
    } catch {
      setError("No se pudo crear la campaña de email desde la plantilla.");
    }
  };

  return (
    <div className="space-y-4">
      <PanelCard accent="from-amber-500/10 via-card to-card">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          Plantillas élite · Email / Nurture
        </p>
        <h2 className="mt-1 text-lg font-semibold">{EMAIL_FEATURED_PRESET.label}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{EMAIL_FEATURED_PRESET.tagline}</p>
        <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
          {EMAIL_FEATURED_PRESET.sequence.map((step) => (
            <li key={step.day}>
              <span className="font-medium text-foreground">D+{step.day}</span> · {step.subject}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button
            disabled={createMutation.isPending || clientsQuery.isLoading}
            onClick={() => void launch(EMAIL_FEATURED_PRESET)}
            type="button"
          >
            {createMutation.isPending ? "Lanzando…" : "Lanzar secuencia demo (1 clic)"}
          </Button>
          <Button asChild type="button" variant="outline">
            <Link href={EMAIL_OS_PREVIEW} target="_blank">
              Ver preview OS
            </Link>
          </Button>
        </div>
        {!defaultClientId && !clientsQuery.isLoading ? (
          <p className="mt-3 text-sm text-muted-foreground">
            <Link className="text-primary underline" href="/crm/clients/new">
              Añade tu primer cliente
            </Link>{" "}
            para vincular la secuencia.
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
                {preset.sequence.length} emails · {preset.templateId}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  disabled={createMutation.isPending}
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
