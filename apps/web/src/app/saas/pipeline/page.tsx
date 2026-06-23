"use client";

import { useState } from "react";
import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

interface Deal {
  id: string;
  name: string;
  contactName: string;
  value: number;
  probability: number;
  stageId: string;
  assignedTo: string;
  dueDate: string | null;
  tags: string[];
  notes: string;
  createdAt: string;
}

interface Stage {
  id: string;
  name: string;
  color: string;
  deals: Deal[];
}

const INITIAL_STAGES: Stage[] = [
  {
    id: "s1", name: "Prospecto", color: "#6366f1",
    deals: [
      { id: "d1", name: "Proyecto Web Corporativa", contactName: "Tech Solutions SL", value: 4500, probability: 20, stageId: "s1", assignedTo: "Admin", dueDate: "2026-07-15", tags: ["web"], notes: "", createdAt: "2026-06-01T10:00:00Z" },
      { id: "d2", name: "Pack Marketing Digital", contactName: "Startup XYZ", value: 1200, probability: 30, stageId: "s1", assignedTo: "Ventas", dueDate: null, tags: [], notes: "", createdAt: "2026-06-10T10:00:00Z" },
    ],
  },
  {
    id: "s2", name: "Propuesta enviada", color: "#f59e0b",
    deals: [
      { id: "d3", name: "Consultoría SEO Anual", contactName: "Inmobiliaria Norte", value: 6000, probability: 50, stageId: "s2", assignedTo: "Admin", dueDate: "2026-07-01", tags: ["seo", "anual"], notes: "Esperando feedback director", createdAt: "2026-05-20T10:00:00Z" },
      { id: "d4", name: "Gestión Redes Sociales", contactName: "Restaurante La Plaza", value: 800, probability: 60, stageId: "s2", assignedTo: "Marketing", dueDate: "2026-06-30", tags: ["social"], notes: "", createdAt: "2026-06-05T10:00:00Z" },
    ],
  },
  {
    id: "s3", name: "Negociación", color: "#ec4899",
    deals: [
      { id: "d5", name: "Automatización Marketing", contactName: "Agencia Digital Sur", value: 3200, probability: 70, stageId: "s3", assignedTo: "Admin", dueDate: "2026-07-10", tags: ["automation"], notes: "Ajustar precio final", createdAt: "2026-05-15T10:00:00Z" },
    ],
  },
  {
    id: "s4", name: "Contrato firmado", color: "#10b981",
    deals: [
      { id: "d6", name: "Funnel de Captación", contactName: "Coach Bienestar", value: 2800, probability: 90, stageId: "s4", assignedTo: "Admin", dueDate: "2026-06-25", tags: ["funnel"], notes: "", createdAt: "2026-05-01T10:00:00Z" },
      { id: "d7", name: "Email Marketing Q3", contactName: "Moda Española SL", value: 1500, probability: 90, stageId: "s4", assignedTo: "Marketing", dueDate: "2026-07-05", tags: ["email"], notes: "", createdAt: "2026-06-08T10:00:00Z" },
    ],
  },
  {
    id: "s5", name: "Cerrado ganado", color: "#22c55e",
    deals: [
      { id: "d8", name: "Estrategia Digital 2026", contactName: "Grupo Empresarial ABC", value: 12000, probability: 100, stageId: "s5", assignedTo: "Admin", dueDate: null, tags: ["estrategia", "anual"], notes: "", createdAt: "2026-04-01T10:00:00Z" },
    ],
  },
];

