"use client";

import React, { useState } from "react";
import Link from "next/link";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { GrowthPackKickoffForm, PackRunProgress } from "@/features/packs/GrowthPackComponents";
import { useKickoffGrowthPack } from "@/features/packs/hooks";
import { getPackMeta } from "@/lib/packs/packRegistry";
import { ECOMMERCE_GROWTH_PACK_ID } from "@/lib/packs/types";

const meta = getPackMeta(ECOMMERCE_GROWTH_PACK_ID)!;
const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function OsEcommerceGrowthPackPage() {
  const [runId, setRunId] = useState<string | null>(null);
  const mutation = useKickoffGrowthPack(ECOMMERCE_GROWTH_PACK_ID);
  const [extra, setExtra] = useState({
    product_category: "",
    avg_order_value: "",
    primary_channel: "meta" as "meta" | "google" | "organic",
  });

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
          defaultValues={{
            primary_cta: "Comprar ahora",
            sector: "ecommerce",
          }}
          extraFields={
            <>
              <label className="block space-y-1 sm:col-span-2">
                <span className="text-sm font-medium">Categoría de producto</span>
                <input
                  className={inputClass}
                  onChange={(e) => setExtra({ ...extra, product_category: e.target.value })}
                  required
                  value={extra.product_category}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium">AOV medio (EUR)</span>
                <input
                  className={inputClass}
                  onChange={(e) => setExtra({ ...extra, avg_order_value: e.target.value })}
                  placeholder="ej. 85"
                  value={extra.avg_order_value}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium">Canal principal</span>
                <select
                  className={inputClass}
                  onChange={(e) =>
                    setExtra({
                      ...extra,
                      primary_channel: e.target.value as "meta" | "google" | "organic",
                    })
                  }
                  value={extra.primary_channel}
                >
                  <option value="meta">Meta Ads</option>
                  <option value="google">Google Shopping</option>
                  <option value="organic">Orgánico / SEO</option>
                </select>
              </label>
            </>
          }
          meta={meta}
          onKickoff={(body) =>
            mutation.mutateAsync({
              ...body,
              product_category: extra.product_category,
              avg_order_value: extra.avg_order_value || undefined,
              primary_channel: extra.primary_channel,
            })
          }
          onSuccess={setRunId}
        />

        {runId ? <PackRunProgress packId={ECOMMERCE_GROWTH_PACK_ID} runId={runId} /> : null}
      </div>
    </ProtectedLayout>
  );
}
