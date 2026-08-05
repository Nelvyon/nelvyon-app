"use client";

/**
 * /saas/playbooks sobre la pantalla oficial `(cms)/content` de W3CRM.
 *
 * Un playbook no es una fila de tabla: tiene resumen, pasos que se cargan al
 * desplegarlo y acciones propias. La pieza de la plantilla que expresa
 * exactamente eso es su caja plegable, la misma que `(cms)/content` usa para
 * el filtro y para el listado: `filter cm-content-box box-primary` >
 * `content-title` (`cpa` con icono y titulo + `tools` con el `SlideToolHeader`
 * que alterna `collapse`/`expand`) > `<Collapse>` > `cm-content-body form
 * excerpt` > `card-body`. Aqui se usa una caja por playbook, que es para lo
 * que la plantilla la diseño; no se inventa ningun componente.
 *
 * Los pasos van en la tabla de la plantilla,
 * `table table-responsive-lg table-striped table-condensed flip-content`
 * dentro de `table-responsive` > `#content_wrapper.dataTables_wrapper.no-footer`.
 *
 * Logica de NELVYON intacta: `GET /api/saas/data-playbooks`,
 * `GET /api/saas/data-playbooks/[id]` (carga perezosa de pasos al desplegar),
 * `POST /api/saas/data-playbooks/refresh`, `PATCH` de
 * activate/dismiss/complete y `PATCH` de paso completado; los tipos
 * `DataPlaybook`, `DataPlaybookStep`, `PlaybooksSummary`, `PlaybookCategory` y
 * `PlaybookStepType`; `stepCta` con sus destinos reales; el filtrado de
 * descartados y el aviso temporal de 3 s.
 *
 * Guardas: categoria o tipo de paso fuera de catalogo -> badge e icono
 * neutros en vez de `undefined`; `playbooks`/`steps` no-array -> lista vacia;
 * contadores del resumen normalizados con `num()`.
 */
import { useEffect, useState } from "react";
import Link from "next/link";
import Collapse from "react-bootstrap/Collapse";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmEmptyState, W3crmKpiTile } from "@/features/saas-w3crm/components/W3crmUi";
import type {
  DataPlaybook,
  DataPlaybookStep,
  PlaybooksSummary,
  PlaybookCategory,
  PlaybookStepType,
} from "@nelvyon/saas";

/** Categoria -> badge de W3CRM. */
const CATEGORY_BADGE: Record<PlaybookCategory, string> = {
  growth: "badge-primary",
  retention: "badge-success",
  ads: "badge-warning",
  email: "badge-primary",
  seo: "badge-secondary",
  compliance: "badge-danger",
};

const STEP_ICON: Record<PlaybookStepType, string> = {
  insight: "💡",
  action: "✅",
  email_draft: "✉️",
  launch_pack: "🚀",
  enable_autopilot: "🤖",
  review_metric: "📊",
};

/** Catalogos que pueden crecer en el backend sin romper la pantalla. */
function badgeCategoria(c: PlaybookCategory | string) {
  return CATEGORY_BADGE[c as PlaybookCategory] ?? "badge-secondary";
}
function iconoPaso(t: PlaybookStepType | string) {
  return STEP_ICON[t as PlaybookStepType] ?? "•";
}
function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function stepCta(step: DataPlaybookStep, packId: string | null): { label: string; href: string } | null {
  const href = (step.metadata as { href?: string } | null)?.href;
  switch (step.stepType) {
    case "launch_pack": {
      const pid = (step.metadata as { packId?: string } | null)?.packId ?? packId;
      return { label: "Lanzar pack", href: `/saas/brief-to-launch${pid ? `?packId=${pid}` : ""}` };
    }
    case "enable_autopilot":
      return { label: "Ir a Autopilot", href: href ?? "/saas/autopilot" };
    case "review_metric":
      return { label: "Revisar", href: href ?? "/saas/benchmark" };
    default:
      return href ? { label: "Abrir", href } : null;
  }
}

