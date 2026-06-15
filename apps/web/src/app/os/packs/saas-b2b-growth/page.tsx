"use client";

import React, { useState } from "react";
import Link from "next/link";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { GrowthPackKickoffForm, PackRunProgress } from "@/features/packs/GrowthPackComponents";
import { useKickoffGrowthPack } from "@/features/packs/hooks";
import { getPackMeta } from "@/lib/packs/packRegistry";
import { SAAS_B2B_GROWTH_PACK_ID } from "@/lib/packs/types";

const meta = getPackMeta(SAAS_B2B_GROWTH_PACK_ID)!;
const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export default function OsSaasB2bGrowthPackPage() {
  const [runId, setRunId] = useState<string | null>(null);
  const mutation = useKickoffGrowthPack(SAAS_B2B_GROWTH_PACK_ID);
  const [extra, setExtra] = useState({
    icp_title: "",
    pricing_model: "subscription" as "subscription" | "usage" | "hybrid",
    sales_motion: "hybrid" as "plg" | "sales_led" | "hybrid",
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
            primary_cta: "Solicitar demo",
            sector: "saas_b2b",
          }}
          extraFields={
            <>
              <label className="block space-y-1 sm:col-span-2">
                <span className="text-sm font-medium">ICP — cargo del decisor</span>
                <input
                  className={inputClass}
                  onChange={(e) => setExtra({ ...extra, icp_title: e.target.value })}
                  placeholder="ej. VP Marketing en SaaS 50-200 empleados"
                  required
                  value={extra.icp_title}
                />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium">Modelo de pricing</span>
                <select
                  className={inputClass}
                  onChange={(e) =>
                    setExtra({
                      ...extra,
                      pricing_model: e.target.value as "subscription" | "usage" | "hybrid",
                    })
                  }
                  value={extra.pricing_model}
                >
                  <option value="subscription">Suscripción</option>
                  <option value="usage">Por uso</option>
                  <option value="hybrid">Híbrido</option>
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium">Modelo de ventas</span>
                <select
                  className={inputClass}
                  onChange={(e) =>
                    setExtra({
                      ...extra,
                      sales_motion: e.target.value as "plg" | "sales_led" | "hybrid",
                    })
                  }
                  value={extra.sales_motion}
                >
                  <option value="plg">Product-led (PLG)</option>
                  <option value="sales_led">Sales-led</option>
                  <option value="hybrid">Híbrido</option>
                </select>
              </label>
            </>
          }
          meta={meta}
          onKickoff={(body) =>
            mutation.mutateAsync({
              ...body,
              icp_title: extra.icp_title,
              pricing_model: extra.pricing_model,
              sales_motion: extra.sales_motion,
            })
          }
          onSuccess={setRunId}
        />

        {runId ? <PackRunProgress packId={SAAS_B2B_GROWTH_PACK_ID} runId={runId} /> : null}
      </div>
    </ProtectedLayout>
  );
}
