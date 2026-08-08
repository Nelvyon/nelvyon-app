"use client";

/**
 * /saas/funnels sobre `(cms)/content` de W3CRM, con las piezas ya portadas.
 * Mapeo: listado, plantillas, pasos, editor, A/B y analytics ->
 * `W3crmContentBox`; listado y rendimiento -> `W3crmDataTable`; alta ->
 * `W3crmModal`; KPIs -> `W3crmKpiTile`. Sin componentes nuevos.
 *
 * CONTRATO — `saas-funnels-depth.spec.ts`:
 *   - `getByText("E2E Test Funnel")`: el nombre del funnel se pinta sin truncar.
 *   - `getByRole("button", { name: "Abrir builder" })` ÚNICO.
 *   - `getByRole("button", { name: "Analytics" })` ÚNICO: es la pestaña del
 *     builder. Por eso NINGUNA caja se titula "Analytics" — el toggle expone
 *     `aria-label="Plegar <título>"` y sería un segundo botón con ese nombre.
 *   - `getByText("Visitas totales")` ÚNICO. Ese texto existe en DOS sitios: el
 *     KPI del listado y el panel de rendimiento. Se conserva la exclusión mutua
 *     original —el builder hace `return` antes del listado—, así que nunca
 *     coexisten. Tampoco hay ninguna caja titulada así.
 *   - Los pasos se verifican por fila de tabla (`getByRole("row", …)`): el
 *     sidebar expone un enlace "Formularios" que contiene "Formulario" como
 *     subcadena, y el panel de rendimiento es ahora una tabla W3CRM real.
 *
 * SANEADO — mismo criterio que `f89c198c`: `null` es "sin dato" y se pinta
 * "—"; no se inventan ceros; ningún `.toLocaleString()` ni `.toFixed()` recae
 * sobre datos sin normalizar. Cubre `analytics.totalVisitors`,
 * `analytics.totalConversions`, `f.totalVisitors`, `f.totalConversions`,
 * `totalVisitors` y `overallCvr`, que eran el crash latente auditado.
 *
 * Lógica de NELVYON intacta: `GET/POST /api/saas/funnels`,
 * `GET/POST/DELETE /api/saas/funnels/{id}` con TODAS sus acciones (`step`,
 * `update_step` —también para reordenar—, `delete_step`, `add-variant`,
 * `update-variant-weight`, `publish`, `pause`), `?resource=variants&stepId=`,
 * `?resource=analytics`, `GET/POST /api/saas/funnels/templates` con su
 * `action: "import"`; el `credentials: "same-origin"` de cada llamada; la
 * apertura del builder por `?id=` y su sincronización con la URL; el copiado
 * de la URL pública `/f/{slug}`; los seis tipos de paso; y los avisos de 2 s.
 *
 * Único cambio de comportamiento: el `window.confirm()` del borrado pasa al
 * diálogo de sweetalert2 que ya usa el resto del SaaS migrado.
 */
import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Alert from "sweetalert2";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmEmptyState, W3crmKpiTile } from "@/features/saas-w3crm/components/W3crmUi";
import {
  W3crmCargando,
  W3crmContentBox,
  W3crmDataTable,
  W3crmModal,
} from "@/features/saas-w3crm/components/W3crmContentBox";

type FunnelStatus = "draft" | "active" | "paused" | "archived";
type StepType = "landing" | "form" | "video" | "checkout" | "upsell" | "thankyou";
type BuilderTab = "steps" | "analytics";

interface FunnelStep {
  id: string; type: StepType; name: string; content: string | null;
  ctaLabel: string | null; ctaUrl: string | null;
  stepOrder: number; visitors: number; conversions: number;
}
interface FunnelVariant {
  id: string; stepId: string; variantKey: "A" | "B";
  content: Record<string, unknown>; weightPct: number;
  visitors: number; conversions: number;
}
interface Funnel {
  id: string; name: string; description: string | null; status: FunnelStatus;
  steps: FunnelStep[]; publicSlug: string | null; publishedAt: string | null;
  totalVisitors: number; totalConversions: number; createdAt: string;
}
interface AnalyticsStep {
  id: string; name: string; type: string; stepOrder: number;
  visitors: number; conversions: number; cvr: number; dropOff: number;
  variants: Array<{ variantKey: string; visitors: number; conversions: number; cvr: number }>;
}
interface Analytics {
  funnelId: string; totalVisitors: number; totalConversions: number; overallCvr: number;
  steps: AnalyticsStep[];
}