function DealCard({ deal, onMove, stages }: { deal: Deal; onMove: (dealId: string, stageId: string) => void; stages: Stage[] }) {
  const [showMenu, setShowMenu] = useState(false);
  const isOverdue = deal.dueDate && new Date(deal.dueDate) < new Date();

  return (
    <div className="group relative rounded-xl border border-border bg-card p-3 shadow-sm hover:border-primary/40 hover:shadow-md transition-all cursor-grab active:cursor-grabbing">
      <div className="mb-2 flex items-start justify-between gap-1">
        <p className="text-sm font-semibold text-foreground leading-tight">{deal.name}</p>
        <button onClick={() => setShowMenu(s => !s)} className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground text-xs">⋯</button>
        {showMenu && (
          <div className="absolute right-2 top-8 z-10 rounded-xl border border-border bg-card shadow-xl p-1 min-w-36">
            {stages.filter(s => s.id !== deal.stageId).map(s => (
              <button key={s.id} onClick={() => { onMove(deal.id, s.id); setShowMenu(false); }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-xs text-foreground hover:bg-muted/20">
                → {s.name}
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground mb-2">{deal.contactName}</p>
      {deal.tags.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {deal.tags.map(t => <span key={t} className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">{t}</span>)}
        </div>
      )}
      <div className="flex items-center justify-between">
        <p className="text-base font-bold text-foreground">€{deal.value.toLocaleString("es-ES")}</p>
        <div className="flex items-center gap-1.5">
          {deal.dueDate && (
            <span className={`text-[10px] ${isOverdue ? "text-red-400" : "text-muted-foreground"}`}>
              {isOverdue ? "⚠️" : "📅"} {new Date(deal.dueDate).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
            </span>
          )}
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">{deal.assignedTo[0]}</div>
        </div>
      </div>
      {/* Probability bar */}
      <div className="mt-2 h-1 w-full rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-primary" style={{ width: `${deal.probability}%` }} />
      </div>
      <p className="mt-0.5 text-[10px] text-muted-foreground">{deal.probability}% prob.</p>
    </div>
  );
}

function AddDealModal({ stageId, stages, onClose, onAdd }: { stageId: string; stages: Stage[]; onClose: () => void; onAdd: (deal: Deal) => void }) {
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [value, setValue] = useState(0);
  const [probability, setProbability] = useState(50);
  const [stage, setStage] = useState(stageId);
  const [dueDate, setDueDate] = useState("");
  const [assignedTo, setAssignedTo] = useState("Admin");
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await new Promise(r => setTimeout(r, 400));
    onAdd({ id: Date.now().toString(), name, contactName, value, probability, stageId: stage, assignedTo, dueDate: dueDate || null, tags: [], notes: "", createdAt: new Date().toISOString() });
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold text-foreground">Nuevo deal</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <form onSubmit={save} className="space-y-4 p-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Nombre del deal *</label>
            <input value={name} onChange={e => setName(e.target.value)} autoFocus placeholder="Ej: Proyecto Web Corporativa"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Empresa / Contacto</label>
            <input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Tech Solutions SL"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Valor (€)</label>
              <input type="number" min={0} value={value} onChange={e => setValue(Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Probabilidad</label>
              <div className="flex items-center gap-2">
                <input type="range" min={0} max={100} step={5} value={probability} onChange={e => setProbability(Number(e.target.value))} className="flex-1 accent-primary" />
                <span className="w-8 text-right text-sm text-foreground">{probability}%</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Etapa</label>
              <select value={stage} onChange={e => setStage(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none">
                {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Fecha cierre</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</NelvyonDsButton>
            <NelvyonDsButton type="submit" disabled={saving || !name} className="flex-1">{saving ? "Creando…" : "Crear deal"}</NelvyonDsButton>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SaasPipelinePage() {
  const [stages, setStages] = useState<Stage[]>(INITIAL_STAGES);
  const [showAddDeal, setShowAddDeal] = useState<string | null>(null);
  const [view, setView] = useState<"kanban" | "list">("kanban");

  function moveDeal(dealId: string, toStageId: string) {
    setStages(prev => {
      let deal: Deal | undefined;
      const updated = prev.map(s => ({ ...s, deals: s.deals.filter(d => { if (d.id === dealId) { deal = d; return false; } return true; }) }));
      if (!deal) return prev;
      return updated.map(s => s.id === toStageId ? { ...s, deals: [...s.deals, { ...deal!, stageId: toStageId }] } : s);
    });
  }

  function addDeal(deal: Deal) {
    setStages(prev => prev.map(s => s.id === deal.stageId ? { ...s, deals: [...s.deals, deal] } : s));
  }

  const totalValue = stages.flatMap(s => s.deals).reduce((s, d) => s + d.value, 0);
  const weightedValue = stages.flatMap(s => s.deals).reduce((s, d) => s + d.value * d.probability / 100, 0);
  const totalDeals = stages.reduce((s, st) => s + st.deals.length, 0);

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="pipeline" />}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <NelvyonDsSectionHeader title="Pipeline de Ventas" subtitle="Gestiona tus deals en un tablero Kanban visual" />
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg border border-border overflow-hidden">
                  {(["kanban", "list"] as const).map(v => (
                    <button key={v} onClick={() => setView(v)} className={`px-3 py-1.5 text-xs font-medium transition-colors ${view === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                      {v === "kanban" ? "⊞ Kanban" : "☰ Lista"}
                    </button>
                  ))}
                </div>
                <NelvyonDsButton onClick={() => setShowAddDeal(stages[0]!.id)}>+ Nuevo deal</NelvyonDsButton>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Deals activos", value: totalDeals },
                { label: "Valor total pipeline", value: `€${totalValue.toLocaleString("es-ES")}` },
                { label: "Valor ponderado", value: `€${Math.round(weightedValue).toLocaleString("es-ES")}` },
                { label: "Ganados este mes", value: `€${stages.find(s => s.id === "s5")!.deals.reduce((s, d) => s + d.value, 0).toLocaleString("es-ES")}` },
              ].map(({ label, value }) => (
                <NelvyonDsCard key={label} className="p-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 text-xl font-bold text-foreground">{value}</p>
                </NelvyonDsCard>
              ))}
            </div>

            {view === "kanban" ? (
              /* Kanban board */
              <div className="overflow-x-auto pb-4">
                <div className="flex gap-4" style={{ minWidth: `${stages.length * 280}px` }}>
                  {stages.map(stage => {
                    const stageValue = stage.deals.reduce((s, d) => s + d.value, 0);
                    return (
                      <div key={stage.id} className="flex w-64 shrink-0 flex-col rounded-2xl bg-muted/20 border border-border">
                        {/* Stage header */}
                        <div className="flex items-center justify-between px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stage.color }} />
                            <p className="text-sm font-semibold text-foreground">{stage.name}</p>
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-muted-foreground">{stage.deals.length}</span>
                          </div>
                          <button onClick={() => setShowAddDeal(stage.id)} className="text-muted-foreground hover:text-primary text-lg leading-none">+</button>
                        </div>
                        <p className="px-4 pb-2 text-xs text-muted-foreground font-medium">€{stageValue.toLocaleString("es-ES")}</p>
                        {/* Deals */}
                        <div className="flex-1 space-y-2.5 overflow-y-auto px-3 pb-3" style={{ maxHeight: "60vh" }}>
                          {stage.deals.map(d => <DealCard key={d.id} deal={d} onMove={moveDeal} stages={stages} />)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* List view */
              <NelvyonDsCard className="overflow-hidden p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/20">
                      {["Deal", "Contacto", "Etapa", "Valor", "Prob.", "Cierre", "Asignado"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {stages.flatMap(s => s.deals.map(d => (
                      <tr key={d.id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-4 py-3 font-medium text-foreground">{d.name}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{d.contactName}</td>
                        <td className="px-4 py-3"><span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ backgroundColor: `${s.color}20`, color: s.color }}>{s.name}</span></td>
                        <td className="px-4 py-3 font-bold text-foreground">€{d.value.toLocaleString("es-ES")}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{d.probability}%</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{d.dueDate ? new Date(d.dueDate).toLocaleDateString("es-ES") : "—"}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">{d.assignedTo}</td>
                      </tr>
                    )))}
                  </tbody>
                </table>
              </NelvyonDsCard>
            )}
      {showAddDeal && <AddDealModal stageId={showAddDeal} stages={stages} onClose={() => setShowAddDeal(null)} onAdd={addDeal} />}
    </SaasShellLayout>
  );
}