// ── Una caja plegable de la plantilla por playbook ────────────────────────────
function PlaybookBox({
  pb,
  onActivate,
  onDismiss,
  onComplete,
  onCompleteStep,
}: {
  pb: DataPlaybook;
  onActivate: (id: string) => void;
  onDismiss: (id: string) => void;
  onComplete: (id: string) => void;
  onCompleteStep: (playbookId: string, stepId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [steps, setSteps] = useState<DataPlaybookStep[]>(Array.isArray(pb.steps) ? pb.steps : []);
  const [loadingSteps, setLoadingSteps] = useState(false);

  async function toggle() {
    const next = !expanded;
    setExpanded(next);
    if (next && steps.length === 0) {
      setLoadingSteps(true);
      try {
        const res = await fetch(`/api/saas/data-playbooks/${pb.id}`);
        if (res.ok) {
          const d = (await res.json().catch(() => ({}))) as { playbook?: DataPlaybook };
          setSteps(Array.isArray(d.playbook?.steps) ? d.playbook.steps : []);
        }
      } finally {
        setLoadingSteps(false);
      }
    }
  }

  return (
    <div className="filter cm-content-box box-primary" data-testid="playbook">
      <div className="content-title">
        <div className="cpa">
          <i className="fa-solid fa-file-lines me-2" />
          {pb.title}
          <span className={`badge ${badgeCategoria(pb.category)} ms-2`}>{pb.category}</span>
          {pb.status === "active" && <span className="badge badge-success ms-1">Activo</span>}
          {pb.status === "completed" && <span className="badge badge-secondary ms-1">Completado</span>}
          <span className="text-muted fs-12 ms-2">P{num(pb.priority)}</span>
        </div>
        <div className="tools">
          {/*
            Las acciones van en el `tools` de la cabecera, la ranura que la
            plantilla reserva para los controles de la caja. Dentro del
            `<Collapse>` quedaban ocultas hasta desplegar el playbook: se podia
            perder de vista que un playbook sugerido se puede activar o
            descartar sin necesidad de leer sus pasos.
          */}
          {pb.status !== "completed" && pb.status !== "dismissed" && (
            <>
              {pb.status === "suggested" && (
                <button type="button" className="btn btn-primary btn-sm me-2" onClick={() => onActivate(pb.id)}>
                  Activar
                </button>
              )}
              <button type="button" className="btn btn-primary light btn-sm me-2" onClick={() => onComplete(pb.id)}>
                Marcar completado
              </button>
              <button type="button" className="btn btn-danger light btn-sm me-2" onClick={() => onDismiss(pb.id)}>
                Descartar
              </button>
            </>
          )}
          <Link
            href="#"
            scroll={false}
            className={`SlideToolHeader ${expanded ? "collapse" : "expand"}`}
            role="button"
            aria-expanded={expanded}
            aria-label={`${expanded ? "Ocultar" : "Ver"} pasos de ${pb.title}`}
            onClick={(e) => { e.preventDefault(); void toggle(); }}
          >
            <i className="fas fa-angle-up" />
          </Link>
        </div>
      </div>
      <Collapse in={expanded}>
        <div className="cm-content-body form excerpt">
          <div className="card-body">
            {pb.triggerReason && (
              <p className="fs-12 text-warning mb-2">⚡ {pb.triggerReason}</p>
            )}
            {pb.renderedSummary && (
              <p className="fs-14 text-muted">{pb.renderedSummary}</p>
            )}

            <div className="table-responsive">
              <div id="content_wrapper" className="dataTables_wrapper no-footer">
                {loadingSteps ? (
                  <div className="d-flex align-items-center py-3" role="status">
                    <div className="spinner-border spinner-border-sm text-primary me-2" aria-hidden="true" />
                    <span className="text-muted fs-14">Cargando pasos…</span>
                  </div>
                ) : steps.length === 0 ? (
                  <W3crmEmptyState title="Sin pasos" description="Este playbook todavía no tiene pasos." />
                ) : (
                  <table className="table table-responsive-lg table-striped table-condensed flip-content">
                    <thead>
                      <tr>
                        <th className="text-black">Paso</th>
                        <th className="text-black">Detalle</th>
                        <th className="text-black text-end">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {steps.map((s) => {
                        const cta = stepCta(s, pb.packId);
                        return (
                          <tr key={s.id}>
                            <td>
                              <span className={s.completed ? "text-muted text-decoration-line-through" : "fw-bold"}>
                                {iconoPaso(s.stepType)} {s.title}
                              </span>
                            </td>
                            <td><span className="fs-12 text-muted">{s.body}</span></td>
                            <td className="text-end">
                              {cta && (
                                <Link href={cta.href} className="btn btn-primary light btn-sm me-1">
                                  {cta.label}
                                </Link>
                              )}
                              {!s.completed && (
                                <button
                                  type="button"
                                  className="btn btn-primary btn-sm content-icon"
                                  aria-label={`Marcar completado: ${s.title}`}
                                  onClick={() => onCompleteStep(pb.id, s.id)}
                                >
                                  <i className="fa-solid fa-check" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

          </div>
        </div>
      </Collapse>
    </div>
  );
}

export default function PlaybooksPage() {
  const [summary, setSummary] = useState<PlaybooksSummary | null>(null);
  const [playbooks, setPlaybooks] = useState<DataPlaybook[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/saas/data-playbooks");
      if (res.ok) {
        const d = (await res.json().catch(() => ({}))) as { summary?: PlaybooksSummary; playbooks?: DataPlaybook[] };
        setSummary(d.summary ?? null);
        setPlaybooks(Array.isArray(d.playbooks) ? d.playbooks.filter((p) => p.status !== "dismissed") : []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/saas/data-playbooks/refresh", { method: "POST" });
      if (res.ok) {
        const d = (await res.json().catch(() => ({}))) as { generated?: number };
        showToast(`${num(d.generated)} playbook(s) generados`);
        void load();
      }
    } finally {
      setRefreshing(false);
    }
  }

  async function patchPlaybook(id: string, action: "activate" | "dismiss" | "complete") {
    try {
      const res = await fetch(`/api/saas/data-playbooks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      showToast(action === "dismiss" ? "Playbook descartado" : action === "complete" ? "Playbook completado" : "Playbook activado");
      void load();
    } catch {
      showToast("Error al actualizar playbook");
    }
  }

  async function completeStep(playbookId: string, stepId: string) {
    try {
      const res = await fetch(`/api/saas/data-playbooks/${playbookId}/steps/${stepId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      showToast("Paso completado");
    } catch {
      showToast("Error al completar paso");
    }
  }

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Playbooks" parentTitle="IA & Automatización" pageTitle="Playbooks" />
      <div className="container-fluid">
        <div className="row">
          {toast && (
            <div className="col-xl-12">
              <div className="alert alert-primary alert-dismissible fade show" role="status">
                {toast}
                <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => setToast(null)} />
              </div>
            </div>
          )}

          <div className="col-xl-4 col-sm-6">
            <W3crmKpiTile label="Sugeridos" value={num(summary?.suggested)} accent />
          </div>
          <div className="col-xl-4 col-sm-6">
            <W3crmKpiTile label="Activos" value={num(summary?.active)} />
          </div>
          <div className="col-xl-4 col-sm-6">
            <W3crmKpiTile label="Completados" value={num(summary?.completed)} />
          </div>

          <div className="col-xl-12">
            <div className="mb-3">
              <ul className="d-flex align-items-center flex-wrap">
                <li>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={refreshing || loading}
                    onClick={() => { void handleRefresh(); }}
                  >
                    {refreshing ? "Generando…" : "↻ Actualizar"}
                  </button>
                </li>
              </ul>
            </div>

            {loading ? (
              <div className="d-flex align-items-center justify-content-center py-5" role="status">
                <div className="spinner-border text-primary me-3" aria-hidden="true" />
                <span className="text-muted">Cargando playbooks…</span>
              </div>
            ) : playbooks.length === 0 ? (
              <div className="filter cm-content-box box-primary">
                <div className="cm-content-body form excerpt">
                  <div className="card-body">
                    <W3crmEmptyState
                      title="Aún no hay playbooks personalizados"
                      description="Lanza un pack o envía campañas de email para que generemos playbooks con tus datos. Después pulsa ↻ Actualizar."
                    />
                  </div>
                </div>
              </div>
            ) : (
              playbooks.map((pb) => (
                <PlaybookBox
                  key={pb.id}
                  pb={pb}
                  onActivate={(id) => void patchPlaybook(id, "activate")}
                  onDismiss={(id) => void patchPlaybook(id, "dismiss")}
                  onComplete={(id) => void patchPlaybook(id, "complete")}
                  onCompleteStep={(pid, sid) => void completeStep(pid, sid)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </SaasW3crmShell>
  );
}
