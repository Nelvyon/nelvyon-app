"use client";

/**
 * Tarjeta de la plantilla premium, con el marcado de tarjeta de W3CRM
 * (`card` > `row` > `col` con imagen a sangre y `card-body`).
 *
 * Estaba en la capa visual antigua de NELVYON (`NelvyonDsCard`,
 * `NelvyonDsButton`, tokens Tailwind oscuros). Sus DOS únicos consumidores
 * —/saas/web-builder y /saas/setup— ya están en W3CRM, así que mantenerla en la
 * capa antigua dejaba una isla oscura dentro del shell claro. Se porta.
 *
 * La API pública (`FeaturedTemplateMeta`, props `template` y `onImported`) y la
 * lógica —`POST /api/saas/web-builder` con `action: "import-template"` y el
 * salto al editor de la página importada— quedan exactamente igual.
 */
import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";

export type FeaturedTemplateMeta = {
  id: string;
  name: string;
  headline: string;
  description: string;
  preview_url: string;
  envato_id: string;
};

export function FeaturedEnvatoTemplateCard({
  template,
  onImported,
}: {
  template: FeaturedTemplateMeta;
  onImported?: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function importTemplate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/web-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import-template", template_id: template.id }),
      });
      const d = (await res.json()) as { page?: { id: string }; error?: string };
      if (!res.ok) throw new Error(d.error ?? "Error al importar");
      onImported?.();
      if (d.page?.id) router.push(`/saas/web-builder/${d.page.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  const nombre = typeof template.name === "string" ? template.name : "";

  return (
    <div className="card mb-3 overflow-hidden">
      <div className="row g-0">
        <div className="col-md-5">
          <div className="position-relative h-100" style={{ minHeight: 200 }}>
            {template.preview_url ? (
              <Image
                src={template.preview_url}
                alt={nombre}
                fill
                className="object-fit-cover"
                style={{ objectPosition: "top" }}
                unoptimized
              />
            ) : null}
            <span className="badge badge-primary position-absolute" style={{ left: 12, top: 12 }}>
              Plantilla premium
            </span>
          </div>
        </div>
        <div className="col-md-7">
          <div className="card-body">
            <p className="fs-12 text-primary text-uppercase fw-bold mb-1">Plantilla premium oficial</p>
            <h4 className="card-title mb-2">{nombre || "—"}</h4>
            <p className="text-muted fs-14 mb-1">
              {typeof template.description === "string" ? template.description : ""}
            </p>
            <p className="text-muted fs-12 mb-2">
              {typeof template.headline === "string" ? template.headline : ""}
            </p>
            {error ? <div className="alert alert-danger py-2 fs-12" role="alert">{error}</div> : null}
            <button type="button" className="btn btn-primary btn-sm" disabled={loading}
              onClick={() => void importTemplate()}>
              {loading ? "Importando…" : "Importar en 1 clic →"}
            </button>
            <p className="text-muted fs-12 mt-3 mb-0">
              Licencia comercial incluida · Adaptación oficial Nelvyon · Lista para publicar
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
