"use client";

/**
 * Panel de plantillas rapidas con el marcado de la caja plegable de W3CRM
 * `(cms)/email-template`: `filter cm-content-box box-primary` > `content-title`
 * (`cpa` + `tools` con el `SlideToolHeader` que alterna `collapse`/`expand`) >
 * `<Collapse>` > `cm-content-body form excerpt` > `card-body`.
 *
 * Logica sin cambios: los mismos grupos, `listEmailElitePresets`,
 * `buildSaasCampaniaFromPreset`, el POST a `/api/saas/campanias` y el callback
 * `onCreated`. Solo cambia la capa visual, que antes era del design system de
 * Tailwind y desentonaba dentro de la pantalla W3CRM.
 */
import { useState } from "react";
import Link from "next/link";
import Collapse from "react-bootstrap/Collapse";

import {
  listEmailElitePresets,
  buildSaasCampaniaFromPreset,
  type EmailElitePreset,
} from "@/lib/eliteTemplates/emailTemplates";

const GROUPS = [
  { id: "all", label: "Todas" },
  { id: "local", label: "Local" },
  { id: "ecommerce", label: "Ecommerce" },
  { id: "saas_b2b", label: "SaaS B2B" },
] as const;

export function CampaniaTemplateQuickLaunch({ onCreated }: { onCreated: () => void }) {
  const [group, setGroup] = useState<"all" | "local" | "ecommerce" | "saas_b2b">("all");
  const [importing, setImporting] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  const presets = group === "all" ? listEmailElitePresets() : listEmailElitePresets(group);

  async function importPreset(preset: EmailElitePreset) {
    setImporting(preset.id);
    try {
      const payload = buildSaasCampaniaFromPreset(preset);
      const res = await fetch("/api/saas/campanias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      if (res.ok) onCreated();
    } finally {
      setImporting(null);
    }
  }

  return (
    <div className="filter cm-content-box box-primary">
      <div className="content-title">
        <div className="cpa">
          <i className="far fa-envelope me-2" />
          Plantillas campaña Nelvyon ({presets.length})
        </div>
        <div className="tools">
          <Link
            href="#"
            scroll={false}
            className={`SlideToolHeader ${expanded ? "collapse" : "expand"}`}
            role="button"
            aria-expanded={expanded}
            aria-label="Plegar plantillas de campaña"
            onClick={(e) => { e.preventDefault(); setExpanded(!expanded); }}
          >
            <i className="fas fa-angle-up" />
          </Link>
        </div>
      </div>
      <Collapse in={expanded}>
        <div className="cm-content-body form excerpt">
          <div className="card-body">
            <div className="mb-3">
              {GROUPS.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  className={`btn btn-sm me-2 ${group === g.id ? "btn-primary" : "btn-primary light"}`}
                  onClick={() => setGroup(g.id)}
                >
                  {g.label}
                </button>
              ))}
            </div>
            {presets.length === 0 ? (
              <p className="mb-0 fs-14 text-muted">No hay plantillas para este grupo.</p>
            ) : (
              <div className="row">
                {presets.map((p) => (
                  <div className="col-xl-4 col-md-6 mb-3" key={p.id}>
                    <div className="card mb-0 h-100">
                      <div className="card-body">
                        <h6 className="mb-1">{p.label}</h6>
                        <p className="fs-12 text-muted mb-3">{p.tagline}</p>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          disabled={importing === p.id}
                          onClick={() => void importPreset(p)}
                        >
                          {importing === p.id ? "Importando…" : "Usar plantilla"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Collapse>
    </div>
  );
}
