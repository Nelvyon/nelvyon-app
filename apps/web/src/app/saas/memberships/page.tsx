"use client";

import { useCallback, useEffect, useState } from "react";
import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

// ── Types ─────────────────────────────────────────────────────────────────────

type BillingInterval = "month" | "year" | "lifetime";
type MemberStatus = "active" | "cancelled" | "expired";

interface MembershipPlan {
  id: string;
  name: string;
  slug: string;
  priceAmount: number;
  priceCurrency: string;
  billingInterval: BillingInterval;
  includes: { courses: string[]; communities: string[]; features: string[] };
  affiliateCommissionPct: number;
  isActive: boolean;
  createdAt: string;
}

interface MembershipMember {
  id: string;
  planId: string;
  contactEmail: string;
  status: MemberStatus;
  startsAt: string;
  expiresAt: string | null;
  affiliateRef: string | null;
}

interface AffiliateCommission {
  id: string;
  amount: number;
  commissionAmount: number;
  status: string;
  createdAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const INTERVAL_LABELS: Record<BillingInterval, string> = {
  month: "/ mes",
  year: "/ año",
  lifetime: "pago único",
};

function statusTone(s: MemberStatus): "success" | "danger" | "primary" {
  return s === "active" ? "success" : s === "expired" ? "danger" : "primary";
}

// ── Create Plan Modal ─────────────────────────────────────────────────────────

function CreatePlanModal({ onCreated, onClose }: { onCreated: () => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("0");
  const [interval, setInterval] = useState<BillingInterval>("month");
  const [commission, setCommission] = useState("0");
  const [features, setFeatures] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/saas/memberships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_plan",
          name,
          priceAmount: Number(price),
          billingInterval: interval,
          affiliateCommissionPct: Number(commission),
          includes: { features: features.split("\n").map((f) => f.trim()).filter(Boolean) },
        }),
      });
      if (!res.ok) throw new Error((await res.json() as { error?: string }).error ?? "Error");
      onCreated();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error al crear plan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <NelvyonDsCard className="w-full max-w-md p-6">
        <h3 className="mb-4 text-base font-semibold text-foreground">Nuevo plan de membresía</h3>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Nombre *</label>
            <input
              className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground"
              value={name} onChange={(e) => setName(e.target.value)} required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Precio (€)</label>
              <input type="number" min="0" step="0.01"
                className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground"
                value={price} onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Facturación</label>
              <select
                className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground"
                value={interval} onChange={(e) => setInterval(e.target.value as BillingInterval)}
              >
                <option value="month">Mensual</option>
                <option value="year">Anual</option>
                <option value="lifetime">Pago único</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Comisión afiliado (%)</label>
            <input type="number" min="0" max="100" step="0.1"
              className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground"
              value={commission} onChange={(e) => setCommission(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Features incluidas (una por línea)</label>
            <textarea rows={3}
              className="w-full rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground"
              value={features} onChange={(e) => setFeatures(e.target.value)}
              placeholder="Acceso ilimitado a cursos&#10;Soporte prioritario"
            />
          </div>
          {err && <p className="text-xs text-red-400">{err}</p>}
          <div className="flex justify-end gap-2">
            <NelvyonDsButton variant="ghost" type="button" onClick={onClose}>Cancelar</NelvyonDsButton>
            <NelvyonDsButton variant="primary" type="submit" disabled={saving}>
              {saving ? "Guardando…" : "Crear plan"}
            </NelvyonDsButton>
          </div>
        </form>
      </NelvyonDsCard>
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

type Tab = "planes" | "miembros" | "afiliados";

function PlanesTab({ plans, onRefresh }: { plans: MembershipPlan[]; onRefresh: () => void }) {
  const [showCreate, setShowCreate] = useState(false);

  async function deletePlan(id: string, name: string) {
    if (!confirm(`¿Eliminar plan "${name}"?`)) return;
    await fetch(`/api/saas/memberships/${id}`, { method: "DELETE" });
    onRefresh();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{plans.length} plan{plans.length !== 1 ? "es" : ""}</p>
        <NelvyonDsButton variant="primary" onClick={() => setShowCreate(true)}>+ Nuevo plan</NelvyonDsButton>
      </div>
      {plans.length === 0 ? (
        <NelvyonDsCard className="py-12 text-center text-sm text-muted-foreground">
          No hay planes. Crea el primero para empezar.
        </NelvyonDsCard>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => (
            <NelvyonDsCard key={p.id} className="flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground">{p.slug}</p>
                </div>
                <NelvyonDsBadge tone={p.isActive ? "success" : "primary"}>
                  {p.isActive ? "Activo" : "Inactivo"}
                </NelvyonDsBadge>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {p.priceCurrency} {p.priceAmount.toFixed(2)}
                <span className="ml-1 text-sm font-normal text-muted-foreground">
                  {INTERVAL_LABELS[p.billingInterval]}
                </span>
              </p>
              {p.includes.features.length > 0 && (
                <ul className="space-y-0.5">
                  {p.includes.features.slice(0, 3).map((f, i) => (
                    <li key={i} className="text-xs text-muted-foreground">✓ {f}</li>
                  ))}
                  {p.includes.features.length > 3 && (
                    <li className="text-xs text-muted-foreground">+{p.includes.features.length - 3} más</li>
                  )}
                </ul>
              )}
              {p.affiliateCommissionPct > 0 && (
                <p className="text-xs text-primary">Comisión afiliado: {p.affiliateCommissionPct}%</p>
              )}
              <NelvyonDsButton variant="ghost" onClick={() => deletePlan(p.id, p.name)} className="w-full">
                Eliminar
              </NelvyonDsButton>
            </NelvyonDsCard>
          ))}
        </div>
      )}
      {showCreate && (
        <CreatePlanModal onCreated={onRefresh} onClose={() => setShowCreate(false)} />
      )}
    </div>
  );
}

