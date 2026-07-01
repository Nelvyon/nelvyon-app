"use client";

import { useEffect, useState } from "react";
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
    <div
      className={`rounded-xl border p-5 transition-colors ${
        enabled
          ? "border-[#0084ff]/40 bg-[#0084ff]/5"
          : "border-white/10 bg-white/5"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{card.icon}</span>
          <div>
            <p className="text-white font-semibold text-sm">{card.label}</p>
            <p className="text-white/40 text-xs mt-0.5">{card.description}</p>
          </div>
        </div>
        {/* Toggle */}
        <button
          aria-label={`Toggle ${card.label}`}
          onClick={() => onToggle(card.key, !enabled)}
          className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${
            enabled ? "bg-[#0084ff]" : "bg-white/20"
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
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-white/40">
        <span>Última ejecución: <span className="text-white/60">{fmtDate(lastRun)}</span></span>
        {nextRun && <span>Próxima: <span className="text-white/60">{fmtDate(nextRun)}</span></span>}
      </div>

      {/* Hint if not connected */}
      {card.hint && !enabled && (
        <p className="mt-2 text-xs text-yellow-400/70">{card.hint}</p>
      )}

      {/* Run now */}
      <div className="mt-4">
        <button
          disabled={!enabled || isRunning}
          onClick={() => onRunNow(card.key)}
          className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
            enabled && !isRunning
              ? "bg-[#0084ff] text-white hover:bg-blue-500"
              : "cursor-not-allowed bg-white/10 text-white/30"
          }`}
        >
          {isRunning ? "Ejecutando…" : "Ejecutar ahora"}
        </button>
      </div>
    </div>
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

  useEffect(() => { void load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-white">🤖 Autopilot</h1>
              <p className="text-sm text-white/50 mt-0.5">
                Activa los servicios recurrentes de IA que se ejecutan automáticamente cada mes
              </p>
            </div>
            {status && status.activeCount > 0 && (
              <button
                type="button"
                disabled={running !== null}
                onClick={() => void handleRunAll()}
                className="rounded-xl bg-[#0084ff] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0070dd] disabled:opacity-50"
              >
                {running ? "Ejecutando…" : "▶ Ejecutar todo"}
              </button>
            )}
          </div>
        </div>

        {/* KPI strip */}
        {status && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border border-white/10 bg-white/5 px-5 py-4">
              <p className="text-xs text-white/50 mb-1">Servicios activos</p>
              <p className="text-2xl font-bold text-white">{status.activeCount} / 4</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-5 py-4">
              <p className="text-xs text-white/50 mb-1">Entregables este mes</p>
              <p className="text-2xl font-bold text-white">
                {entregablesThisMonth !== null ? entregablesThisMonth : "—"}
              </p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 px-5 py-4 col-span-2 sm:col-span-1 flex items-center">
              <a
                href="/saas/entregables"
                className="text-[#0084ff] text-sm hover:underline"
              >
                Ver entregables →
              </a>
            </div>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div
            className={`rounded-lg px-4 py-2 text-sm font-medium ${
              toast.ok ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"
            }`}
          >
            {toast.msg}
          </div>
        )}

        {/* Service cards */}
        {loading || !status ? (
          <div className="text-white/40 text-sm py-12 text-center">Cargando configuración…</div>
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
