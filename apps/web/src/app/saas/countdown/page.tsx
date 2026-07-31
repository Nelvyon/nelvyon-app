"use client";

import { useCallback, useEffect, useState } from "react";
import {
  NelvyonDsBadge,
  NelvyonDsButton,
  NelvyonDsCard,
  NelvyonDsSectionHeader,
} from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";
import { KpiTile } from "@/features/saas-shell/components/SaasDashboardWidgets";

type TimerType = "datetime" | "duration" | "evergreen";
type CountdownAction = "hide" | "show_message" | "redirect";

interface CountdownTimer {
  id: string;
  name: string;
  type: TimerType;
  targetDatetime: string | null;
  durationSeconds: number | null;
  evergreenSeconds: number | null;
  timezone: string;
  actionOnEnd: CountdownAction;
  actionValue: string | null;
  scans: number;
  createdAt: string;
}

const TYPE_LABEL: Record<TimerType, string> = {
  datetime: "Fecha fija",
  duration: "Duración fija",
  evergreen: "Evergreen (por visitante)",
};

function embedSnippet(id: string): string {
  const base = typeof window !== "undefined" ? window.location.origin : "https://app.nelvyon.com";
  return `<div data-nelvyon-countdown="${id}"></div><script src="${base}/embed/countdown.js" async></script>`;
}

