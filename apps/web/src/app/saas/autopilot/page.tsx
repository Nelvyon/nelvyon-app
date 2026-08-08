"use client";

/**
 * /saas/autopilot sobre `(cms)/content` de W3CRM, con las piezas ya portadas.
 * Mapeo: rejilla de servicios -> `W3crmContentBox` + `card` de Bootstrap;
 * KPIs -> `W3crmKpiTile`; espera -> `W3crmCargando`. Sin componentes nuevos.
 *
 * CONTRATO — `saas-autopilot.spec.ts` exige, y aqui se conserva:
 *   - `getByText("SEO mensual")` UNICO (l.14). Por eso ninguna caja se titula
 *     con ese texto: el toggle de `W3crmContentBox` expone
 *     `aria-label="Plegar <titulo>"` y entraria en el conteo.
 *   - `Calendario social` y `/Ads snapshot/i` visibles (l.62,66).
 *   - la tarjeta de reputacion, localizada por su control accesible
 *     `/^Toggle Reputaci/i` (l.65). El rotulo "Reputación GBP" se conserva
 *     intacto: el sidebar declara un enlace "Reputación" (`saasNav.ts:106`)
 *     que `SaasW3crmShell` SI expone a `getByText` —el shell anterior no—, de
 *     ahi que el spec localice la tarjeta por su boton y no por texto suelto.
 *   - el body debe casar con `/Servicios activos|activos/i` y
 *     `/Entregables este mes/i` (l.72-73): son las dos etiquetas de KPI.
 *   - un `<a>` con texto `/Ver entregables/i` y `href="/saas/entregables"`
 *     exacto (l.78-79).
 *   - el PRIMER `<button>` con `/Ejecutar ahora/i` deshabilitado cuando SEO
 *     esta OFF (l.84-85): de ahi que `SERVICES` conserve su orden, con `seo`
 *     primero.
 *   - `getByRole("button", { name: "Toggle SEO mensual" })` disparando
 *     `PATCH /api/saas/autopilot` (l.94): el toggle sigue siendo un `<button>`
 *     con ese `aria-label` y SIN `role` explicito. Ponerle `role="switch"`
 *     sobrescribe el rol implicito y `getByRole("button", ...)` deja de
 *     encontrarlo.
 *
 * Logica de NELVYON intacta: `GET /api/saas/autopilot` y
 * `GET /api/saas/entregables?days=30` en paralelo; `PATCH
 * /api/saas/autopilot` con el `fieldMap` de los cuatro servicios; `POST
 * /api/saas/autopilot/run` en sus dos formas (`{ service }` y
 * `{ runAll: true }`); el toast de 4 s con su criterio de exito; la recarga de
 * timestamps tras ejecutar; el `activeCount > 0` que gobierna "Ejecutar todo";
 * y el `nextRunField` nulo de reputacion y ads.
 */
import { useEffect, useState } from "react";
import Link from "next/link";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmKpiTile } from "@/features/saas-w3crm/components/W3crmUi";
import { W3crmCargando, W3crmContentBox } from "@/features/saas-w3crm/components/W3crmContentBox";
import type { AutopilotStatus, AutopilotService } from "@nelvyon/saas";

interface ServiceCard {
  key: AutopilotService;
  enabledField: keyof AutopilotStatus;
  lastRunField: keyof AutopilotStatus;
  nextRunField: keyof AutopilotStatus;
  label: string;
  icon: string;
  description: string;
  hint?: string;
}

/** El orden importa: `seo` va primero porque el spec toma el PRIMER
 *  "Ejecutar ahora" y lo espera deshabilitado con SEO en OFF. */
