"use client";

import { useCallback, useEffect, useState } from "react";
import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";
import { KpiTile } from "@/features/saas-shell/components/SaasDashboardWidgets";

type ABStatus = "running" | "winner" | "paused";
type ABType = "email_subject" | "email_content" | "landing" | "cta";

interface ABVariant {
  id: string;
  name: string;
  label: string;
  sent: number;
  opens: number;
  clicks: number;
  conversions: number;
  winner: boolean;
}

interface ABTest {
  id: string;
  name: string;
  type: ABType;
  status: ABStatus;
  variants: ABVariant[];
  splitPercent: number;
  startedAt: string | null;
  endedAt: string | null;
  winnerMetric: "open_rate" | "click_rate" | "conversion_rate";
  confidence: number | null;
}

const STATUS_CONFIG: Record<ABStatus, { label: string; tone: "primary" | "success" | "warning" | "danger"; icon: string }> = {
  running: { label: "En ejecución", tone: "success", icon: "▶" },
  winner: { label: "Ganador declarado", tone: "primary", icon: "🏆" },
  paused: { label: "Pausado", tone: "warning", icon: "‖" },
};

const TYPE_LABEL: Record<ABType, string> = {
  email_subject: "Asunto de email", email_content: "Contenido email", landing: "Landing page", cta: "Botón CTA",
};

const UI_TO_API_TYPE: Record<ABType, string> = {
  email_subject: "subject_line",
  email_content: "content",
  landing: "content",
  cta: "from_name",
};

const API_TO_UI_TYPE: Record<string, ABType> = {
  subject_line: "email_subject",
  send_time: "email_subject",
  content: "email_content",
  from_name: "cta",
};

function mapAbTest(raw: Record<string, unknown>): ABTest {
  const variants = Array.isArray(raw.variants) ? raw.variants : [];
  const winnerId = raw.winnerVariantId ?? raw.winner_variant_id;
  const apiStatus = String(raw.status ?? "running");
  const status: ABStatus =
    apiStatus === "completed" ? "winner" : apiStatus === "paused" ? "paused" : "running";

  return {
    id: String(raw.id),
    name: String(raw.name),
    type: API_TO_UI_TYPE[String(raw.type)] ?? "email_subject",
    status,
    variants: variants.map((v: Record<string, unknown>, i: number) => ({
      id: String(v.id ?? `var_${i}`),
      name: String.fromCharCode(65 + i),
      label: String(v.label ?? v.value ?? ""),
      sent: Number(v.sends ?? v.sent ?? 0),
      opens: Number(v.opens ?? 0),
      clicks: Number(v.clicks ?? 0),
      conversions: 0,
      winner: winnerId != null && String(v.id) === String(winnerId),
    })),
    splitPercent: 50,
    startedAt: raw.createdAt != null ? String(raw.createdAt) : null,
    endedAt: null,
    winnerMetric: "open_rate",
    confidence: raw.confidence != null ? Number(raw.confidence) : null,
  };
}

function CreateAbTestModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<ABType>("email_subject");
  const [variantA, setVariantA] = useState("");
  const [variantB, setVariantB] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/ab-testing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          type: UI_TO_API_TYPE[type],
          variants: [
            { label: "A", value: variantA.trim() },
            { label: "B", value: variantB.trim() },
          ],
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
        throw new Error(body?.message ?? body?.error ?? `Error ${res.status}`);
      }
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear test");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Nuevo test A/B</h2>
          <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <form onSubmit={save} className="space-y-4 p-6">
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Nombre *</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ej: Asunto newsletter Q3"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Tipo</label>
            <select
              value={type}
              onChange={e => setType(e.target.value as ABType)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
            >
              {(Object.keys(TYPE_LABEL) as ABType[]).map(t => (
                <option key={t} value={t}>{TYPE_LABEL[t]}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Variante A *</label>
              <input
                value={variantA}
                onChange={e => setVariantA(e.target.value)}
                placeholder="Texto variante A"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Variante B *</label>
              <input
                value={variantB}
                onChange={e => setVariantB(e.target.value)}
                placeholder="Texto variante B"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</NelvyonDsButton>
            <NelvyonDsButton type="submit" disabled={saving || !name.trim() || !variantA.trim() || !variantB.trim()} className="flex-1">
              {saving ? "Creando…" : "Crear test"}
            </NelvyonDsButton>
          </div>
        </form>
      </div>
    </div>
  );
}

function pct(n: number, d: number) { return d > 0 ? `${((n / d) * 100).toFixed(1)}%` : "—"; }

function VariantBar({ variant, metric, total: _total, isWinner }: { variant: ABVariant; metric: "open_rate" | "click_rate" | "conversion_rate"; total: number; isWinner: boolean }) {
  const value = metric === "open_rate" ? variant.opens / variant.sent : metric === "click_rate" ? variant.clicks / variant.opens || 0 : variant.conversions / variant.sent;
  const display = metric === "open_rate" ? pct(variant.opens, variant.sent) : metric === "click_rate" ? pct(variant.clicks, variant.opens) : pct(variant.conversions, variant.sent);
  const pctWidth = Math.min(100, value * 100 * 2);

  return (
    <div className={`rounded-xl border p-4 transition-all ${isWinner ? "border-primary bg-primary/10" : "border-border"}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${isWinner ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground"}`}>
              {variant.name}
            </span>
            {isWinner && <span className="text-xs text-primary font-medium">🏆 Ganador</span>}
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground max-w-72 italic">&ldquo;{variant.label}&rdquo;</p>
        </div>
        <p className={`text-2xl font-bold ${isWinner ? "text-primary" : "text-foreground"}`}>{display}</p>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full transition-all ${isWinner ? "bg-primary" : "bg-muted-foreground/40"}`} style={{ width: `${pctWidth}%` }} />
      </div>
      <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
        <span>{variant.sent.toLocaleString()} enviados</span>
        <span>{variant.opens.toLocaleString()} aperturas</span>
        <span>{variant.clicks} clics</span>
        <span>{variant.conversions} conv.</span>
      </div>
    </div>
  );
}

export default function SaasABTestingPage() {
  const [tests, setTests] = useState<ABTest[]>([]);
  const [filterStatus, setFilterStatus] = useState<ABStatus | "all">("all");
  const [showModal, setShowModal] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch("/api/saas/ab-testing");
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const d = (await res.json()) as { tests?: Record<string, unknown>[] };
      setTests((d.tests ?? []).map(mapAbTest));
    } catch (e) {
      setTests([]);
      setLoadError(e instanceof Error ? e.message : "Error al cargar tests");
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function declareWinner(id: string) {
    setBusyId(id);
    setActionError(null);
    try {
      const res = await fetch("/api/saas/ab-testing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "declare_winner", id }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Error al declarar ganador");
    } finally {
      setBusyId(null);
    }
  }

  const filtered = tests.filter(t => filterStatus === "all" || t.status === filterStatus);
  const completed = tests.filter(t => t.status === "winner");
  const avgConfidence =
    completed.length > 0
      ? Math.round(
          completed.reduce((s, t) => s + (t.confidence ?? 0), 0) / completed.length,
        )
      : null;

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="ab-testing" />}>
      <div className="flex flex-col gap-6 pb-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <NelvyonDsSectionHeader title="A/B Testing" subtitle="Prueba variantes de emails, landings y CTAs para optimizar conversiones" />
              <NelvyonDsButton onClick={() => setShowModal(true)}>+ Nuevo test</NelvyonDsButton>
            </div>

            {(loadError || actionError) && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive" role="alert">
                {actionError ?? loadError}
              </p>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <KpiTile icon="▶" label="Tests activos" value={tests.filter(t => t.status === "running").length} accent />
              <KpiTile icon="🏆" label="Completados" value={completed.length} />
              <KpiTile icon="🧬" label="Total variantes" value={tests.reduce((s, t) => s + t.variants.length, 0)} />
              <KpiTile
                icon="📊"
                label="Confianza media"
                value={avgConfidence != null ? `${avgConfidence}%` : "—"}
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              {(["all", "running", "winner", "paused"] as const).map(s => (
                <button key={s} type="button" onClick={() => setFilterStatus(s)}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filterStatus === s ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:text-foreground"}`}>
                  {s === "all" ? "Todos" : STATUS_CONFIG[s].label}
                </button>
              ))}
            </div>

            <div className="space-y-5">
              {filtered.length === 0 ? (
                <NelvyonDsCard className="p-12 text-center text-sm text-muted-foreground">
                  {tests.length === 0 ? "Sin tests A/B. Crea el primero." : "Ningún test en este filtro."}
                </NelvyonDsCard>
              ) : filtered.map(test => {
                const sc = STATUS_CONFIG[test.status];
                return (
                  <NelvyonDsCard key={test.id} className="overflow-hidden p-0">
                    <div className="flex flex-wrap items-start gap-3 p-5">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-foreground">{test.name}</h3>
                          <NelvyonDsBadge tone={sc.tone}>{sc.icon} {sc.label}</NelvyonDsBadge>
                          <span className="rounded-md bg-muted/30 px-2 py-0.5 text-xs text-muted-foreground">{TYPE_LABEL[test.type]}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Métrica: <strong className="text-foreground">{test.winnerMetric === "open_rate" ? "Tasa apertura" : test.winnerMetric === "click_rate" ? "Tasa clic" : "Tasa conversión"}</strong>
                          {test.confidence !== null && <> · Confianza: <strong className={test.confidence >= 95 ? "text-success" : "text-warning"}>{test.confidence}%</strong></>}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {test.status === "running" && (
                          <NelvyonDsButton
                            className="text-xs"
                            disabled={busyId === test.id}
                            onClick={() => void declareWinner(test.id)}
                          >
                            🏆 Declarar ganador
                          </NelvyonDsButton>
                        )}
                      </div>
                    </div>
                    <div className="grid gap-3 border-t border-border p-5 sm:grid-cols-2">
                      {test.variants.map(v => (
                        <VariantBar key={v.id} variant={v} metric={test.winnerMetric} total={v.sent} isWinner={v.winner} />
                      ))}
                    </div>
                  </NelvyonDsCard>
                );
              })}
            </div>
      {showModal && (
        <CreateAbTestModal
          onClose={() => setShowModal(false)}
          onCreated={() => void load()}
        />
      )}
      </div>
    </SaasShellLayout>
  );
}
