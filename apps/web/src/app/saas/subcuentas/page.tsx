"use client";

import { useCallback, useEffect, useState } from "react";
import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

// ── Types (mirror SaasSubcuentasService) ──────────────────────────────────────
type SubcuentaPlan = "starter" | "pro" | "agency";
type SubcuentaStatus = "active" | "suspended" | "cancelled";

interface Subcuenta {
  id: string;
  agencyTenantId: string;
  tenantId: string;
  name: string;
  email: string;
  plan: SubcuentaPlan;
  status: SubcuentaStatus;
  maxContacts: number;
  maxCampaigns: number;
  stripeConnectPaymentEnabled: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SubcuentaUsage { contacts: number; campaigns: number; workflows: number }

const PLAN_CFG: Record<SubcuentaPlan, { label: string; color: string }> = {
  starter: { label: "Starter", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  pro:     { label: "Pro",     color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  agency:  { label: "Agency",  color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
};

const STATUS_CFG: Record<SubcuentaStatus, { label: string; tone: "success" | "danger" | "warning" }> = {
  active:    { label: "Activa",     tone: "success" },
  suspended: { label: "Suspendida", tone: "warning" },
  cancelled: { label: "Cancelada",  tone: "danger" },
};

// ── Create modal ───────────────────────────────────────────────────────────────
function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState<SubcuentaPlan>("starter");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) { setError("Nombre y email son obligatorios"); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/saas/subcuentas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), plan, notes: notes.trim() || undefined }),
      });
      const d = await res.json() as { subcuenta?: Subcuenta; error?: string };
      if (!res.ok) { setError(d.error ?? "Error al crear subcuenta"); return; }
      onCreated(); onClose();
    } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Nueva subcuenta</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <form onSubmit={save} className="space-y-4 p-6">
          {error && <p className="rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Nombre de la cuenta *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Agencia Cliente SL"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Email de contacto *</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="contacto@cliente.com"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Plan</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(PLAN_CFG) as SubcuentaPlan[]).map(p => (
                <button key={p} type="button" onClick={() => setPlan(p)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${plan === p ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
                  {PLAN_CFG[p].label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Notas internas</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas opcionales…"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
          </div>
          <div className="flex gap-3 pt-2">
            <NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</NelvyonDsButton>
            <NelvyonDsButton type="submit" disabled={saving} className="flex-1">{saving ? "Creando…" : "Crear subcuenta"}</NelvyonDsButton>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Usage panel ────────────────────────────────────────────────────────────────
function UsagePanel({ sub, onClose }: { sub: Subcuenta; onClose: () => void }) {
  const [usage, setUsage] = useState<SubcuentaUsage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch("/api/saas/subcuentas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "usage", id: sub.id }) })
      .then(r => r.json() as Promise<{ usage?: SubcuentaUsage }>)
      .then(d => setUsage(d.usage ?? null))
      .finally(() => setLoading(false));
  }, [sub.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <NelvyonDsCard className="w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-foreground">Uso: {sub.name}</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        {loading ? <div className="h-24 animate-pulse rounded-lg bg-muted/30" /> : (
          <div className="space-y-3">
            {[
              { label: "Contactos",      value: usage?.contacts ?? 0,  max: sub.maxContacts },
              { label: "Campañas",       value: usage?.campaigns ?? 0, max: sub.maxCampaigns },
              { label: "Workflows activos", value: usage?.workflows ?? 0, max: null },
            ].map(({ label, value, max }) => (
              <div key={label}>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>{label}</span>
                  <span>{value.toLocaleString("es-ES")}{max != null ? ` / ${max.toLocaleString("es-ES")}` : ""}</span>
                </div>
                {max != null && (
                  <div className="h-1.5 rounded-full bg-muted/30">
                    <div className="h-1.5 rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <NelvyonDsButton variant="ghost" onClick={onClose} className="w-full">Cerrar</NelvyonDsButton>
      </NelvyonDsCard>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function SaasSubcuentasPage() {
  const [subcuentas, setSubcuentas] = useState<Subcuenta[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [usageSub, setUsageSub] = useState<Subcuenta | null>(null);
  const [filterStatus, setFilterStatus] = useState<SubcuentaStatus | "all">("all");
  const [actioning, setActioning] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/saas/subcuentas");
      if (res.ok) {
        const d = await res.json() as { subcuentas?: Subcuenta[] };
        setSubcuentas(d.subcuentas ?? []);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function doAction(action: "suspend" | "reactivate", id: string) {
    setActioning(id);
    try {
      await fetch("/api/saas/subcuentas", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, id }) });
      void load();
    } finally { setActioning(null); }
  }

  async function doCancel(id: string) {
    if (!window.confirm("¿Cancelar definitivamente esta subcuenta? Esta acción no se puede deshacer.")) return;
    setActioning(id);
    try {
      await fetch(`/api/saas/subcuentas?id=${id}`, { method: "DELETE" });
      void load();
    } finally { setActioning(null); }
  }

  const filtered = subcuentas.filter(s => filterStatus === "all" || s.status === filterStatus);

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="subcuentas" />}>
      <div className="flex flex-col gap-6 pb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <NelvyonDsSectionHeader title="Gestión de Subcuentas" subtitle="Administra las cuentas de clientes bajo tu agencia white-label" />
          <NelvyonDsButton onClick={() => setShowCreate(true)}>+ Nueva subcuenta</NelvyonDsButton>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total",            value: subcuentas.length },
            { label: "Activas",          value: subcuentas.filter(s => s.status === "active").length },
            { label: "Suspendidas",      value: subcuentas.filter(s => s.status === "suspended").length },
            { label: "Stripe Connect",   value: subcuentas.filter(s => s.stripeConnectPaymentEnabled).length },
          ].map(({ label, value }) => (
            <NelvyonDsCard key={label} className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
            </NelvyonDsCard>
          ))}
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 flex-wrap">
          {(["all", "active", "suspended", "cancelled"] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filterStatus === s ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:text-foreground"}`}>
              {s === "all" ? "Todas" : STATUS_CFG[s as SubcuentaStatus].label}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-muted/30" />)}</div>
        ) : filtered.length === 0 ? (
          <NelvyonDsCard className="p-16 text-center">
            <p className="text-5xl">🏢</p>
            <p className="mt-4 text-lg font-semibold text-foreground">Sin subcuentas</p>
            <p className="mt-2 text-sm text-muted-foreground">Crea la primera subcuenta para tu cliente</p>
            <NelvyonDsButton className="mt-5" onClick={() => setShowCreate(true)}>+ Nueva subcuenta</NelvyonDsButton>
          </NelvyonDsCard>
        ) : (
          <div className="space-y-3">
            {filtered.map(sub => {
              const pc = PLAN_CFG[sub.plan];
              const sc = STATUS_CFG[sub.status];
              const isBusy = actioning === sub.id;
              return (
                <NelvyonDsCard key={sub.id} className="p-4">
                  <div className="flex flex-wrap items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary">
                      {sub.name[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-foreground">{sub.name}</p>
                        <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${pc.color}`}>{pc.label}</span>
                        <NelvyonDsBadge tone={sc.tone}>{sc.label}</NelvyonDsBadge>
                        {sub.stripeConnectPaymentEnabled && <NelvyonDsBadge tone="primary">Connect</NelvyonDsBadge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{sub.email}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Límite: {sub.maxContacts.toLocaleString("es-ES")} contactos · {sub.maxCampaigns} campañas</p>
                      {sub.notes && <p className="text-xs text-muted-foreground mt-1 italic">{sub.notes}</p>}
                    </div>
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <NelvyonDsButton variant="ghost" className="text-xs" onClick={() => setUsageSub(sub)}>Ver uso</NelvyonDsButton>
                      {sub.status === "active" && (
                        <NelvyonDsButton variant="ghost" className="text-xs" disabled={isBusy} onClick={() => void doAction("suspend", sub.id)}>
                          {isBusy ? "…" : "Suspender"}
                        </NelvyonDsButton>
                      )}
                      {sub.status === "suspended" && (
                        <>
                          <NelvyonDsButton className="text-xs" disabled={isBusy} onClick={() => void doAction("reactivate", sub.id)}>
                            {isBusy ? "…" : "Reactivar"}
                          </NelvyonDsButton>
                          <button className="text-xs text-red-400 hover:text-red-300" disabled={isBusy} onClick={() => void doCancel(sub.id)}>
                            Cancelar
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </NelvyonDsCard>
              );
            })}
          </div>
        )}
      </div>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreated={() => void load()} />}
      {usageSub && <UsagePanel sub={usageSub} onClose={() => setUsageSub(null)} />}
    </SaasShellLayout>
  );
}
