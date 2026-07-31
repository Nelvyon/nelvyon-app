"use client";

import { useEffect, useState } from "react";

import {
  NelvyonDsBadge,
  NelvyonDsButton,
  NelvyonDsCard,
  NelvyonDsSectionHeader,
} from "@/design-system/components";
import { KpiTile } from "@/features/saas-shell/components/SaasDashboardWidgets";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";
import type { AutopilotStatus, AutopilotService } from "@nelvyon/saas";

// ── Service card config ────────────────────────────────────────────────────────

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

const SERVICES: ServiceCard[] = [
  {
    key: "seo",
    enabledField: "seoEnabled",
    lastRunField: "lastSeoRunAt",
    nextRunField: "nextSeoRun",
    label: "SEO mensual",
    icon: "🔍",
    description: "Informe SEO automático: posiciones, keywords y acciones recomendadas",
    hint: "Conecta Google Search Console para datos reales de posicionamiento",
  },
  {
    key: "social",
    enabledField: "socialEnabled",
    lastRunField: "lastSocialRunAt",
    nextRunField: "nextSocialRun",
    label: "Calendario social",
    icon: "📅",
    description: "Genera calendario de 12 posts/mes para Instagram, LinkedIn y Stories",
  },
  {
    key: "reputation",
    enabledField: "reputationEnabled",
    lastRunField: "lastReputationRunAt",
    nextRunField: null as unknown as keyof AutopilotStatus,
    label: "Reputación GBP",
    icon: "⭐",
    description: "Sincroniza reviews de Google Business Profile y detecta negativas",
    hint: "Requiere OAuth con Google My Business para sincronización automática",
  },
  {
    key: "ads",
    enabledField: "adsEnabled",
    lastRunField: "lastAdsRunAt",
    nextRunField: null as unknown as keyof AutopilotStatus,
    label: "Ads snapshot",
    icon: "📣",
    description: "Refresca métricas de Meta Ads y Google Ads: ROAS, clicks, conversiones",
    hint: "Conecta al menos una plataforma de Ads en Integraciones",
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

// ── Toggle card ────────────────────────────────────────────────────────────────

function ServiceToggleCard({
  card,
  status,
  onToggle,
  onRunNow,
  running,
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
    <NelvyonDsCard className={enabled ? "border-primary/40 bg-primary/5" : undefined}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl" aria-hidden="true">{card.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-foreground text-sm">{card.label}</p>
              <NelvyonDsBadge tone={enabled ? "success" : "neutral"}>{enabled ? "Activo" : "Inactivo"}</NelvyonDsBadge>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{card.description}</p>
          </div>
        </div>
        {/* Toggle */}
        <button
          aria-label={`Toggle ${card.label}`}
          onClick={() => onToggle(card.key, !enabled)}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
            enabled ? "bg-primary" : "bg-muted"
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
              enabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Last / next run */}
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
        <span>Última ejecución: <span className="text-foreground/80">{fmtDate(lastRun)}</span></span>
        {nextRun && <span>Próxima: <span className="text-foreground/80">{fmtDate(nextRun)}</span></span>}
      </div>

      {/* Hint if not connected */}
      {card.hint && !enabled && (
        <p className="mt-2 text-xs text-warning">{card.hint}</p>
      )}

      {/* Run now */}
      <div className="mt-4">
        <NelvyonDsButton
          size="sm"
          variant={enabled && !isRunning ? "primary" : "secondary"}
          disabled={!enabled || isRunning}
          onClick={() => onRunNow(card.key)}
        >
          {isRunning ? "Ejecutando…" : "Ejecutar ahora"}
        </NelvyonDsButton>
      </div>
    </NelvyonDsCard>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

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
        const d = await autopilotRes.json() as { status: AutopilotStatus };
        setStatus(d.status);
      }
      if (entRes.ok) {
        const d = await entRes.json() as { summary: { total: number } };
        setEntregablesThisMonth(d.summary.total);
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
        const d = await res.json() as { settings: AutopilotStatus };
        setStatus((prev) => prev ? { ...prev, ...d.settings } : d.settings);
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
      const d = await res.json() as { result?: { message: string; success: boolean } };
      const msg = d.result?.message ?? (res.ok ? "Ejecutado" : "Error");
      setToast({ msg, ok: res.ok && (d.result?.success ?? false) });
      setTimeout(() => setToast(null), 4000);
      void load(); // Refresh last_run timestamps
    } catch {
      setToast({ msg: "Error al ejecutar", ok: false });
      setTimeout(() => setToast(null), 4000);
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
      const d = await res.json() as { results?: Array<{ message: string; success: boolean }> };
      const ok = res.ok && (d.results?.every((r) => r.success) ?? res.ok);
      setToast({ msg: ok ? "Todos los servicios activos ejecutados" : "Algunos servicios fallaron", ok });
      setTimeout(() => setToast(null), 4000);
      void load();
    } catch {
      setToast({ msg: "Error al ejecutar", ok: false });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setRunning(null);
    }
  }

  const sidebar = <SaasSidebar activeId="autopilot" />;

  return (
    <SaasShellLayout sidebar={sidebar}>
      <div className="space-y-6 pb-8">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <NelvyonDsSectionHeader
            title="🤖 Autopilot"
            subtitle="Activa los servicios recurrentes de IA que se ejecutan automáticamente cada mes"
          />
          {status && status.activeCount > 0 && (
            <NelvyonDsButton disabled={running !== null} onClick={() => void handleRunAll()}>
              {running ? "Ejecutando…" : "▶ Ejecutar todo"}
            </NelvyonDsButton>
          )}
        </div>

        {/* KPI strip */}
        {status && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <KpiTile icon="🤖" label="Servicios activos" value={`${status.activeCount} / 4`} accent />
            <KpiTile icon="📦" label="Entregables este mes" value={entregablesThisMonth !== null ? entregablesThisMonth : "—"} />
            <div className="col-span-2 flex items-center rounded-xl border border-border bg-card px-5 py-4 sm:col-span-1">
              <a href="/saas/entregables" className="text-sm text-primary hover:underline">
                Ver entregables →
              </a>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              toast.ok ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
            }`}
          >
            {toast.msg}
          </div>
        )}

        {/* Service cards */}
        {loading || !status ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl bg-muted/20" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {SERVICES.map((card) => (
              <ServiceToggleCard
                key={card.key}
                card={card}
                status={status}
                onToggle={handleToggle}
                onRunNow={handleRunNow}
                running={running}
              />
            ))}
          </div>
        )}
      </div>
    </SaasShellLayout>
  );
}
