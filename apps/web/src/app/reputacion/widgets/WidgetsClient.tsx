"use client";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { PanelCard } from "@/core/ui/PanelCard";
import { ReputacionSubNav } from "@/features/reputacion/components/ReputacionSubNav";
import { useReputacionEmbed } from "@/features/reputacion/hooks";

export function WidgetsClient() {
  const query = useReputacionEmbed();
  const data = query.data;

  const snippet = `<!-- NELVYON Reviews Widget -->
${data?.embed_html ?? ""}
<script async src="${data?.script_url ?? ""}"></script>`;

  return (
    <ProtectedLayout module="reputacion">
      <div className="space-y-6">
        <ReputacionSubNav />

        <PanelCard>
          <h2 className="text-base font-semibold">Widget para tu web</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Incrusta reseñas verificadas y nota media en landings y tiendas online.
          </p>
          <pre className="mt-4 overflow-x-auto rounded-lg border bg-muted/40 p-4 text-xs">{snippet}</pre>
        </PanelCard>
      </div>
    </ProtectedLayout>
  );
}
