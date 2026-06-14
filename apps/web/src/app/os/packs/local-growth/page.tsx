"use client";

import React, { useState } from "react";
import Link from "next/link";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { GrowthPackKickoffForm, PackRunProgress } from "@/features/packs/GrowthPackComponents";
import { useKickoffGrowthPack } from "@/features/packs/hooks";
import { getPackMeta } from "@/lib/packs/packRegistry";
import { LOCAL_GROWTH_PACK_ID } from "@/lib/packs/types";

const meta = getPackMeta(LOCAL_GROWTH_PACK_ID)!;

export default function OsLocalGrowthPackPage() {
  const [runId, setRunId] = useState<string | null>(null);
  const mutation = useKickoffGrowthPack(LOCAL_GROWTH_PACK_ID);

  return (
    <ProtectedLayout module="os">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className={`rounded-xl border border-border bg-gradient-to-br ${meta.accent} p-6`}>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Pack autónomo</p>
          <p className="mt-1 text-2xl font-bold tracking-tight">{meta.name}</p>
          <p className="mt-2 text-sm text-muted-foreground">{meta.tagline}</p>
          <Button asChild className="mt-4" size="sm" variant="outline">
            <Link href={meta.reportPath}>Ver informe en panel SaaS →</Link>
          </Button>
        </div>

        <GrowthPackKickoffForm
          defaultValues={{ primary_cta: "Reservar cita", sector: meta.sectors[0]?.id }}
          meta={meta}
          onKickoff={(body) => mutation.mutateAsync(body)}
          onSuccess={setRunId}
        />

        {runId ? <PackRunProgress packId={LOCAL_GROWTH_PACK_ID} runId={runId} /> : null}
      </div>
    </ProtectedLayout>
  );
}
