"use client";

import React from "react";
import Link from "next/link";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { PanelCard } from "@/core/ui/PanelCard";
import { SkeletonListRows } from "@/core/ui/Skeleton";
import { usePackReportLatest } from "@/features/packs/hooks";
import { PackEliteSnapshots } from "@/features/packs/PackEliteSnapshots";
import { getPackMeta } from "@/lib/packs/packRegistry";
import type { PackId } from "@/lib/packs/types";

export function PackReportDashboard({ packId }: { packId: PackId }) {
  const meta = getPackMeta(packId)!;
  const query = usePackReportLatest(packId);

  const latest = query.data?.latest;
  const report = latest?.report;

  return (
    <ProtectedLayout module="os">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button asChild variant="outline">
            <Link href={meta.kickoffPath}>Lanzar nuevo pack</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/os/packs">Todos los packs</Link>
          </Button>
        </div>

        {query.isLoading ? <SkeletonListRows rows={4} /> : null}

        {!query.isLoading && !latest ? (
          <PanelCard>
            <p className="font-medium text-foreground">Aún no hay packs ejecutados</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Lanza {meta.name} desde Nelvyon OS para ver métricas aquí.
            </p>
            <Button asChild className="mt-4">
              <Link href={meta.kickoffPath}>Lanzar pack</Link>
            </Button>
          </PanelCard>
        ) : null}

        {latest && report ? (
          <>
            <PanelCard accent={meta.accent}>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {report.pack_name}
              </p>
              <h2 className="mt-1 text-2xl font-semibold">{report.business_name}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{report.summary}</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-4">
                <Metric label="QA medio" value={`${report.kpis.avg_qa_score}%`} />
                <Metric label="Servicios OK" value={`${report.kpis.skus_passed}/${report.kpis.skus_total}`} />
                <Metric label="Entregables" value={String(report.kpis.deliverables_published)} />
                <Metric label="Campañas extra" value={String(report.kpis.extra_campaigns ?? 0)} />
              </div>
            </PanelCard>

            <PackEliteSnapshots packId={packId} />

            <PanelCard>
              <h3 className="text-base font-semibold">Acciones post-entrega</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Enlaces directos para cerrar la entrega al cliente sin salir del panel.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {report.kpis.saas_client_id ? (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/crm/clients/${report.kpis.saas_client_id}`}>
                      Ficha cliente Revenue
                    </Link>
                  </Button>
                ) : null}
                {report.kpis.saas_campaign_id ? (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/campaigns/${report.kpis.saas_campaign_id}`}>
                      Revisar campaña email
                    </Link>
                  </Button>
                ) : null}
                <Button asChild size="sm" variant="outline">
                  <Link href="/portal">Vista portal (preview)</Link>
                </Button>
                {latest.os_project_id ? (
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/os/proyectos/${latest.os_project_id}`}>Proyecto OS</Link>
                  </Button>
                ) : null}
              </div>
            </PanelCard>

            <PanelCard>
              <h3 className="text-base font-semibold">Servicios autónomos</h3>
              <ul className="mt-3 divide-y divide-border">
                {report.sku_results.map((sku) => (
                  <li className="flex items-center justify-between py-3 text-sm" key={sku.sku}>
                    <span>{skuLabel(sku.sku)}</span>
                    <span className={sku.passed ? "text-success-foreground" : "text-destructive"}>
                      QA {sku.qa_score} {sku.passed ? "✓" : "✗"}
                    </span>
                  </li>
                ))}
              </ul>
            </PanelCard>

            <PanelCard>
              <h3 className="text-base font-semibold">Próximos pasos</h3>
              <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
                {report.next_steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </PanelCard>
          </>
        ) : null}

        {latest && !report ? (
          <PanelCard>
            <p className="text-sm text-muted-foreground">
              Pack en estado <strong>{latest.status}</strong>
              {latest.error_message ? ` — ${latest.error_message}` : ""}
            </p>
          </PanelCard>
        ) : null}
      </div>
    </ProtectedLayout>
  );
}

function skuLabel(sku: string): string {
  const map: Record<string, string> = {
    "NELVYON-LANDING": "Landing / Web",
    "NELVYON-SEO": "Auditoría SEO",
    "NELVYON-CHATBOT": "Chatbot",
  };
  return map[sku] ?? sku.replace("NELVYON-", "");
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/80 bg-background/60 px-4 py-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}
