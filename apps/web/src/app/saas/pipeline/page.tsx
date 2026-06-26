"use client";

import { useCallback, useEffect, useState } from "react";
import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

// ── Types ─────────────────────────────────────────────────────────────────────
type DealStage = "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";
type QuoteStatus = "draft" | "sent" | "accepted" | "rejected" | "expired";
type PlaybookActionType = "task" | "email" | "call" | "note" | "wait";

interface Deal {
  id: string; tenantId: string; contactId: string | null; title: string; value: number;
  currency: string; stage: DealStage; probability: number;
  expectedCloseDate: string | null; source: string | null; ownerUserId: string | null;
  notes: string | null; createdAt: string; updatedAt: string;
}
interface ForecastStage { stage: DealStage; count: number; value: number; weightedValue: number; probability: number }
interface Forecast { weightedTotal: number; bestCase: number; committed: number; byStage: ForecastStage[] }
interface PlaybookAction { id: string; actionType: PlaybookActionType; title: string; description: string | null; template: string | null; waitDays: number | null; sortOrder: number }
interface Playbook { id: string; name: string; stage: DealStage; description: string | null; active: boolean; actions: PlaybookAction[] }
interface QuoteItem { description: string; quantity: number; unitPrice: number; subtotal: number }
interface Quote { id: string; quoteNumber: string; title: string; clientName: string; clientEmail: string | null; currency: string; subtotal: number; discountPct: number; taxPct: number; taxAmount: number; total: number; status: QuoteStatus; dealId: string | null; validUntil: string | null; items: QuoteItem[]; createdAt: string }

const STAGE_LABELS: Record<DealStage, string> = { new: "Nuevo", contacted: "Contactado", qualified: "Calificado", proposal: "Propuesta", won: "Ganado", lost: "Perdido" };
const STAGE_COLORS: Record<DealStage, string> = { new: "bg-blue-500/10 text-blue-400", contacted: "bg-cyan-500/10 text-cyan-400", qualified: "bg-purple-500/10 text-purple-400", proposal: "bg-amber-500/10 text-amber-400", won: "bg-green-500/10 text-green-400", lost: "bg-red-500/10 text-red-400" };
const QUOTE_STATUS_LABEL: Record<QuoteStatus, string> = { draft: "Borrador", sent: "Enviado", accepted: "Aceptado", rejected: "Rechazado", expired: "Expirado" };
const QUOTE_TONE: Record<QuoteStatus, "success" | "warning" | "danger" | "primary"> = { draft: "primary", sent: "warning", accepted: "success", rejected: "danger", expired: "danger" };
const ACTION_ICON: Record<PlaybookActionType, string> = { task: "✅", email: "📧", call: "📞", note: "📝", wait: "⏳" };
const fmt = (n: number, currency = "EUR") => new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(n);

type Tab = "forecast" | "deals" | "playbooks" | "quotes" | "contratos";

interface Contract {
  id: string; contractNumber: string; title: string;
  clientName: string; clientEmail: string;
  currency: string; amount: number; status: string;
  createdAt: string; signedAt: string | null;
}