const SERVICES: ServiceCard[] = [
  {
    key: "seo",
    enabledField: "seoEnabled",
    lastRunField: "lastSeoRunAt",
    nextRunField: "nextSeoRun",
    label: "SEO mensual",
    icon: "fa-solid fa-magnifying-glass",
    description: "Informe SEO automático: posiciones, keywords y acciones recomendadas",
    hint: "Conecta Google Search Console para datos reales de posicionamiento",
  },
  {
    key: "social",
    enabledField: "socialEnabled",
    lastRunField: "lastSocialRunAt",
    nextRunField: "nextSocialRun",
    label: "Calendario social",
    icon: "fa-solid fa-calendar-days",
    description: "Genera calendario de 12 posts/mes para Instagram, LinkedIn y Stories",
  },
  {
    key: "reputation",
    enabledField: "reputationEnabled",
    lastRunField: "lastReputationRunAt",
    nextRunField: null as unknown as keyof AutopilotStatus,
    label: "Reputación GBP",
    icon: "fa-solid fa-star",
    description: "Sincroniza reviews de Google Business Profile y detecta negativas",
    hint: "Requiere OAuth con Google My Business para sincronización automática",
  },
  {
    key: "ads",
    enabledField: "adsEnabled",
    lastRunField: "lastAdsRunAt",
    nextRunField: null as unknown as keyof AutopilotStatus,
    label: "Ads snapshot",
    icon: "fa-solid fa-bullhorn",
    description: "Refresca métricas de Meta Ads y Google Ads: ROAS, clicks, conversiones",
    hint: "Conecta al menos una plataforma de Ads en Integraciones",
  },
];

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
/** Una fecha corrupta pintaba "Invalid Date". */
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function ServiceToggleCard({
  card, status, onToggle, onRunNow, running,
}: {
  card: ServiceCard;
  status: AutopilotStatus;
  onToggle: (key: AutopilotService, enabled: boolean) => void;
  onRunNow: (key: AutopilotService) => void;
  running: AutopilotService | null;
}) {
  const enabled = Boolean(status[card.enabledField]);
  const lastRun = status[card.lastRunField] as string | null;
  const nextRun = card.nextRunField ? (status[card.nextRunField] as string | null) : null;
  const isRunning = running === card.key;

  return (
    <div className={`card border mb-3 h-100 ${enabled ? "border-primary" : ""}`}>
      <div className="card-body">
        <div className="d-flex align-items-start justify-content-between gap-3">
          <div className="d-flex align-items-start gap-3">
            <i className={`${card.icon} fa-lg text-primary mt-1`} aria-hidden="true" />
            <div>
              <div className="d-flex align-items-center gap-2">
                <span className="fw-bold">{card.label}</span>
                <span className={`badge ${enabled ? "badge-success" : "badge-secondary"}`}>
                  {enabled ? "Activo" : "Inactivo"}
                </span>
              </div>
              <p className="text-muted fs-12 mt-1 mb-0">{card.description}</p>
            </div>
          </div>
          {/* `<button>` sin `role` explicito y con este `aria-label` exacto: el
              spec lo localiza con `getByRole("button", { name: ... })`. */}
          <button
            type="button"
            aria-pressed={enabled}
            aria-label={`Toggle ${card.label}`}
            onClick={() => onToggle(card.key, !enabled)}
            className={`btn btn-sm flex-shrink-0 ${enabled ? "btn-primary" : "btn-primary light"}`}
          >
            {enabled ? "ON" : "OFF"}
          </button>
        </div>

        <div className="d-flex flex-wrap gap-3 text-muted fs-12 mt-3">
          <span>Última ejecución: <span className="text-black">{fmtDate(lastRun)}</span></span>
          {nextRun ? <span>Próxima: <span className="text-black">{fmtDate(nextRun)}</span></span> : null}
        </div>

        {card.hint && !enabled ? <p className="text-warning fs-12 mt-2 mb-0">{card.hint}</p> : null}

        <div className="mt-3">
          <button
            type="button"
            className={`btn btn-sm ${enabled && !isRunning ? "btn-primary" : "btn-primary light"}`}
            disabled={!enabled || isRunning}
            onClick={() => onRunNow(card.key)}
          >
            {isRunning ? "Ejecutando…" : "Ejecutar ahora"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AutopilotPage() {
  const [status, setStatus] = useState<AutopilotStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState<AutopilotService | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [entregablesThisMonth, setEntregablesThisMonth] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [autopilotRes, entRes] = await Promise.all([
        fetch("/api/saas/autopilot"),
        fetch("/api/saas/entregables?days=30"),
      ]);
      if (autopilotRes.ok) {
        const d = (await autopilotRes.json().catch(() => ({}))) as { status?: AutopilotStatus };
        // Un payload sin `status` dejaba la pantalla en blanco para siempre.
        if (d.status && typeof d.status === "object") setStatus(d.status);
      }
      if (entRes.ok) {
        const d = (await entRes.json().catch(() => ({}))) as { summary?: { total?: number } };
        // `summary` ausente reventaba al leer `.total`.
        setEntregablesThisMonth(d.summary && d.summary.total != null ? num(d.summary.total) : null);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function handleToggle(service: AutopilotService, enabled: boolean) {
    const fieldMap: Record<AutopilotService, string> = {
      seo: "seoEnabled",
      social: "socialEnabled",
      reputation: "reputationEnabled",
      ads: "adsEnabled",
    };
    try {
      const res = await fetch("/api/saas/autopilot", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [fieldMap[service]]: enabled }),
      });
      if (res.ok) {
        const d = (await res.json().catch(() => ({}))) as { settings?: AutopilotStatus };
        if (d.settings && typeof d.settings === "object") {
          const settings = d.settings;
          setStatus((prev) => (prev ? { ...prev, ...settings } : settings));
        }
      }
    } catch {
      // Silently ignore — state remains unchanged
    }
  }

  async function handleRunNow(service: AutopilotService) {
    setRunning(service);
    try {
      const res = await fetch("/api/saas/autopilot/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service }),
      });
      const d = (await res.json().catch(() => ({}))) as { result?: { message?: string; success?: boolean } };
      const msg = d.result?.message ?? (res.ok ? "Ejecutado" : "Error");
      setToast({ msg, ok: res.ok && (d.result?.success ?? false) });
      window.setTimeout(() => setToast(null), 4000);
      void load();
    } catch {
      setToast({ msg: "Error al ejecutar", ok: false });
      window.setTimeout(() => setToast(null), 4000);
    } finally {
      setRunning(null);
    }
  }

  async function handleRunAll() {
    setRunning("seo");
    try {
      const res = await fetch("/api/saas/autopilot/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runAll: true }),
      });
      const d = (await res.json().catch(() => ({}))) as { results?: Array<{ success?: boolean }> };
      const ok = res.ok && (Array.isArray(d.results) ? d.results.every((r) => r?.success) : res.ok);
      setToast({ msg: ok ? "Todos los servicios activos ejecutados" : "Algunos servicios fallaron", ok });
      window.setTimeout(() => setToast(null), 4000);
      void load();
    } catch {
      setToast({ msg: "Error al ejecutar", ok: false });
      window.setTimeout(() => setToast(null), 4000);
    } finally {
      setRunning(null);
    }
  }

  const activos = num(status?.activeCount);

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Autopilot" parentTitle="Inteligencia" pageTitle="Autopilot" />
      <div className="container-fluid">
        <div className="row">
          {status && (
            <>
              <div className="col-xl-4 col-sm-6">
                <W3crmKpiTile label="Servicios activos" value={`${activos} / 4`} accent />
              </div>
              <div className="col-xl-4 col-sm-6">
                <W3crmKpiTile
                  label="Entregables este mes"
                  value={entregablesThisMonth !== null ? entregablesThisMonth : "—"}
                />
              </div>
              <div className="col-xl-4 col-sm-6">
                <div className="card">
                  <div className="card-body p-4 d-flex align-items-center">
                    {/* href literal `/saas/entregables`: el spec compara el
                        atributo exacto. */}
                    <Link href="/saas/entregables">Ver entregables →</Link>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="col-xl-12">
            <p className="fs-14 text-muted">
              Activa los servicios recurrentes de IA que se ejecutan automáticamente cada mes
            </p>

            {toast && (
              <div className={`alert ${toast.ok ? "alert-success" : "alert-danger"}`} role="status">
                {toast.msg}
              </div>
            )}

            <W3crmContentBox
              titulo="Servicios recurrentes"
              icono="fa-solid fa-robot"
              acciones={
                status && activos > 0 ? (
                  <button type="button" className="btn btn-primary btn-sm me-2"
                    disabled={running !== null} onClick={() => void handleRunAll()}>
                    {running ? "Ejecutando…" : "Ejecutar todo"}
                  </button>
                ) : undefined
              }
            >
              {loading || !status ? (
                <W3crmCargando texto="Cargando servicios…" />
              ) : (
                <div className="row">
                  {SERVICES.map((card) => (
                    <div className="col-xl-6" key={card.key}>
                      <ServiceToggleCard
                        card={card}
                        status={status}
                        onToggle={handleToggle}
                        onRunNow={handleRunNow}
                        running={running}
                      />
                    </div>
                  ))}
                </div>
              )}
            </W3crmContentBox>
          </div>
        </div>
      </div>
    </SaasW3crmShell>
  );
}
