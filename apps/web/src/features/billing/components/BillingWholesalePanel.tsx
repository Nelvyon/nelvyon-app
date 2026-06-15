"use client";

import Link from "next/link";

import { Button } from "@/core/ui/button";
import { SubsectionTitle } from "@/core/ui/typography";
import { isAgencyPartnerPlan } from "@/lib/partners/wholesaleCatalog";
import { partnersApi } from "@/features/partners/api";
import { useEffect, useState } from "react";

type WholesalePanelProps = {
  planId?: string | null;
};

export function BillingWholesalePanel({ planId }: WholesalePanelProps) {
  const [catalog, setCatalog] = useState<Awaited<ReturnType<typeof partnersApi.wholesale>> | null>(null);

  useEffect(() => {
    if (!isAgencyPartnerPlan(planId)) return;
    partnersApi
      .wholesale()
      .then(setCatalog)
      .catch(() => setCatalog(null));
  }, [planId]);

  if (!isAgencyPartnerPlan(planId)) return null;
  if (!catalog) return null;

  return (
    <section className="rounded-lg border border-border bg-card p-4 shadow-card">
      <SubsectionTitle className="text-lg font-semibold">Wholesale Agency Partner</SubsectionTitle>
      <p className="mt-1 text-sm text-muted-foreground">
        Tu suscripción partner: €{catalog.subscription.wholesaleEur}/mes · {catalog.subscription.includedClientSlots}{" "}
        clientes incluidos · packs con margen fijo por catálogo.
      </p>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        {catalog.growth_packs.map((p) => (
          <div className="rounded-md border bg-muted/20 p-3" key={p.id}>
            <dt className="font-medium">{p.label}</dt>
            <dd className="mt-1 text-muted-foreground">
              COGS €{p.wholesaleEur} · margen sugerido €{p.margin_eur}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-4">
        <Button asChild size="sm" variant="outline">
          <Link href="/dashboard/partners">Abrir Partner HQ</Link>
        </Button>
      </div>
    </section>
  );
}