// ── Quote Create Modal ────────────────────────────────────────────────────────
function QuoteModal({ deal, onClose, onCreated }: { deal?: Deal; onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState(deal ? `Presupuesto — ${deal.title}` : "");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [taxPct, setTaxPct] = useState(21);
  const [discountPct, setDiscountPct] = useState(0);
  const [items, setItems] = useState([{ description: "", quantity: 1, unitPrice: 0 }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addItem() { setItems(p => [...p, { description: "", quantity: 1, unitPrice: 0 }]); }
  function updateItem(i: number, field: string, val: string | number) {
    setItems(p => p.map((it, idx) => idx === i ? { ...it, [field]: val } : it));
  }
  function removeItem(i: number) { setItems(p => p.filter((_, idx) => idx !== i)); }

  const subtotal = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  const discountAmt = subtotal * discountPct / 100;
  const taxAmt = (subtotal - discountAmt) * taxPct / 100;
  const total = subtotal - discountAmt + taxAmt;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !clientName.trim()) { setError("Título y nombre de cliente son obligatorios"); return; }
    if (items.some(it => !it.description.trim())) { setError("Todos los ítems necesitan descripción"); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/saas/quotes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: title.trim(), clientName: clientName.trim(), clientEmail: clientEmail.trim() || null, dealId: deal?.id ?? null, taxPct, discountPct, items }) });
      const d = await res.json() as { error?: string };
      if (!res.ok) { setError(d.error ?? "Error al crear presupuesto"); return; }
      onCreated(); onClose();
    } finally { setSaving(false); }
  }

  const inp = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none";
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Nuevo presupuesto</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <form onSubmit={save} className="space-y-4 p-6">
          {error && <p className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Título *</label><input value={title} onChange={e => setTitle(e.target.value)} className={inp} /></div>
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Cliente *</label><input value={clientName} onChange={e => setClientName(e.target.value)} className={inp} /></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Email cliente</label><input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} className={inp} /></div>
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">IVA %</label><input type="number" value={taxPct} onChange={e => setTaxPct(Number(e.target.value))} min={0} max={100} className={inp} /></div>
            <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Descuento %</label><input type="number" value={discountPct} onChange={e => setDiscountPct(Number(e.target.value))} min={0} max={100} className={inp} /></div>
          </div>
          <div>
            <div className="mb-2 flex items-center justify-between"><label className="text-xs font-medium text-muted-foreground">Líneas de presupuesto</label><button type="button" onClick={addItem} className="text-xs text-primary hover:underline">+ Añadir línea</button></div>
            <div className="space-y-2">
              {items.map((it, i) => (
                <div key={i} className="grid gap-2 sm:grid-cols-[1fr_80px_100px_28px]">
                  <input value={it.description} onChange={e => updateItem(i, "description", e.target.value)} placeholder="Descripción" className={inp} />
                  <input type="number" value={it.quantity} onChange={e => updateItem(i, "quantity", Number(e.target.value))} min={0.01} step={0.01} className={inp} />
                  <input type="number" value={it.unitPrice} onChange={e => updateItem(i, "unitPrice", Number(e.target.value))} min={0} step={0.01} className={inp} />
                  <button type="button" onClick={() => removeItem(i)} className="text-muted-foreground hover:text-red-400">✕</button>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-1 border-t border-border pt-3 text-right text-sm">
            <p className="text-muted-foreground">Subtotal: <span className="text-foreground">{fmt(subtotal)}</span></p>
            {discountPct > 0 && <p className="text-muted-foreground">Descuento ({discountPct}%): <span className="text-red-400">-{fmt(discountAmt)}</span></p>}
            <p className="text-muted-foreground">IVA ({taxPct}%): <span className="text-foreground">{fmt(taxAmt)}</span></p>
            <p className="text-lg font-bold text-foreground">Total: {fmt(total)}</p>
          </div>
          <div className="flex gap-3 pt-2">
            <NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</NelvyonDsButton>
            <NelvyonDsButton type="submit" disabled={saving} className="flex-1">{saving ? "Guardando…" : "Crear presupuesto"}</NelvyonDsButton>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Playbook Create Modal ─────────────────────────────────────────────────────
function PlaybookModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [stage, setStage] = useState<DealStage>("new");
  const [description, setDescription] = useState("");
  const [actions, setActions] = useState<Array<{ actionType: PlaybookActionType; title: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addAction() { setActions(p => [...p, { actionType: "task", title: "" }]); }
  const inp = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Nombre obligatorio"); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/saas/playbooks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), stage, description: description.trim() || undefined, actions: actions.filter(a => a.title.trim()) }) });
      const d = await res.json() as { error?: string };
      if (!res.ok) { setError(d.error ?? "Error"); return; }
      onCreated(); onClose();
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Nuevo playbook</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <form onSubmit={save} className="space-y-4 p-6">
          {error && <p className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}
          <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Nombre *</label><input value={name} onChange={e => setName(e.target.value)} className={inp} /></div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Etapa del pipeline</label>
            <select value={stage} onChange={e => setStage(e.target.value as DealStage)} className={inp}>
              {(["new","contacted","qualified","proposal"] as DealStage[]).map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
            </select>
          </div>
          <div><label className="mb-1 block text-xs font-medium text-muted-foreground">Descripción</label><input value={description} onChange={e => setDescription(e.target.value)} className={inp} /></div>
          {actions.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Acciones</label>
              {actions.map((a, i) => (
                <div key={i} className="flex gap-2">
                  <select value={a.actionType} onChange={e => setActions(p => p.map((x, j) => j === i ? { ...x, actionType: e.target.value as PlaybookActionType } : x))} className="rounded-lg border border-border bg-background px-2 py-2 text-xs text-foreground">
                    {(["task","email","call","note","wait"] as PlaybookActionType[]).map(t => <option key={t} value={t}>{ACTION_ICON[t]} {t}</option>)}
                  </select>
                  <input value={a.title} onChange={e => setActions(p => p.map((x, j) => j === i ? { ...x, title: e.target.value } : x))} placeholder="Título de la acción" className={`${inp} flex-1`} />
                  <button type="button" onClick={() => setActions(p => p.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-red-400">✕</button>
                </div>
              ))}
            </div>
          )}
          <button type="button" onClick={addAction} className="text-xs text-primary hover:underline">+ Añadir acción</button>
          <div className="flex gap-3 pt-2">
            <NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</NelvyonDsButton>
            <NelvyonDsButton type="submit" disabled={saving} className="flex-1">{saving ? "Guardando…" : "Crear playbook"}</NelvyonDsButton>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function SaasPipelinePage() {
  const [tab, setTab] = useState<Tab>("forecast");
  const [deals, setDeals] = useState<Deal[]>([]);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [showQuoteModal, setShowQuoteModal] = useState(false);
  const [showPlaybookModal, setShowPlaybookModal] = useState(false);
  const [quoteDeal, setQuoteDeal] = useState<Deal | undefined>(undefined);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [contractLoading, setContractLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [dealsRes, forecastRes, playbooksRes, quotesRes] = await Promise.all([
        fetch("/api/saas/deals"),
        fetch("/api/saas/playbooks?resource=forecast"),
        fetch("/api/saas/playbooks"),
        fetch("/api/saas/quotes"),
      ]);
      if (dealsRes.ok) { const d = await dealsRes.json() as { deals?: Deal[] }; setDeals(d.deals ?? []); }
      if (forecastRes.ok) { const d = await forecastRes.json() as { forecast?: Forecast }; setForecast(d.forecast ?? null); }
      if (playbooksRes.ok) { const d = await playbooksRes.json() as { playbooks?: Playbook[] }; setPlaybooks(d.playbooks ?? []); }
      if (quotesRes.ok) { const d = await quotesRes.json() as { quotes?: Quote[] }; setQuotes(d.quotes ?? []); }
      const contractsRes = await fetch("/api/saas/contracts");
      if (contractsRes.ok) { const d = await contractsRes.json() as { contracts?: Contract[] }; setContracts(d.contracts ?? []); }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function deletePlaybook(id: string) {
    await fetch("/api/saas/playbooks", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id }) });
    void load();
  }

  async function updateQuoteStatus(id: string, status: QuoteStatus) {
    await fetch("/api/saas/quotes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "update-status", id, status }) });
    void load();
  }

  const openDeals = deals.filter(d => d.stage !== "won" && d.stage !== "lost");
  const wonDeals = deals.filter(d => d.stage === "won");

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="pipeline" />}>
      <div className="flex flex-col gap-6 pb-8">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <NelvyonDsSectionHeader title="Sales Hub — Pipeline" subtitle="Forecast ponderado, playbooks por etapa y presupuestos CPQ" />
          <div className="flex gap-2">
            {tab === "quotes" && <NelvyonDsButton onClick={() => { setQuoteDeal(undefined); setShowQuoteModal(true); }}>+ Presupuesto</NelvyonDsButton>}
          {tab === "contratos" && <NelvyonDsButton onClick={() => { void (async () => { setContractLoading(true); const r = await fetch("/api/saas/contracts"); if (r.ok) { const d = await r.json() as { contracts?: Contract[] }; setContracts(d.contracts ?? []); } setContractLoading(false); })(); }}>↻ Actualizar</NelvyonDsButton>}
            {tab === "playbooks" && <NelvyonDsButton onClick={() => setShowPlaybookModal(true)}>+ Playbook</NelvyonDsButton>}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Deals activos",    value: String(openDeals.length) },
            { label: "Pipeline bruto",   value: fmt(openDeals.reduce((s, d) => s + d.value, 0)) },
            { label: "Forecast weighted",value: fmt(forecast?.weightedTotal ?? 0) },
            { label: "Won este periodo", value: String(wonDeals.length) },
          ].map(({ label, value }) => (
            <NelvyonDsCard key={label} className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-xl font-bold text-foreground">{value}</p>
            </NelvyonDsCard>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-border" data-testid="pipeline-tabs">
          {(["forecast", "deals", "playbooks", "quotes", "contratos"] as Tab[]).map(t => (
            <button
              key={t}
              type="button"
              data-testid={`pipeline-tab-${t}`}
              data-active={tab === t ? "true" : "false"}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 ${tab === t ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
              {t === "forecast" ? "📊 Forecast" : t === "deals" ? `💼 Deals (${deals.length})` : t === "playbooks" ? `📋 Playbooks (${playbooks.length})` : t === "quotes" ? `📄 Presupuestos (${quotes.length})` : `📝 Contratos (${contracts.length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3" data-testid="pipeline-loading">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/30" />)}</div>
        ) : (
          <>
            {/* ── FORECAST ── */}
            {tab === "forecast" && (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { label: "Weighted Forecast", value: fmt(forecast?.weightedTotal ?? 0), sub: "Prob. ponderada", color: "text-primary" },
                    { label: "Best Case",          value: fmt(forecast?.bestCase ?? 0),      sub: "Si todos cierran", color: "text-green-400" },
                    { label: "Committed",          value: fmt(forecast?.committed ?? 0),     sub: "Prob. ≥ 75%",     color: "text-amber-400" },
                  ].map(({ label, value, sub, color }) => (
                    <NelvyonDsCard key={label} className="p-5">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
                    </NelvyonDsCard>
                  ))}
                </div>

                {forecast && forecast.byStage.length > 0 ? (
                  <NelvyonDsCard className="p-5">
                    <h3 className="mb-4 text-sm font-semibold text-foreground">Pipeline por etapa (weighted)</h3>
                    <div className="space-y-3">
                      {forecast.byStage.map(s => (
                        <div key={s.stage}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${STAGE_COLORS[s.stage]}`}>{STAGE_LABELS[s.stage]}</span>
                              <span className="text-xs text-muted-foreground">{s.count} deal{s.count !== 1 ? "s" : ""} · {s.probability}% prob.</span>
                            </div>
                            <div className="text-right text-xs">
                              <span className="text-muted-foreground">{fmt(s.value)} → </span>
                              <span className="font-semibold text-foreground">{fmt(s.weightedValue)}</span>
                            </div>
                          </div>
                          {forecast.bestCase > 0 && (
                            <div className="h-1.5 rounded-full bg-muted/30">
                              <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, (s.weightedValue / forecast.bestCase) * 100)}%` }} />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </NelvyonDsCard>
                ) : (
                  <NelvyonDsCard className="p-12 text-center">
                    <p className="text-3xl">📊</p>
                    <p className="mt-3 text-sm text-muted-foreground">Sin datos de forecast. Crea deals en el pipeline para verlos aquí.</p>
                  </NelvyonDsCard>
                )}
              </div>
            )}

            {/* ── DEALS ── */}
            {tab === "deals" && (
              deals.length === 0 ? (
                <NelvyonDsCard className="p-12 text-center">
                  <p className="text-3xl">💼</p>
                  <p className="mt-3 text-sm text-muted-foreground">Sin deals. Crea deals desde el CRM para verlos aquí.</p>
                </NelvyonDsCard>
              ) : (
                <div className="space-y-2">
                  {deals.map(deal => (
                    <NelvyonDsCard key={deal.id} className="flex flex-wrap items-center gap-4 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-foreground text-sm">{deal.title}</p>
                          <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${STAGE_COLORS[deal.stage]}`}>{STAGE_LABELS[deal.stage]}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">Prob: {deal.probability}% · {deal.expectedCloseDate ? `Cierre: ${new Date(deal.expectedCloseDate).toLocaleDateString("es-ES")}` : "Sin fecha"}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-foreground">{fmt(deal.value, deal.currency)}</p>
                        <p className="text-xs text-muted-foreground">Forecast: {fmt(deal.value * deal.probability / 100, deal.currency)}</p>
                      </div>
                      <NelvyonDsButton variant="ghost" className="text-xs shrink-0" onClick={() => { setQuoteDeal(deal); setShowQuoteModal(true); }}>+ Presupuesto</NelvyonDsButton>
                    </NelvyonDsCard>
                  ))}
                </div>
              )
            )}

            {/* ── PLAYBOOKS ── */}
            {tab === "playbooks" && (
              playbooks.length === 0 ? (
                <NelvyonDsCard className="p-12 text-center">
                  <p className="text-3xl">📋</p>
                  <p className="mt-3 text-lg font-semibold text-foreground">Sin playbooks</p>
                  <p className="mt-1 text-sm text-muted-foreground">Crea templates de acciones para cada etapa del pipeline</p>
                  <NelvyonDsButton className="mt-5" onClick={() => setShowPlaybookModal(true)}>+ Crear playbook</NelvyonDsButton>
                </NelvyonDsCard>
              ) : (
                <div className="space-y-3">
                  {playbooks.map(pb => (
                    <NelvyonDsCard key={pb.id} className="p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-foreground">{pb.name}</p>
                            <span className={`rounded-md px-2 py-0.5 text-xs font-medium ${STAGE_COLORS[pb.stage]}`}>{STAGE_LABELS[pb.stage]}</span>
                            {!pb.active && <NelvyonDsBadge tone="warning">Inactivo</NelvyonDsBadge>}
                          </div>
                          {pb.description && <p className="text-xs text-muted-foreground mt-1">{pb.description}</p>}
                          {pb.actions.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {pb.actions.map(a => (
                                <span key={a.id} className="flex items-center gap-1 rounded-lg bg-muted/20 px-2 py-1 text-xs text-muted-foreground">
                                  {ACTION_ICON[a.actionType]} {a.title}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <button onClick={() => void deletePlaybook(pb.id)} className="text-xs text-muted-foreground hover:text-red-400 shrink-0">Eliminar</button>
                      </div>
                    </NelvyonDsCard>
                  ))}
                </div>
              )
            )}

            {/* ── QUOTES ── */}
            {tab === "quotes" && (
              quotes.length === 0 ? (
                <NelvyonDsCard className="p-12 text-center">
                  <p className="text-3xl">📄</p>
                  <p className="mt-3 text-lg font-semibold text-foreground">Sin presupuestos</p>
                  <p className="mt-1 text-sm text-muted-foreground">Crea presupuestos profesionales vinculados a tus deals</p>
                  <NelvyonDsButton className="mt-5" onClick={() => { setQuoteDeal(undefined); setShowQuoteModal(true); }}>+ Crear presupuesto</NelvyonDsButton>
                </NelvyonDsCard>
              ) : (
                <div className="space-y-3">
                  {quotes.map(q => (
                    <NelvyonDsCard key={q.id} className="p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-foreground text-sm">{q.title}</p>
                            <span className="text-xs text-muted-foreground font-mono">{q.quoteNumber}</span>
                            <NelvyonDsBadge tone={QUOTE_TONE[q.status]}>{QUOTE_STATUS_LABEL[q.status]}</NelvyonDsBadge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">{q.clientName}{q.clientEmail ? ` · ${q.clientEmail}` : ""}</p>
                          <p className="text-xs text-muted-foreground">IVA {q.taxPct}%{q.discountPct > 0 ? ` · Dto. ${q.discountPct}%` : ""} · {q.items.length} ítem{q.items.length !== 1 ? "s" : ""}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <p className="font-bold text-foreground">{fmt(q.total, q.currency)}</p>
                            {q.validUntil && <p className="text-xs text-muted-foreground">Válido hasta {new Date(q.validUntil).toLocaleDateString("es-ES")}</p>}
                          </div>
                          <div className="flex flex-col gap-1">
                            <a href={`/api/saas/quotes/${q.id}/pdf`} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">Ver PDF →</a>
                            {q.status === "draft" && <button onClick={() => void updateQuoteStatus(q.id, "sent")} className="text-xs text-muted-foreground hover:text-foreground">Marcar enviado</button>}
                            {q.status === "sent" && <button onClick={() => void updateQuoteStatus(q.id, "accepted")} className="text-xs text-green-400 hover:text-green-300">Aceptar</button>}
                          </div>
                        </div>
                      </div>
                    </NelvyonDsCard>
                  ))}
                </div>
              )
            )}

            {/* ── CONTRATOS ── */}
            {tab === "contratos" && (
              contractLoading ? (
                <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/30" />)}</div>
              ) : contracts.length === 0 ? (
                <NelvyonDsCard className="p-12 text-center">
                  <p className="text-3xl">📝</p>
                  <p className="mt-3 text-lg font-semibold text-foreground">Sin contratos</p>
                  <p className="mt-1 text-sm text-muted-foreground">Convierte un presupuesto aceptado en contrato para solicitar la firma</p>
                </NelvyonDsCard>
              ) : (
                <div className="space-y-3">
                  {contracts.map(c => {
                    const statusTone: Record<string, "success" | "primary" | "warning" | "neutral" | "danger"> = {
                      active: "success", signed: "primary", sent: "warning",
                      draft: "neutral", expired: "danger", cancelled: "danger",
                    };
                    const statusLabel: Record<string, string> = {
                      draft: "Borrador", sent: "Enviado", signed: "Firmado",
                      active: "Activo", expired: "Vencido", cancelled: "Cancelado",
                    };
                    return (
                      <NelvyonDsCard key={c.id} className="p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-medium text-foreground text-sm">{c.title}</p>
                              <span className="text-xs text-muted-foreground font-mono" data-testid={`contract-number-${c.id}`}>{c.contractNumber}</span>
                              <NelvyonDsBadge tone={statusTone[c.status] ?? "default"}>{statusLabel[c.status] ?? c.status}</NelvyonDsBadge>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">{c.clientName} · {c.clientEmail}</p>
                            {c.signedAt && <p className="text-xs text-green-400 mt-0.5">Firmado {new Date(c.signedAt).toLocaleDateString("es-ES")}</p>}
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <p className="font-bold text-foreground">{fmt(c.amount, c.currency)}</p>
                            {c.status === "draft" && (
                              <button
                                onClick={() => void fetch(`/api/saas/contracts/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "send" }) }).then(() => void load())}
                                className="text-xs text-primary hover:underline">Enviar →</button>
                            )}
                          </div>
                        </div>
                      </NelvyonDsCard>
                    );
                  })}
                </div>
              )
            )}
          </>
        )}
      </div>

      {showQuoteModal && <QuoteModal deal={quoteDeal} onClose={() => { setShowQuoteModal(false); setQuoteDeal(undefined); }} onCreated={() => void load()} />}
      {showPlaybookModal && <PlaybookModal onClose={() => setShowPlaybookModal(false)} onCreated={() => void load()} />}
    </SaasShellLayout>
  );
}