const STEP_TYPES: { type: StepType; label: string; icono: string }[] = [
  { type: "landing", label: "Landing Page", icono: "fa-solid fa-house" },
  { type: "form", label: "Formulario", icono: "fa-solid fa-clipboard-list" },
  { type: "video", label: "Video VSL", icono: "fa-solid fa-video" },
  { type: "checkout", label: "Checkout", icono: "fa-solid fa-credit-card" },
  { type: "upsell", label: "Upsell", icono: "fa-solid fa-arrow-up" },
  { type: "thankyou", label: "Gracias", icono: "fa-solid fa-circle-check" },
];

/** Un tipo fuera de catálogo hacía estallar el `!` de `STEP_TYPES.find`. */
function stepCfg(type: unknown) {
  return STEP_TYPES.find((s) => s.type === type) ?? {
    type: "landing" as StepType, label: String(type ?? "—"), icono: "fa-solid fa-file",
  };
}
function statusBadge(s: FunnelStatus): string {
  return s === "active" ? "badge-success" : s === "paused" ? "badge-warning" : "badge-secondary";
}
function statusLabel(s: FunnelStatus): string {
  return s === "active" ? "Activo" : s === "paused" ? "Pausado" : "Borrador";
}
/** Saneado de `f89c198c`: nada llega crudo a `toLocaleString`/`toFixed`. */
function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
/** `null` = sin dato. Se pinta "—", nunca 0. */
function opt(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}
function miles(v: unknown): string {
  const n = opt(v);
  return n === null ? "—" : n.toLocaleString("es-ES");
}
function pct(v: unknown): string {
  const n = opt(v);
  return n === null ? "—" : `${n}%`;
}
function txt(v: unknown): string { return typeof v === "string" ? v : ""; }
function barra(v: unknown, max: number): number {
  const p = (num(v) / (max || 1)) * 100;
  return Number.isFinite(p) ? Math.min(100, Math.max(0, p)) : 0;
}

// ── Nuevo funnel ─────────────────────────────────────────────────────────────
function NewFunnelModal({ onClose, onSaved }: { onClose(): void; onSaved(id: string): void }) {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("El nombre es obligatorio"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/saas/funnels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          name: name.trim(), description: desc.trim() || null,
          steps: [
            { type: "landing", name: "Landing Page" },
            { type: "form", name: "Formulario" },
            { type: "thankyou", name: "Gracias" },
          ],
        }),
      });
      // El cuerpo solo puede leerse una vez: se lee y luego se decide.
      const data = (await res.json().catch(() => ({}))) as { funnel?: Funnel; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Error al crear funnel");
      if (!data.funnel?.id) throw new Error("Respuesta sin funnel");
      onSaved(data.funnel.id);
      onClose();
    } catch (err) { setError(err instanceof Error ? err.message : "Error"); }
    finally { setSaving(false); }
  }

  return (
    <W3crmModal titulo="Nuevo funnel" onClose={onClose} error={error}>
      <form onSubmit={(e) => void save(e)}>
        <div className="form-group mb-3">
          <label htmlFor="fn-nombre" className="text-black font-w600">
            Nombre <span className="required">*</span>
          </label>
          <input id="fn-nombre" className="form-control" autoFocus
            placeholder="Funnel de captación de leads"
            value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="form-group mb-3">
          <label htmlFor="fn-desc" className="text-black font-w600">Descripción</label>
          <input id="fn-desc" className="form-control" placeholder="Descripción opcional"
            value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>
        <div className="text-end">
          <button type="button" className="btn btn-primary light me-2" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Creando…" : "Crear funnel"}
          </button>
        </div>
      </form>
    </W3crmModal>
  );
}