function LiveClock({ targetDatetime }: { targetDatetime: string }) {
  const [remaining, setRemaining] = useState({ d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    function update() {
      const diff = Math.max(0, new Date(targetDatetime).getTime() - Date.now());
      const s = Math.floor(diff / 1000);
      setRemaining({
        d: Math.floor(s / 86400),
        h: Math.floor((s % 86400) / 3600),
        m: Math.floor((s % 3600) / 60),
        s: s % 60,
      });
    }
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [targetDatetime]);

  return (
    <div className="flex gap-2 text-center">
      {(
        [
          ["d", remaining.d],
          ["h", remaining.h],
          ["m", remaining.m],
          ["s", remaining.s],
        ] as const
      ).map(([label, val]) => (
        <div key={label} className="flex flex-col">
          <span className="text-xl font-bold tabular-nums text-foreground">{String(val).padStart(2, "0")}</span>
          <span className="text-[10px] uppercase text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  );
}

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<TimerType>("datetime");
  const [targetDatetime, setTargetDatetime] = useState("");
  const [durationH, setDurationH] = useState(48);
  const [evergreenMin, setEvergreenMin] = useState(20);
  const [redirectUrl, setRedirectUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("El nombre es obligatorio");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        type,
        actionOnEnd: redirectUrl.trim() ? "redirect" : "hide",
        actionValue: redirectUrl.trim() || null,
      };
      if (type === "datetime") {
        if (!targetDatetime) {
          setError("Fecha objetivo obligatoria");
          setSaving(false);
          return;
        }
        body.targetDatetime = new Date(targetDatetime).toISOString();
      } else if (type === "duration") {
        body.durationSeconds = Math.max(1, durationH) * 3600;
      } else {
        body.evergreenSeconds = Math.max(1, evergreenMin) * 60;
      }

      const res = await fetch("/api/saas/countdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Nuevo temporizador</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            ✕
          </button>
        </div>
        <form onSubmit={(e) => void save(e)} className="space-y-4 p-6">
          {error && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Nombre *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Black Friday 2026"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Tipo</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(TYPE_LABEL) as TimerType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                    type === t
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {TYPE_LABEL[t]}
                </button>
              ))}
            </div>
          </div>
          {type === "datetime" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Fecha y hora objetivo</label>
              <input
                type="datetime-local"
                value={targetDatetime}
                onChange={(e) => setTargetDatetime(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                required
              />
            </div>
          )}
          {type === "duration" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Duración (horas)</label>
              <input
                type="number"
                min={1}
                max={720}
                value={durationH}
                onChange={(e) => setDurationH(Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          )}
          {type === "evergreen" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Minutos por visitante</label>
              <input
                type="number"
                min={1}
                max={10080}
                value={evergreenMin}
                onChange={(e) => setEvergreenMin(Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">URL de redirección (opcional)</label>
            <input
              value={redirectUrl}
              onChange={(e) => setRedirectUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">
              Cancelar
            </NelvyonDsButton>
            <NelvyonDsButton type="submit" disabled={saving} className="flex-1">
              {saving ? "Creando…" : "Crear temporizador"}
            </NelvyonDsButton>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SaasCountdownPage() {
  const [timers, setTimers] = useState<CountdownTimer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/countdown");
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      const d = (await res.json()) as { timers?: CountdownTimer[] };
      setTimers(d.timers ?? []);
    } catch (e) {
      setTimers([]);
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function copyEmbed(timer: CountdownTimer) {
    void navigator.clipboard.writeText(embedSnippet(timer.id));
    setCopiedId(timer.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  async function removeTimer(id: string) {
    if (!confirm("¿Eliminar este temporizador?")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/saas/countdown?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al eliminar");
    } finally {
      setBusyId(null);
    }
  }

  const totalScans = timers.reduce((s, t) => s + t.scans, 0);

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="countdown" />}>
      <div className="flex flex-col gap-6 pb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <NelvyonDsSectionHeader
            title="Temporizadores de Cuenta Atrás"
            subtitle="Crea urgencia en emails, landings y embudos con contadores personalizables"
          />
          <NelvyonDsButton onClick={() => setShowModal(true)}>+ Nuevo temporizador</NelvyonDsButton>
        </div>

        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <KpiTile icon="⏱️" label="Temporizadores" value={timers.length} />
          <KpiTile icon="👁️" label="Escaneos / vistas" value={totalScans.toLocaleString("es-ES")} accent />
          <KpiTile
            icon="📅"
            label="Fecha fija"
            value={timers.filter((t) => t.type === "datetime").length}
          />
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl bg-muted/30" />
            ))}
          </div>
        ) : timers.length === 0 ? (
          <NelvyonDsCard className="p-16 text-center">
            <p className="text-lg font-semibold text-foreground">Sin temporizadores</p>
            <p className="mt-2 text-sm text-muted-foreground">Crea el primero para embeberlo en landings o emails.</p>
            <NelvyonDsButton className="mt-5" onClick={() => setShowModal(true)}>
              + Crear temporizador
            </NelvyonDsButton>
          </NelvyonDsCard>
        ) : (
          <div className="space-y-4">
            {timers.map((timer) => (
              <NelvyonDsCard key={timer.id} className="p-5">
                <div className="flex flex-wrap items-start gap-4">
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-foreground">{timer.name}</h3>
                      <NelvyonDsBadge tone="primary">{TYPE_LABEL[timer.type]}</NelvyonDsBadge>
                      <NelvyonDsBadge tone="neutral">{timer.actionOnEnd}</NelvyonDsBadge>
                    </div>
                    {timer.type === "datetime" && timer.targetDatetime && (
                      <div className="flex flex-wrap items-center gap-3">
                        <LiveClock targetDatetime={timer.targetDatetime} />
                        <span className="text-xs text-muted-foreground">
                          hasta{" "}
                          {new Date(timer.targetDatetime).toLocaleString("es-ES", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    )}
                    {timer.type === "duration" && timer.durationSeconds != null && (
                      <p className="text-sm text-muted-foreground">
                        Duración: {(timer.durationSeconds / 3600).toFixed(1)}h desde el primer inicio
                      </p>
                    )}
                    {timer.type === "evergreen" && timer.evergreenSeconds != null && (
                      <p className="text-sm text-muted-foreground">
                        Cuenta regresiva: {Math.round(timer.evergreenSeconds / 60)} min por visitante
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/10 px-3 py-2">
                      <code className="flex-1 truncate text-xs text-muted-foreground">{embedSnippet(timer.id)}</code>
                      <button
                        type="button"
                        onClick={() => copyEmbed(timer)}
                        className="shrink-0 text-xs text-primary hover:underline"
                      >
                        {copiedId === timer.id ? "Copiado" : "Copiar"}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-right">
                      <p className="text-lg font-bold text-foreground">{timer.scans.toLocaleString("es-ES")}</p>
                      <p className="text-xs text-muted-foreground">escaneos</p>
                    </div>
                    <NelvyonDsButton
                      size="sm"
                      variant="ghost"
                      disabled={busyId === timer.id}
                      onClick={() => void removeTimer(timer.id)}
                    >
                      Eliminar
                    </NelvyonDsButton>
                  </div>
                </div>
              </NelvyonDsCard>
            ))}
          </div>
        )}

        {showModal && (
          <CreateModal
            onClose={() => setShowModal(false)}
            onCreated={() => void load()}
          />
        )}
      </div>
    </SaasShellLayout>
  );
}
