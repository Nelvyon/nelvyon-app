"use client";

import Link from "next/link";

import type { PortalDeliverable } from "@/features/client_portal_v1/types";
import { portalDeliverableTypeLabel } from "@/features/client_portal_v1/constants";

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

export function PortalDeliverablePreview({ deliverable }: { deliverable: PortalDeliverable }) {
  const typeLabel = portalDeliverableTypeLabel(deliverable.type);
  const fileUrl = deliverable.file_url?.trim() ?? "";

  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-card">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
          {typeLabel}
        </span>
        <span className="text-xs text-muted-foreground">Versión {deliverable.version}</span>
      </div>

      {deliverable.description ? (
        <div className="space-y-1">
          <h3 className="text-sm font-semibold text-foreground">Resumen del entregable</h3>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {deliverable.description}
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Tu equipo ha publicado este entregable para revisión. Descarga el archivo adjunto o abre el enlace de
          vista previa cuando esté disponible.
        </p>
      )}

      {deliverable.pack_summary ? (
        <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
          <h3 className="text-sm font-semibold text-foreground">Resultados del Growth Pack</h3>
          {deliverable.pack_summary.summary ? (
            <p className="text-sm text-muted-foreground">{deliverable.pack_summary.summary}</p>
          ) : null}
          {deliverable.pack_summary.kpis ? (
            <dl className="grid gap-2 text-sm sm:grid-cols-3">
              {deliverable.pack_summary.kpis.avg_qa_score != null ? (
                <div>
                  <dt className="text-muted-foreground">Calidad QA</dt>
                  <dd className="font-semibold">{deliverable.pack_summary.kpis.avg_qa_score}%</dd>
                </div>
              ) : null}
              {deliverable.pack_summary.kpis.skus_passed != null ? (
                <div>
                  <dt className="text-muted-foreground">Servicios OK</dt>
                  <dd className="font-semibold">
                    {deliverable.pack_summary.kpis.skus_passed}/{deliverable.pack_summary.kpis.skus_total}
                  </dd>
                </div>
              ) : null}
              {deliverable.pack_summary.kpis.deliverables_published != null ? (
                <div>
                  <dt className="text-muted-foreground">Entregables</dt>
                  <dd className="font-semibold">{deliverable.pack_summary.kpis.deliverables_published}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
          {deliverable.pack_summary.next_steps && deliverable.pack_summary.next_steps.length > 0 ? (
            <div>
              <p className="text-xs font-medium uppercase text-muted-foreground">Próximos pasos</p>
              <ul className="mt-1 list-inside list-disc text-sm text-muted-foreground">
                {deliverable.pack_summary.next_steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {fileUrl && isHttpUrl(fileUrl) ? (
        <div className="rounded-lg border border-border bg-muted/20 p-4">
          <p className="text-sm font-medium text-foreground">Vista previa / enlace de entrega</p>
          <p className="mt-1 break-all text-sm text-muted-foreground">{fileUrl}</p>
          <Link
            className="mt-3 inline-flex text-sm font-medium text-link underline"
            href={fileUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            Abrir entregable en nueva pestaña
          </Link>
        </div>
      ) : null}

      {fileUrl && !isHttpUrl(fileUrl) ? (
        <div className="rounded-lg border border-dashed border-border bg-muted/10 p-4 text-sm text-muted-foreground">
          Archivo adjunto disponible para descarga. Usa el botón de descarga para obtener la versión publicada.
        </div>
      ) : null}
    </section>
  );
}
