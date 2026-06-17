"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { Button } from "@/core/ui/button";
import { PanelCard } from "@/core/ui/PanelCard";
import {
  SAAS_PACKS_HUB,
  type ServicePackAvailability,
  type ServicePackCategory,
  SERVICE_PACK_CATALOG,
  SERVICE_PACK_CATEGORIES,
} from "@/lib/saas";

const AVAILABILITY_LABEL: Record<ServicePackAvailability, string> = {
  available: SAAS_PACKS_HUB.badgeAvailable,
  beta: SAAS_PACKS_HUB.badgeBeta,
  coming_soon: SAAS_PACKS_HUB.badgeSoon,
};

const AVAILABILITY_CLASS: Record<ServicePackAvailability, string> = {
  available: "bg-success/10 text-success-foreground",
  beta: "bg-primary/10 text-primary",
  coming_soon: "bg-muted text-muted-foreground",
};

type Props = {
  showCategoryFilter?: boolean;
  compact?: boolean;
};

export function ServicePackCatalog({ showCategoryFilter = true, compact = false }: Props) {
  const [category, setCategory] = useState<ServicePackCategory | "all">("all");

  const packs = useMemo(() => {
    if (category === "all") return SERVICE_PACK_CATALOG;
    return SERVICE_PACK_CATALOG.filter((p) => p.category === category);
  }, [category]);

  return (
    <div className="space-y-6">
      {!compact ? (
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{SAAS_PACKS_HUB.title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{SAAS_PACKS_HUB.subtitle}</p>
        </div>
      ) : null}

      {showCategoryFilter ? (
        <div className="flex flex-wrap gap-2">
          <FilterChip active={category === "all"} label="Todos" onClick={() => setCategory("all")} />
          {SERVICE_PACK_CATEGORIES.map((c) => (
            <FilterChip
              active={category === c.id}
              key={c.id}
              label={c.label}
              onClick={() => setCategory(c.id)}
            />
          ))}
        </div>
      ) : null}

      {packs.length === 0 ? (
        <PanelCard>
          <p className="text-sm text-muted-foreground">{SAAS_PACKS_HUB.emptyFilter}</p>
        </PanelCard>
      ) : (
        <div className={`grid gap-4 ${compact ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3"}`}>
          {packs.map((pack) => (
            <PanelCard accent={pack.accent} className="flex h-full flex-col" key={pack.id}>
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  {SERVICE_PACK_CATEGORIES.find((c) => c.id === pack.category)?.label ?? pack.category}
                </p>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${AVAILABILITY_CLASS[pack.availability]}`}
                >
                  {AVAILABILITY_LABEL[pack.availability]}
                </span>
              </div>
              <p className="mt-2 text-lg font-semibold">{pack.name}</p>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">{pack.tagline}</p>
              <p className="mt-3 text-xs text-muted-foreground">~{pack.estimatedMinutes} min · brief corto</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild size="sm" variant={pack.availability === "coming_soon" ? "outline" : "default"}>
                  <Link href={`/packs/${pack.slug}`}>
                    {pack.availability === "coming_soon"
                      ? "Ver detalle"
                      : SAAS_PACKS_HUB.ctaLaunch.replace("pack", "detalle")}
                  </Link>
                </Button>
                {pack.reportPath && pack.availability !== "coming_soon" ? (
                  <Button asChild size="sm" variant="ghost">
                    <Link href={pack.reportPath}>{SAAS_PACKS_HUB.ctaViewResults}</Link>
                  </Button>
                ) : null}
              </div>
            </PanelCard>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border text-muted-foreground hover:border-primary/40"
      }`}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}
