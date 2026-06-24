"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

type TimerType = "datetime" | "duration" | "evergreen";

interface CountdownTimer {
  id: string;
  name: string;
  type: TimerType;
  targetDate: string | null;
  durationMinutes: number | null;
  evergreenMinutes: number | null;
  redirectUrl: string | null;
  theme: "dark" | "light" | "minimal";
  embedCode: string;
  active: boolean;
  views: number;
  createdAt: string;
}

const TYPE_LABEL: Record<TimerType, string> = {
  datetime: "Fecha fija",
  duration: "Duración fija",
  evergreen: "Evergreen (por visitante)",
};

const THEMES = ["dark", "light", "minimal"] as const;


function LiveClock({ targetDate }: { targetDate: string }) {
  const [remaining, setRemaining] = useState({ d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    function update() {
      const diff = Math.max(0, new Date(targetDate).getTime() - Date.now());
      const s = Math.floor(diff / 1000);
      setRemaining({ d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 });
    }
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [targetDate]);

  return (
    <div className="flex gap-2 text-center">
      {[["d", remaining.d], ["h", remaining.h], ["m", remaining.m], ["s", remaining.s]].map(([label, val]) => (
        <div key={label as string} className="flex flex-col">
          <span className="text-xl font-bold tabular-nums text-foreground">{String(val).padStart(2, "0")}</span>
          <span className="text-[10px] text-muted-foreground uppercase">{label}</span>
        </div>
      ))}
    </div>
  );
}

function CreateModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<TimerType>("datetime");
  const [targetDate, setTargetDate] = useState("");
  const [durationH, setDurationH] = useState(48);
  const [evergreenMin, setEvergreenMin] = useState(20);
  const [theme, setTheme] = useState<"dark" | "light" | "minimal">("dark");
  const [redirectUrl, setRedirectUrl] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch("/api/saas/countdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type, targetDate: type === "datetime" ? targetDate : null, durationMinutes: type === "duration" ? durationH * 60 : null, evergreenMinutes: type === "evergreen" ? evergreenMin : null, theme, redirectUrl }),
      });
      onClose();
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Nuevo temporizador</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <form onSubmit={save} className="space-y-4 p-6">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Nombre *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Black Friday 2026"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Tipo</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(TYPE_LABEL) as TimerType[]).map(t => (
                <button key={t} type="button" onClick={() => setType(t)}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${type === t ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50"}`}>
                  {TYPE_LABEL[t]}
                </button>
              ))}
            </div>
          </div>
          {type === "datetime" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Fecha y hora objetivo</label>
              <input type="datetime-local" value={targetDate} onChange={e => setTargetDate(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
          )}
          {type === "duration" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Duración (horas)</label>
              <input type="number" min={1} max={720} value={durationH} onChange={e => setDurationH(Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
          )}
          {type === "evergreen" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Minutos por visitante</label>
              <input type="number" min={1} max={10080} value={evergreenMin} onChange={e => setEvergreenMin(Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Tema visual</label>
            <div className="flex gap-2">
              {THEMES.map(th => (
                <button key={th} type="button" onClick={() => setTheme(th)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-xs capitalize font-medium transition-colors ${theme === th ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                  {th}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">URL de redirección (opcional)</label>
            <input value={redirectUrl} onChange={e => setRedirectUrl(e.target.value)} placeholder="https://..."
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</NelvyonDsButton>
            <NelvyonDsButton type="submit" disabled={saving} className="flex-1">{saving ? "Creando…" : "Crear temporizador"}</NelvyonDsButton>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SaasCountdownPage() {
  const [timers, setTimers] = useState<CountdownTimer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/saas/countdown");
      if (res.ok) {
        const d = (await res.json()) as { timers?: CountdownTimer[] };
        setTimers(d.timers ?? []);
      } else setTimers([]);
    } catch { setTimers([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function copyEmbed(timer: CountdownTimer) {
    void navigator.clipboard.writeText(timer.embedCode);
    setCopiedId(timer.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="countdown" />}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <NelvyonDsSectionHeader title="Temporizadores de Cuenta Atrás" subtitle="Crea urgencia en tus emails, landings y embudos con contadores personalizables" />
              <NelvyonDsButton onClick={() => setShowModal(true)}>+ Nuevo temporizador</NelvyonDsButton>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Temporizadores activos", value: timers.filter(t => t.active).length },
                { label: "Total vistas", value: timers.reduce((s, t) => s + t.views, 0).toLocaleString("es-ES") },
                { label: "Total creados", value: timers.length },
              ].map(({ label, value }) => (
                <NelvyonDsCard key={label} className="p-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
                </NelvyonDsCard>
              ))}
            </div>

            {loading ? (
              <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-40 animate-pulse rounded-xl bg-muted/30" />)}</div>
            ) : timers.length === 0 ? (
              <NelvyonDsCard className="p-16 text-center">
                <p className="text-5xl">⏱️</p>
                <p className="mt-4 text-lg font-semibold text-foreground">Sin temporizadores</p>
                <p className="mt-2 text-sm text-muted-foreground">Los temporizadores crean urgencia y aumentan las conversiones hasta un 27%</p>
                <NelvyonDsButton className="mt-5" onClick={() => setShowModal(true)}>+ Crear temporizador</NelvyonDsButton>
              </NelvyonDsCard>
            ) : (
              <div className="space-y-4">
                {timers.map(timer => (
                  <NelvyonDsCard key={timer.id} className="p-5">
                    <div className="flex flex-wrap items-start gap-4">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-foreground">{timer.name}</h3>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${timer.active ? "bg-green-500/10 text-green-400" : "bg-muted/30 text-muted-foreground"}`}>
                            {timer.active ? "Activo" : "Inactivo"}
                          </span>
                          <span className="rounded-md bg-muted/30 px-2 py-0.5 text-xs text-muted-foreground">{TYPE_LABEL[timer.type]}</span>
                          <span className="rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground capitalize">{timer.theme}</span>
                        </div>
                        {timer.type === "datetime" && timer.targetDate && (
                          <div className="flex items-center gap-3">
                            <LiveClock targetDate={timer.targetDate} />
                            <span className="text-xs text-muted-foreground">hasta {new Date(timer.targetDate).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}</span>
                          </div>
                        )}
                        {timer.type === "duration" && timer.durationMinutes && (
                          <p className="text-sm text-muted-foreground">Duración: {timer.durationMinutes / 60}h desde el primer inicio</p>
                        )}
                        {timer.type === "evergreen" && timer.evergreenMinutes && (
                          <p className="text-sm text-muted-foreground">Cuenta regresiva: {timer.evergreenMinutes} min por visitante único</p>
                        )}
                        <div className="flex items-center gap-1.5 rounded-lg border border-border bg-muted/10 px-3 py-2">
                          <code className="flex-1 truncate text-xs text-muted-foreground">{timer.embedCode}</code>
                          <button onClick={() => copyEmbed(timer)} className="shrink-0 text-xs text-primary hover:underline">
                            {copiedId === timer.id ? "✓ Copiado" : "Copiar"}
                          </button>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-foreground">{timer.views.toLocaleString("es-ES")}</p>
                        <p className="text-xs text-muted-foreground">vistas</p>
                      </div>
                    </div>
                  </NelvyonDsCard>
                ))}
              </div>
            )}
      {showModal && <CreateModal onClose={() => { setShowModal(false); void load(); }} />}
    </SaasShellLayout>
  );
}
