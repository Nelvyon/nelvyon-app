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
