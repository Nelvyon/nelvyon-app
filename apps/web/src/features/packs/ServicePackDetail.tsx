"use client";

import Link from "next/link";
import { notFound } from "next/navigation";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { PanelCard } from "@/core/ui/PanelCard";
import {
  SAAS_PACK_DETAIL,
  SAAS_PACKS_HUB,
  getServicePackOsSummary,
  SERVICE_PACK_CATALOG,
} from "@/lib/saas";

export function ServicePackDetail({ slug }: { slug: string }) {
  const pack = SERVICE_PACK_CATALOG.find((p) => p.slug === slug);
  if (!pack) notFound();

  const osSummary = getServicePackOsSummary(pack.id);
  const canLaunch = pack.availability !== "coming_soon" && pack.kickoffPath;

  return (
    <ProtectedLayout module="campaigns">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link className="text-sm text-link hover:underline" href="/packs">
          {SAAS_PACK_DETAIL.backToCatalog}
        </Link>

        <div>
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
              pack.availability === "available"
                ? "bg-success/10 text-success-foreground"
                : pack.availability === "beta"
                  ? "bg-primary/10 text-primary"
                  : "bg-muted text-muted-foreground"
            }`}
          >
            {pack.availability === "available"
              ? SAAS_PACKS_HUB.badgeAvailable
              : pack.availability === "beta"
                ? SAAS_PACKS_HUB.badgeBeta
                : SAAS_PACKS_HUB.badgeSoon}
          </span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{pack.name}</h1>
          <p className="mt-2 text-muted-foreground">{pack.tagline}</p>
        </div>

        <PanelCard accent={pack.accent}>
          <DetailSection title={SAAS_PACK_DETAIL.problemTitle} text={pack.problem} />
          <DetailSection title={SAAS_PACK_DETAIL.audienceTitle} text={pack.audience} />
        </PanelCard>

        <PanelCard>
          <h2 className="text-base font-semibold">{SAAS_PACK_DETAIL.inputsTitle}</h2>
          <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-muted-foreground">
            {pack.inputs.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </PanelCard>

        <PanelCard>
          <h2 className="text-base font-semibold">{SAAS_PACK_DETAIL.outputsTitle}</h2>
          <ul className="mt-3 list-inside list-disc space-y-1 text-sm text-muted-foreground">
            {pack.outputs.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
        </PanelCard>

        {osSummary ? (
          <PanelCard className="border-dashed">
            <h2 className="text-base font-semibold">{SAAS_PACK_DETAIL.behindTitle}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{SAAS_PACK_DETAIL.behindHint}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              {osSummary.agentCount} agentes · {osSummary.templateCount} plantillas de proceso ·{" "}
              {osSummary.connectorCount} conectores
              {osSummary.skus.length > 0 ? ` · SKUs: ${osSummary.skus.join(", ")}` : ""}
            </p>
          </PanelCard>
        ) : null}

        <div className="flex flex-wrap gap-3">
          {canLaunch ? (
            <Button asChild size="lg">
              <Link href={pack.kickoffPath!}>{SAAS_PACK_DETAIL.launchCta}</Link>
            </Button>
          ) : (
            <Button disabled size="lg" variant="outline">
              {SAAS_PACKS_HUB.ctaComingSoon}
            </Button>
          )}
          {pack.reportPath ? (
            <Button asChild size="lg" variant="outline">
              <Link href={pack.reportPath}>{SAAS_PACKS_HUB.ctaViewResults}</Link>
            </Button>
          ) : null}
        </div>
      </div>
    </ProtectedLayout>
  );
}

function DetailSection({ title, text }: { title: string; text: string }) {
  return (
    <div className="mt-4 first:mt-0">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