// ── Editor de un paso ────────────────────────────────────────────────────────
function StepEditor({ step, funnelId, onUpdated }: {
  step: FunnelStep; funnelId: string; onUpdated(s: FunnelStep): void;
}) {
  const [form, setForm] = useState({
    name: txt(step.name), content: step.content ?? "",
    ctaLabel: step.ctaLabel ?? "", ctaUrl: step.ctaUrl ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm({
      name: txt(step.name), content: step.content ?? "",
      ctaLabel: step.ctaLabel ?? "", ctaUrl: step.ctaUrl ?? "",
    });
  }, [step.id, step.name, step.content, step.ctaLabel, step.ctaUrl]);

  async function saveStep() {
    setSaving(true); setSaved(false);
    try {
      const res = await fetch(`/api/saas/funnels/${funnelId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          action: "update_step", step_id: step.id,
          name: form.name, content: form.content || null,
          cta_label: form.ctaLabel || null, cta_url: form.ctaUrl || null,
        }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      const data = (await res.json().catch(() => ({}))) as { step?: FunnelStep };
      if (data.step) onUpdated(data.step);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2000);
    } finally { setSaving(false); }
  }

  const cfg = stepCfg(step.type);

  return (
    /* El título no puede ser "Analytics" ni "Visitas totales" (ver cabecera). */
    <W3crmContentBox titulo={`Configuración del paso · ${cfg.label}`} icono={cfg.icono}>
      <p className="fs-12 text-muted">Paso {num(step.stepOrder) + 1}</p>
      <div className="form-group mb-3">
        <label htmlFor="fn-step-nombre" className="text-black font-w600">Nombre del paso</label>
        <input id="fn-step-nombre" className="form-control"
          value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
      </div>
      <div className="form-group mb-3">
        <label htmlFor="fn-step-contenido" className="text-black font-w600">
          {step.type === "checkout" ? "Configuración checkout (JSON)" : "Contenido HTML"}
        </label>
        <textarea id="fn-step-contenido" className="form-control" rows={5}
          placeholder={step.type === "checkout"
            ? '{"amount":9900,"currency":"eur","productName":"Oferta"}'
            : "<h1>Tu oferta</h1><p>Descripción…</p>"}
          value={form.content} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} />
      </div>
      <div className="row">
        <div className="col-sm-6">
          <div className="form-group mb-3">
            <label htmlFor="fn-step-cta" className="text-black font-w600">CTA Label</label>
            <input id="fn-step-cta" className="form-control" placeholder="Siguiente →"
              value={form.ctaLabel} onChange={(e) => setForm((f) => ({ ...f, ctaLabel: e.target.value }))} />
          </div>
        </div>
        <div className="col-sm-6">
          <div className="form-group mb-3">
            <label htmlFor="fn-step-url" className="text-black font-w600">CTA URL (opcional)</label>
            <input id="fn-step-url" className="form-control" placeholder="https://…"
              value={form.ctaUrl} onChange={(e) => setForm((f) => ({ ...f, ctaUrl: e.target.value }))} />
          </div>
        </div>
      </div>
      <div className="text-end">
        {saved && <span className="text-success fs-12 me-2">Guardado</span>}
        <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void saveStep()}>
          {saving ? "Guardando…" : "Guardar paso"}
        </button>
      </div>
    </W3crmContentBox>
  );
}

// ── Variantes A/B ────────────────────────────────────────────────────────────
function AbVariantPanel({ step, funnelId }: { step: FunnelStep; funnelId: string }) {
  const [variants, setVariants] = useState<FunnelVariant[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    void fetch(`/api/saas/funnels/${funnelId}?resource=variants&stepId=${step.id}`, { credentials: "same-origin" })
      .then((r) => r.json() as Promise<{ variants?: FunnelVariant[] }>)
      .then((d) => setVariants(Array.isArray(d?.variants) ? d.variants : []))
      .catch(() => setVariants([]))
      .finally(() => setLoading(false));
  }, [step.id, funnelId]);

  async function enableAb() {
    setSaving(true);
    try {
      for (const variantKey of ["A", "B"] as const) {
        await fetch(`/api/saas/funnels/${funnelId}`, {
          method: "POST", credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "add-variant", step_id: step.id, variant_key: variantKey,
            weight_pct: 50, content: { html: "", ctaLabel: "", ctaUrl: "" },
          }),
        });
      }
      const res = await fetch(`/api/saas/funnels/${funnelId}?resource=variants&stepId=${step.id}`, { credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as { variants?: FunnelVariant[] };
      setVariants(Array.isArray(data.variants) ? data.variants : []);
    } finally { setSaving(false); }
  }

  async function updateWeight(variantId: string, weightPct: number) {
    await fetch(`/api/saas/funnels/${funnelId}`, {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update-variant-weight", variant_id: variantId, weight_pct: weightPct }),
    });
    setVariants((vs) => vs.map((v) => (v.id === variantId ? { ...v, weightPct } : v)));
  }

  return (
    <W3crmContentBox titulo="A/B Testing del paso" icono="fa-solid fa-code-compare">
      {loading ? (
        <W3crmCargando texto="Cargando variantes…" />
      ) : variants.length === 0 ? (
        <>
          <W3crmEmptyState title="A/B testing no activado" description="Este paso sirve una única versión." />
          <div className="text-center">
            <button type="button" className="btn btn-primary light btn-sm" disabled={saving}
              onClick={() => void enableAb()}>
              {saving ? "Activando…" : "Activar A/B para este paso"}
            </button>
          </div>
        </>
      ) : (
        <>
          {variants.map((v) => (
            <div className="mb-3" key={v.id}>
              <div className="d-flex align-items-center justify-content-between">
                <span className="fw-bold">Variante {txt(v.variantKey) || "—"}</span>
                <span className="text-muted fs-12">
                  {miles(v.visitors)} vis · {miles(v.conversions)} conv
                </span>
              </div>
              <div className="d-flex align-items-center gap-2">
                <input type="range" className="form-range flex-grow-1" min={0} max={100}
                  value={num(v.weightPct)}
                  aria-label={`Peso de la variante ${v.variantKey}`}
                  onChange={(e) => void updateWeight(v.id, Number(e.target.value))} />
                <span className="fw-bold" style={{ minWidth: 46, textAlign: "right" }}>{num(v.weightPct)}%</span>
              </div>
            </div>
          ))}
          <p className="fs-12 text-muted mb-0">
            Los pesos determinan la distribución de tráfico. Suma recomendada: 100%.
          </p>
        </>
      )}
    </W3crmContentBox>
  );
}

// ── Rendimiento del embudo ───────────────────────────────────────────────────
function AnalyticsPanel({ funnelId }: { funnelId: string }) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch(`/api/saas/funnels/${funnelId}?resource=analytics`, { credentials: "same-origin" })
      .then((r) => r.json() as Promise<{ analytics?: Analytics }>)
      .then((d) => setAnalytics(d?.analytics && typeof d.analytics === "object" ? d.analytics : null))
      .catch(() => setAnalytics(null))
      .finally(() => setLoading(false));
  }, [funnelId]);

  // `steps` podía no ser array y reventaba `.map`.
  const steps = Array.isArray(analytics?.steps) ? analytics.steps : [];
  const maxVisitors = Math.max(...steps.map((s) => num(s.visitors)), 1);

  return (
    /* NUNCA titular esta caja "Analytics" ni "Visitas totales". */
    <W3crmContentBox titulo="Rendimiento del embudo" icono="fa-solid fa-chart-line">
      {loading ? (
        <W3crmCargando texto="Cargando analytics…" />
      ) : !analytics ? (
        <W3crmEmptyState title="Sin datos de analytics" />
      ) : (
        <>
          <div className="row">
            {/* "Visitas totales" solo existe aquí cuando el builder está
                montado; el KPI del listado no se renderiza a la vez. */}
            <div className="col-xl-4 col-sm-4">
              <W3crmKpiTile label="Visitas totales" value={miles(analytics.totalVisitors)} />
            </div>
            <div className="col-xl-4 col-sm-4">
              <W3crmKpiTile label="Conversiones" value={miles(analytics.totalConversions)} accent />
            </div>
            <div className="col-xl-4 col-sm-4">
              <W3crmKpiTile label="CVR global" value={pct(analytics.overallCvr)} />
            </div>
          </div>

          {steps.length === 0 ? (
            <W3crmEmptyState title="Sin pasos medidos" />
          ) : (
            <W3crmDataTable
              filas={steps}
              etiqueta="pasos"
              wrapperId="fn_analytics_wrapper"
              porPagina={10}
              columnas={[
                { titulo: "Paso" }, { titulo: "Visitas" }, { titulo: "CVR" },
                { titulo: "Variantes" }, { titulo: "Peso", alFinal: true },
              ]}
              render={(s) => {
                const vars = Array.isArray(s.variants) ? s.variants : [];
                const drop = opt(s.dropOff);
                return (
                  <tr key={s.id}>
                    <td>
                      <span className="fw-bold">{txt(s.name) || "—"}</span>
                      {drop !== null && drop > 0 ? (
                        <div className="text-danger fs-12">↓{drop}% abandono</div>
                      ) : null}
                    </td>
                    <td>{miles(s.visitors)}</td>
                    <td>{pct(s.cvr)}</td>
                    <td className="text-muted fs-12">
                      {vars.length === 0 ? "—" : vars.map((v) => (
                        <div key={v.variantKey}>
                          {txt(v.variantKey)}: {miles(v.visitors)} vis · CVR {pct(v.cvr)}
                        </div>
                      ))}
                    </td>
                    <td className="text-end" style={{ minWidth: 90 }}>
                      <div className="progress" style={{ height: 6 }}>
                        <div className="progress-bar bg-primary" role="progressbar"
                          style={{ width: `${barra(s.visitors, maxVisitors)}%` }}
                          aria-valuenow={Math.round(barra(s.visitors, maxVisitors))}
                          aria-valuemin={0} aria-valuemax={100}
                          aria-label={`Peso de ${txt(s.name)}`} />
                      </div>
                    </td>
                  </tr>
                );
              }}
            />
          )}
        </>
      )}
    </W3crmContentBox>
  );
}

// ── Builder ──────────────────────────────────────────────────────────────────
function BuilderView({ funnel, onBack, onFunnelUpdated }: {
  funnel: Funnel; onBack(): void; onFunnelUpdated(f: Funnel): void;
}) {
  const pasosIniciales = Array.isArray(funnel.steps) ? funnel.steps : [];
  const [selectedStep, setSelectedStep] = useState<FunnelStep | null>(pasosIniciales[0] ?? null);
  const [builderTab, setBuilderTab] = useState<BuilderTab>("steps");
  const [abStep, setAbStep] = useState<FunnelStep | null>(null);
  const [localSteps, setLocalSteps] = useState<FunnelStep[]>(pasosIniciales);
  const [publishing, setPublishing] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  async function moveStep(stepId: string, dir: "up" | "down") {
    const idx = localSteps.findIndex((s) => s.id === stepId);
    if (idx === -1) return;
    const targetIdx = dir === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= localSteps.length) return;
    const newOrder = [...localSteps];
    const tmp = newOrder[idx]!; newOrder[idx] = newOrder[targetIdx]!; newOrder[targetIdx] = tmp;
    await Promise.all(newOrder.map((s, i) =>
      fetch(`/api/saas/funnels/${funnel.id}`, {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_step", step_id: s.id, step_order: i }),
      }),
    ));
    setLocalSteps(newOrder.map((s, i) => ({ ...s, stepOrder: i })));
    if (selectedStep?.id === stepId) setSelectedStep((prev) => (prev ? { ...prev, stepOrder: targetIdx } : prev));
  }

  async function addStep(type: StepType) {
    const cfg = stepCfg(type);
    const res = await fetch(`/api/saas/funnels/${funnel.id}`, {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "step", type, name: cfg.label }),
    });
    if (res.ok) {
      const data = (await res.json().catch(() => ({}))) as { step?: FunnelStep };
      const nuevo = data.step;
      if (nuevo) setLocalSteps((prev) => [...prev, nuevo]);
    }
  }

  async function removeStep(stepId: string) {
    const res = await fetch(`/api/saas/funnels/${funnel.id}`, {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_step", step_id: stepId }),
    });
    if (res.ok) {
      setLocalSteps((prev) => prev.filter((s) => s.id !== stepId));
      if (selectedStep?.id === stepId) setSelectedStep(null);
    }
  }

  async function publishFunnel() {
    setPublishing(true);
    try {
      const res = await fetch(`/api/saas/funnels/${funnel.id}`, {
        method: "POST", credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish" }),
      });
      if (res.ok) {
        const data = (await res.json().catch(() => ({}))) as { funnel?: Funnel };
        if (data.funnel) onFunnelUpdated(data.funnel);
      }
    } finally { setPublishing(false); }
  }

  async function pauseFunnel() {
    const res = await fetch(`/api/saas/funnels/${funnel.id}`, {
      method: "POST", credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "pause" }),
    });
    if (res.ok) {
      const data = (await res.json().catch(() => ({}))) as { funnel?: Funnel };
      if (data.funnel) onFunnelUpdated(data.funnel);
    }
  }

  function copyPublicUrl() {
    const slug = funnel.publicSlug;
    if (!slug) return;
    const url = `${window.location.origin}/f/${slug}`;
    // `clipboard` puede no existir sin permiso.
    void navigator.clipboard?.writeText(url).then(() => {
      setCopySuccess(true);
      window.setTimeout(() => setCopySuccess(false), 2000);
    });
  }

  return (
    <>
      <W3crmPageTitle mainTitle={txt(funnel.name) || "Funnel"} parentTitle="Captación" pageTitle="Builder" />
      <div className="container-fluid">
        <div className="row">
          <div className="col-xl-12">
            <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
              <button type="button" className="btn btn-primary light btn-sm" onClick={onBack}>← Funnels</button>
              <span className={`badge ${statusBadge(funnel.status)}`}>{statusLabel(funnel.status)}</span>
              <span className="ms-auto">
                {funnel.status === "draft" && (
                  <button type="button" className="btn btn-primary btn-sm me-1" disabled={publishing}
                    onClick={() => void publishFunnel()}>
                    {publishing ? "Publicando…" : "Publicar"}
                  </button>
                )}
                {funnel.status === "active" && (
                  <>
                    <button type="button" className="btn btn-primary light btn-sm me-1"
                      onClick={() => void pauseFunnel()}>Pausar</button>
                    <button type="button" className="btn btn-primary light btn-sm" onClick={copyPublicUrl}>
                      {copySuccess ? "Copiado" : "Copiar URL pública"}
                    </button>
                  </>
                )}
              </span>
            </div>

            {funnel.publicSlug ? (
              <div className="alert alert-primary py-2" role="note">
                <span className="fs-12 d-block">URL pública</span>
                <code className="text-break">
                  {typeof window !== "undefined" ? window.location.origin : "https://app.nelvyon.com"}/f/{funnel.publicSlug}
                </code>
              </div>
            ) : null}

            {/* Pestañas: `<button>` sin `role`. "Analytics" es texto-contrato. */}
            <ul className="nav nav-tabs mb-3">
              {(["steps", "analytics"] as BuilderTab[]).map((t) => (
                <li className="nav-item" key={t}>
                  <button type="button" className={`nav-link ${builderTab === t ? "active" : ""}`}
                    aria-pressed={builderTab === t} onClick={() => setBuilderTab(t)}>
                    {t === "steps" ? "Editor de pasos" : "Analytics"}
                  </button>
                </li>
              ))}
            </ul>

            {builderTab === "analytics" && <AnalyticsPanel funnelId={funnel.id} />}

            {builderTab === "steps" && (
              <div className="row">
                <div className="col-xl-4">
                  <W3crmContentBox titulo={`Pasos del embudo (${localSteps.length})`} icono="fa-solid fa-list-ol">
                    {localSteps.length === 0 ? (
                      <W3crmEmptyState title="Sin pasos" description="Añade el primero con los botones de abajo." />
                    ) : (
                      <ul className="list-group list-group-flush mb-3">
                        {localSteps.map((s, i) => {
                          const cfg = stepCfg(s.type);
                          const isSelected = selectedStep?.id === s.id;
                          return (
                            <li key={s.id}
                              className={`list-group-item d-flex align-items-center gap-2 px-0 ${isSelected ? "bg-light" : ""}`}>
                              <button type="button"
                                className="btn btn-link p-0 text-start text-decoration-none flex-grow-1"
                                aria-pressed={isSelected}
                                onClick={() => { setSelectedStep(s); setAbStep(null); }}>
                                <i className={`${cfg.icono} me-2 text-primary`} aria-hidden="true" />
                                <span className="fw-bold">{i + 1}. {txt(s.name) || "—"}</span>
                                <span className="text-muted fs-12 d-block">{cfg.label}</span>
                              </button>
                              <button type="button" className="btn btn-primary light btn-sm" disabled={i === 0}
                                aria-label={`Subir ${s.name}`} onClick={() => void moveStep(s.id, "up")}>↑</button>
                              <button type="button" className="btn btn-primary light btn-sm"
                                disabled={i === localSteps.length - 1}
                                aria-label={`Bajar ${s.name}`} onClick={() => void moveStep(s.id, "down")}>↓</button>
                              <button type="button" className="btn btn-danger light btn-sm"
                                aria-label={`Eliminar ${s.name}`} onClick={() => void removeStep(s.id)}>✕</button>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    <div className="d-flex flex-wrap gap-1">
                      {STEP_TYPES.map((t) => (
                        <button key={t.type} type="button" className="btn btn-primary light btn-sm"
                          onClick={() => void addStep(t.type)}>
                          <i className={`${t.icono} me-1`} aria-hidden="true" />+ {t.label}
                        </button>
                      ))}
                    </div>
                  </W3crmContentBox>
                </div>

                <div className="col-xl-8">
                  {selectedStep ? (
                    <>
                      <StepEditor
                        step={selectedStep}
                        funnelId={funnel.id}
                        onUpdated={(updated) => {
                          setLocalSteps((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
                          setSelectedStep(updated);
                        }}
                      />
                      <div className="mb-2">
                        <button type="button" className="btn btn-primary light btn-sm"
                          aria-expanded={abStep?.id === selectedStep.id}
                          onClick={() => setAbStep((prev) => (prev?.id === selectedStep.id ? null : selectedStep))}>
                          {abStep?.id === selectedStep.id ? "Ocultar A/B" : "Configurar A/B Testing"}
                        </button>
                      </div>
                      {abStep?.id === selectedStep.id && (
                        <AbVariantPanel step={selectedStep} funnelId={funnel.id} />
                      )}
                    </>
                  ) : (
                    <W3crmContentBox titulo="Configuración del paso" icono="fa-solid fa-sliders">
                      <W3crmEmptyState title="Selecciona un paso para editarlo" />
                    </W3crmContentBox>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ── Listado ──────────────────────────────────────────────────────────────────
export default function SaasFunnelsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const funnelId = searchParams?.get("id") ?? null;

  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [statusFilter, setStatusFilter] = useState<FunnelStatus | "all">("all");
  const [builderFunnel, setBuilderFunnel] = useState<Funnel | null>(null);
  const [funnelTemplates, setFunnelTemplates] = useState<Array<{ id: string; name: string; description: string }>>([]);
  const [importingFunnelTpl, setImportingFunnelTpl] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/saas/funnels", { credentials: "same-origin" });
      const data = (await res.json().catch(() => ({}))) as { funnels?: Funnel[] };
      setFunnels(Array.isArray(data.funnels) ? data.funnels : []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    fetch("/api/saas/funnels/templates")
      .then((r) => r.json())
      .then((d: { templates?: Array<{ id: string; name: string; description: string }> }) =>
        setFunnelTemplates(Array.isArray(d?.templates) ? d.templates : []))
      .catch(() => {});
  }, []);

  async function importFunnelTemplate(id: string) {
    setImportingFunnelTpl(id);
    try {
      const res = await fetch("/api/saas/funnels/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import", template_id: id }),
      });
      if (res.ok) await load();
    } finally {
      setImportingFunnelTpl(null);
    }
  }

  useEffect(() => {
    if (!funnelId || !funnels.length) return;
    const f = funnels.find((x) => x.id === funnelId);
    if (f) setBuilderFunnel(f);
  }, [funnelId, funnels]);

  function openBuilder(f: Funnel) {
    setBuilderFunnel(f);
    router.push(`/saas/funnels?id=${f.id}`, { scroll: false });
  }

  function closeBuilder() {
    setBuilderFunnel(null);
    router.push("/saas/funnels", { scroll: false });
  }

  async function deleteFunnel(id: string, name: string) {
    const r = await Alert.fire({
      title: `¿Eliminar el funnel "${name}"?`,
      text: "Esta acción no se puede deshacer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
    });
    if (!r.isConfirmed) return;
    setDeletingId(id);
    try {
      const res = await fetch(`/api/saas/funnels/${id}`, { method: "DELETE", credentials: "same-origin" });
      if (res.ok) setFunnels((prev) => prev.filter((f) => f.id !== id));
    } finally {
      setDeletingId(null);
    }
  }

  const filtered = statusFilter === "all" ? funnels : funnels.filter((f) => f.status === statusFilter);
  const totalVisitors = funnels.reduce((s, f) => s + num(f.totalVisitors), 0);
  const totalConversions = funnels.reduce((s, f) => s + num(f.totalConversions), 0);
  const overallCvr = totalVisitors > 0 ? ((totalConversions / totalVisitors) * 100).toFixed(1) : "0.0";

  // Exclusión mutua original: builder y listado NUNCA se montan a la vez, que
  // es lo que mantiene único el texto "Visitas totales".
  if (builderFunnel) {
    return (
      <SaasW3crmShell>
        <BuilderView
          funnel={builderFunnel}
          onBack={closeBuilder}
          onFunnelUpdated={(updated) => {
            setBuilderFunnel(updated);
            setFunnels((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
          }}
        />
      </SaasW3crmShell>
    );
  }

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Funnel Builder" parentTitle="Captación" pageTitle="Funnels" />
      <div className="container-fluid">
        <div className="row">
          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Funnels" value={funnels.length} /></div>
          <div className="col-xl-3 col-sm-6">
            <W3crmKpiTile label="Activos" value={funnels.filter((f) => f.status === "active").length} accent />
          </div>
          <div className="col-xl-3 col-sm-6">
            <W3crmKpiTile label="Visitas totales" value={totalVisitors.toLocaleString("es-ES")} />
          </div>
          <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="CVR global" value={`${overallCvr}%`} /></div>

          <div className="col-xl-12">
            <p className="fs-14 text-muted">Editor visual de embudos con A/B testing y analytics.</p>

            {funnelTemplates.length > 0 && (
              <W3crmContentBox
                titulo={`Plantillas funnel Nelvyon (${funnelTemplates.length})`}
                icono="fa-solid fa-layer-group"
                defaultOpen={false}
              >
                <div className="row">
                  {funnelTemplates.map((t) => (
                    <div className="col-xl-4 col-sm-6" key={t.id}>
                      <div className="card border mb-3 h-100">
                        <div className="card-body d-flex flex-column">
                          <span className="fw-bold">{txt(t.name) || "—"}</span>
                          <p className="text-muted fs-12 mt-1 flex-grow-1">{txt(t.description)}</p>
                          <button type="button" className="btn btn-primary btn-sm w-100"
                            disabled={importingFunnelTpl === t.id}
                            aria-label={`Importar plantilla ${t.name}`}
                            onClick={() => void importFunnelTemplate(t.id)}>
                            {importingFunnelTpl === t.id ? "…" : "Importar funnel"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </W3crmContentBox>
            )}

            <W3crmContentBox
              titulo="Embudos"
              icono="fa-solid fa-filter-circle-dollar"
              acciones={
                <button type="button" className="btn btn-primary btn-sm me-2" onClick={() => setShowNew(true)}>
                  + Nuevo funnel
                </button>
              }
            >
              <div className="mb-3" role="group" aria-label="Filtrar por estado">
                {(["all", "draft", "active", "paused"] as const).map((s) => (
                  <button key={s} type="button" aria-pressed={statusFilter === s}
                    className={`btn btn-sm me-1 mb-1 ${statusFilter === s ? "btn-primary" : "btn-primary light"}`}
                    onClick={() => setStatusFilter(s)}>
                    {s === "all" ? "Todos" : s === "draft" ? "Borrador" : s === "active" ? "Activos" : "Pausados"}
                  </button>
                ))}
              </div>

              {loading ? (
                <W3crmCargando texto="Cargando funnels…" />
              ) : filtered.length === 0 ? (
                <W3crmEmptyState
                  title={`Sin funnels${statusFilter !== "all" ? ` (${statusFilter})` : ""}`}
                  description="Crea tu primer embudo de ventas o captación de leads."
                />
              ) : (
                <W3crmDataTable
                  filas={filtered}
                  etiqueta="funnels"
                  wrapperId="fn_lista_wrapper"
                  porPagina={10}
                  reiniciarEn={statusFilter}
                  columnas={[
                    { titulo: "Funnel" }, { titulo: "Pasos" }, { titulo: "Métricas" },
                    { titulo: "Estado" }, { titulo: "Gestión", alFinal: true },
                  ]}
                  render={(f) => {
                    const pasos = Array.isArray(f.steps) ? f.steps : [];
                    return (
                      <tr key={f.id}>
                        <td>
                          {/* Nombre sin truncar: `E2E Test Funnel` es contrato. */}
                          <span className="fw-bold">{txt(f.name) || "—"}</span>
                          {f.description ? <div className="text-muted fs-12">{txt(f.description)}</div> : null}
                        </td>
                        <td className="text-muted fs-12">
                          {pasos.length === 0 ? "—" : pasos.slice(0, 6).map((s) => (
                            <span key={s.id} className="badge badge-secondary me-1 mb-1">
                              {txt(s.name) || stepCfg(s.type).label}
                            </span>
                          ))}
                        </td>
                        <td className="text-muted fs-12">
                          <div>{miles(f.totalVisitors)} visitas</div>
                          <div>{miles(f.totalConversions)} conv.</div>
                        </td>
                        <td><span className={`badge ${statusBadge(f.status)}`}>{statusLabel(f.status)}</span></td>
                        <td className="text-end">
                          <button type="button" className="btn btn-primary light btn-sm me-1"
                            onClick={() => openBuilder(f)}>
                            Abrir builder
                          </button>
                          <button type="button" className="btn btn-danger light btn-sm"
                            disabled={deletingId === f.id}
                            aria-label={`Eliminar funnel ${f.name}`}
                            onClick={() => void deleteFunnel(f.id, f.name)}>
                            {deletingId === f.id ? "…" : "Eliminar"}
                          </button>
                        </td>
                      </tr>
                    );
                  }}
                />
              )}
            </W3crmContentBox>
          </div>
        </div>
      </div>

      {showNew && (
        <NewFunnelModal
          onClose={() => setShowNew(false)}
          onSaved={(id) => {
            void load().then(() => {
              const f = funnels.find((x) => x.id === id);
              if (f) openBuilder(f);
            });
          }}
        />
      )}
    </SaasW3crmShell>
  );
}