function MiembrosTab({ plans }: { plans: MembershipPlan[] }) {
  const [members, setMembers] = useState<MembershipMember[]>([]);
  const [loading, setLoading] = useState(true);
  const planMap = new Map(plans.map((p) => [p.id, p.name]));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/saas/memberships?resource=members");
      if (res.ok) {
        const d = (await res.json()) as { members: MembershipMember[] };
        setMembers(d.members ?? []);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function cancel(id: string, email: string) {
    if (!confirm(`¿Cancelar membresía de ${email}?`)) return;
    await fetch("/api/saas/memberships", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "cancel", memberId: id }),
    });
    void load();
  }

  return (
    <div className="flex flex-col gap-4">
      {loading ? (
        <div className="h-32 animate-pulse rounded-xl bg-muted/30" />
      ) : members.length === 0 ? (
        <NelvyonDsCard className="py-12 text-center text-sm text-muted-foreground">
          Aún no hay miembros con membresía activa.
        </NelvyonDsCard>
      ) : (
        <NelvyonDsCard className="overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Email", "Plan", "Estado", "Inicio", "Expira", ""].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-border/40 hover:bg-muted/10">
                  <td className="px-4 py-3 text-foreground">{m.contactEmail}</td>
                  <td className="px-4 py-3 text-muted-foreground">{planMap.get(m.planId) ?? m.planId.slice(0, 8)}</td>
                  <td className="px-4 py-3">
                    <NelvyonDsBadge tone={statusTone(m.status)}>{m.status}</NelvyonDsBadge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(m.startsAt).toLocaleDateString("es-ES")}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {m.expiresAt ? new Date(m.expiresAt).toLocaleDateString("es-ES") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    {m.status === "active" && (
                      <NelvyonDsButton variant="ghost" onClick={() => cancel(m.id, m.contactEmail)}>
                        Cancelar
                      </NelvyonDsButton>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </NelvyonDsCard>
      )}
    </div>
  );
}

function AfiliadosTab() {
  const [commissions, setCommissions] = useState<AffiliateCommission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/saas/affiliates?resource=commissions");
        if (res.ok) {
          const d = (await res.json()) as { commissions: AffiliateCommission[] };
          setCommissions(d.commissions ?? []);
        }
      } finally { setLoading(false); }
    })();
  }, []);

  const total = commissions.reduce((s, c) => s + c.commissionAmount, 0);
  const pending = commissions.filter((c) => c.status === "pending").reduce((s, c) => s + c.commissionAmount, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[
          { label: "Total comisiones", value: `€ ${total.toFixed(2)}` },
          { label: "Pendiente de pago", value: `€ ${pending.toFixed(2)}` },
          { label: "Conversiones", value: String(commissions.length) },
        ].map(({ label, value }) => (
          <NelvyonDsCard key={label} className="p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-xl font-bold text-foreground">{loading ? "—" : value}</p>
          </NelvyonDsCard>
        ))}
      </div>
      {loading ? (
        <div className="h-32 animate-pulse rounded-xl bg-muted/30" />
      ) : commissions.length === 0 ? (
        <NelvyonDsCard className="py-12 text-center text-sm text-muted-foreground">
          Sin comisiones de afiliado por ventas de membresía todavía.
        </NelvyonDsCard>
      ) : (
        <NelvyonDsCard className="overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Venta (€)", "Comisión (€)", "Estado", "Fecha"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {commissions.map((c) => (
                <tr key={c.id} className="border-b border-border/40 hover:bg-muted/10">
                  <td className="px-4 py-3 text-foreground">€ {c.amount.toFixed(2)}</td>
                  <td className="px-4 py-3 text-primary">€ {c.commissionAmount.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <NelvyonDsBadge tone={c.status === "paid" ? "success" : c.status === "approved" ? "primary" : "primary"}>
                      {c.status}
                    </NelvyonDsBadge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(c.createdAt).toLocaleDateString("es-ES")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </NelvyonDsCard>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SaasMembershipsPage() {
  const [tab, setTab] = useState<Tab>("planes");
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/saas/memberships");
      if (res.ok) {
        const d = (await res.json()) as { plans: MembershipPlan[] };
        setPlans(d.plans ?? []);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadPlans(); }, [loadPlans]);

  const TABS: { id: Tab; label: string }[] = [
    { id: "planes", label: "Planes" },
    { id: "miembros", label: "Miembros" },
    { id: "afiliados", label: "Afiliados" },
  ];

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="memberships" />}>
      <div className="flex flex-col gap-6 pb-8">
        <NelvyonDsSectionHeader
          title="Membresías"
          subtitle="Planes recurrentes, acceso a cursos y comunidades, comisiones de afiliado"
        />

        {/* Tab bar */}
        <div className="flex gap-1 border-b border-border">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading && tab === "planes" ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-44 animate-pulse rounded-xl bg-muted/30" />
            ))}
          </div>
        ) : (
          <>
            {tab === "planes" && <PlanesTab plans={plans} onRefresh={loadPlans} />}
            {tab === "miembros" && <MiembrosTab plans={plans} />}
            {tab === "afiliados" && <AfiliadosTab />}
          </>
        )}
      </div>
    </SaasShellLayout>
  );
}
