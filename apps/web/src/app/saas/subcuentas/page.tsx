"use client";

import { useState } from "react";
import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

type SubAccountPlan = "starter" | "pro" | "agency";
type SubAccountStatus = "active" | "suspended" | "trial";

interface SubAccount {
  id: string;
  name: string;
  domain: string | null;
  ownerName: string;
  ownerEmail: string;
  plan: SubAccountPlan;
  status: SubAccountStatus;
  contacts: number;
  campaigns: number;
  monthlyRevenue: number;
  createdAt: string;
  lastActive: string;
}

const PLAN_CONFIG: Record<SubAccountPlan, { label: string; color: string }> = {
  starter: { label: "Starter", color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  pro: { label: "Pro", color: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
  agency: { label: "Agency", color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
};

const STATUS_CONFIG: Record<SubAccountStatus, { label: string; tone: "success" | "danger" | "warning" }> = {
  active: { label: "Activa", tone: "success" },
  suspended: { label: "Suspendida", tone: "danger" },
  trial: { label: "Trial", tone: "warning" },
};

const MOCK: SubAccount[] = [
  { id: "a1", name: "Agencia Digital Norte", domain: "norte.nelvyon.com", ownerName: "Carlos Ruiz", ownerEmail: "carlos@agencianorte.com", plan: "agency", status: "active", contacts: 4231, campaigns: 87, monthlyRevenue: 299, createdAt: "2026-01-15T10:00:00Z", lastActive: new Date(Date.now() - 3600000).toISOString() },
  { id: "a2", name: "Marketing Sur SL", domain: "sur.nelvyon.com", ownerName: "Ana López", ownerEmail: "ana@marketingsur.es", plan: "pro", status: "active", contacts: 1820, campaigns: 34, monthlyRevenue: 149, createdAt: "2026-02-10T10:00:00Z", lastActive: new Date(Date.now() - 86400000).toISOString() },
  { id: "a3", name: "Consultora ABC", domain: null, ownerName: "Pedro Sánchez", ownerEmail: "pedro@consultoraabc.com", plan: "starter", status: "trial", contacts: 245, campaigns: 3, monthlyRevenue: 0, createdAt: "2026-06-10T10:00:00Z", lastActive: new Date(Date.now() - 3 * 86400000).toISOString() },
  { id: "a4", name: "RetailMax España", domain: "retailmax.nelvyon.com", ownerName: "María Torres", ownerEmail: "maria@retailmax.es", plan: "pro", status: "suspended", contacts: 890, campaigns: 12, monthlyRevenue: 0, createdAt: "2026-03-20T10:00:00Z", lastActive: new Date(Date.now() - 30 * 86400000).toISOString() },
];

function timeAgo(iso: string) {
  const d = Date.now() - new Date(iso).getTime();
  if (d < 3600000) return "Ahora";
  if (d < 86400000) return `Hace ${Math.floor(d / 3600000)}h`;
  return `Hace ${Math.floor(d / 86400000)} días`;
}

function AddSubAccountModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [plan, setPlan] = useState<SubAccountPlan>("starter");
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await new Promise(r => setTimeout(r, 700));
    setSaving(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Nueva subcuenta</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">✕</button>
        </div>
        <form onSubmit={save} className="space-y-4 p-6">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Nombre de la cuenta *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Agencia Cliente SL"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Nombre del propietario</label>
              <input value={ownerName} onChange={e => setOwnerName(e.target.value)} placeholder="Nombre y apellidos"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Email *</label>
              <input type="email" value={ownerEmail} onChange={e => setOwnerEmail(e.target.value)} placeholder="email@cliente.com"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Plan</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(PLAN_CONFIG) as SubAccountPlan[]).map(p => (
                <button key={p} type="button" onClick={() => setPlan(p)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${plan === p ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                  {PLAN_CONFIG[p].label}
                </button>
              ))}
            </div>
          </div>
          <NelvyonDsCard className="border-primary/20 bg-primary/5 p-3">
            <p className="text-xs text-muted-foreground">Se enviará un email de invitación a <strong className="text-foreground">{ownerEmail || "la dirección indicada"}</strong> para que configure su cuenta.</p>
          </NelvyonDsCard>
          <div className="flex gap-3 pt-2">
            <NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</NelvyonDsButton>
            <NelvyonDsButton type="submit" disabled={saving || !name || !ownerEmail} className="flex-1">{saving ? "Creando…" : "Crear subcuenta"}</NelvyonDsButton>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SaasSubcuentasPage() {
  const [accounts] = useState<SubAccount[]>(MOCK);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<SubAccountStatus | "all">("all");

  const filtered = accounts.filter(a => filterStatus === "all" || a.status === filterStatus);
  const totalMRR = accounts.filter(a => a.status === "active").reduce((s, a) => s + a.monthlyRevenue, 0);

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="subcuentas" />}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <NelvyonDsSectionHeader title="Gestión de Subcuentas" subtitle="Administra todas las cuentas de tus clientes desde un solo lugar" />
              <NelvyonDsButton onClick={() => setShowModal(true)}>+ Nueva subcuenta</NelvyonDsButton>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: "Total subcuentas", value: accounts.length },
                { label: "Activas", value: accounts.filter(a => a.status === "active").length },
                { label: "En trial", value: accounts.filter(a => a.status === "trial").length },
                { label: "MRR total", value: `€${totalMRR}/mes` },
              ].map(({ label, value }) => (
                <NelvyonDsCard key={label} className="p-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 text-xl font-bold text-foreground">{value}</p>
                </NelvyonDsCard>
              ))}
            </div>

            <div className="flex gap-2 flex-wrap">
              {(["all", "active", "trial", "suspended"] as const).map(s => (
                <button key={s} onClick={() => setFilterStatus(s as SubAccountStatus | "all")}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${filterStatus === s ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:text-foreground"}`}>
                  {s === "all" ? "Todas" : STATUS_CONFIG[s as SubAccountStatus].label}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {filtered.map(acc => {
                const sc = STATUS_CONFIG[acc.status];
                const pc = PLAN_CONFIG[acc.plan];
                return (
                  <NelvyonDsCard key={acc.id} className="p-4">
                    <div className="flex flex-wrap items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xl font-bold text-primary">
                        {acc.name[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-foreground">{acc.name}</p>
                          <span className={`rounded-md border px-2 py-0.5 text-xs font-medium ${pc.color}`}>{pc.label}</span>
                          <NelvyonDsBadge tone={sc.tone}>{sc.label}</NelvyonDsBadge>
                        </div>
                        <p className="text-xs text-muted-foreground">{acc.ownerName} · {acc.ownerEmail}</p>
                        {acc.domain && <p className="mt-0.5 text-xs text-primary">{acc.domain}</p>}
                        <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                          <span>{acc.contacts.toLocaleString("es-ES")} contactos</span>
                          <span>{acc.campaigns} campañas</span>
                          <span>Última actividad: {timeAgo(acc.lastActive)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {acc.monthlyRevenue > 0 && (
                          <div className="text-right">
                            <p className="text-lg font-bold text-foreground">€{acc.monthlyRevenue}</p>
                            <p className="text-xs text-muted-foreground">/mes</p>
                          </div>
                        )}
                        <div className="flex flex-col gap-1.5">
                          <NelvyonDsButton className="text-xs">Acceder →</NelvyonDsButton>
                          <NelvyonDsButton variant="ghost" className="text-xs">Configurar</NelvyonDsButton>
                        </div>
                      </div>
                    </div>
                  </NelvyonDsCard>
                );
              })}
            </div>
      {showModal && <AddSubAccountModal onClose={() => setShowModal(false)} />}
    </SaasShellLayout>
  );
}
