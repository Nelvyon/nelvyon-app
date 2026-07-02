"use client";

import Link from "next/link";
import { notFound } from "next/navigation";
import { use } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { PackKickoffBanner } from "@/features/packs/PackKickoffBanner";
import { PackQuickLaunch } from "@/features/packs/PackQuickLaunch";
import { useKickoffGrowthPack } from "@/features/packs/hooks";
import { getPackMetaBySlug } from "@/lib/packs/resolvePackSlug";

export default function OsPackKickoffPage({
  params,
}: {
  params: Promise<{ packSlug: string }>;
}) {
  const { packSlug } = use(params);
  const meta = getPackMetaBySlug(packSlug);
  if (!meta) notFound();

  const mutation = useKickoffGrowthPack(meta.id);

  return (
    <ProtectedLayout module="os">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className={`rounded-xl border border-border bg-gradient-to-br ${meta.accent} p-6`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Pack autónomo</p>
          <p className="mt-1 text-2xl font-bold tracking-tight">{meta.name}</p>
          <p className="mt-2 text-sm text-muted-foreground">{meta.tagline}</p>
          <Button asChild className="mt-4" size="sm" variant="outline">
            <Link href={meta.reportPath}>Ver informe →</Link>
          </Button>
        </div>

        <PackKickoffBanner />

        <PackQuickLaunch
          meta={meta}
          onKickoff={(body) => mutation.mutateAsync(body)}
          packId={meta.id}
        />
      </div>
    </ProtectedLayout>
  );
}
