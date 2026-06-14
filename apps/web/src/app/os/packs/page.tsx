"use client";

import Link from "next/link";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { PanelCard } from "@/core/ui/PanelCard";
import { ALL_PACKS } from "@/lib/packs/packRegistry";

export default function OsPacksHubPage() {
  return (
    <ProtectedLayout module="os">
      <div className="space-y-6">
        <p className="text-sm text-muted-foreground">
          Cierra al cliente, rellena el brief y lanza el pack. Nelvyon provisiona SaaS, OS, SKUs autónomos
          e informe en portal en un solo flujo.
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {ALL_PACKS.map((pack) => (
            <Link href={pack.kickoffPath} key={pack.id}>
              <PanelCard accent={pack.accent} className="h-full transition-shadow hover:shadow-md">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Growth Pack</p>
                <p className="mt-2 text-lg font-semibold">{pack.name}</p>
                <p className="mt-2 text-sm text-muted-foreground">{pack.tagline}</p>
                <p className="mt-4 text-sm font-medium text-link">Lanzar pack →</p>
              </PanelCard>
            </Link>
          ))}
        </div>
      </div>
    </ProtectedLayout>
  );
}
