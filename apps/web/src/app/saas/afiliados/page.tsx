"use client";

import { useCallback, useEffect, useState } from "react";
import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

interface Affiliate {
  id: string; name: string; email: string;
  referralCode: string; commissionRate: number;
  totalReferrals: number; totalRevenue: number; pendingPayout: number;
  status: "active" | "inactive" | "pending";
  joinedAt: string;
}

function InviteModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rate, setRate] = useState("20");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) { setError("Nombre y email obligatorios"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/v1/affiliates/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), commissionRate: parseFloat(rate) || 20 }),
      });
      if (!res.ok) throw new Error("Error al invitar afiliado");
      onSaved(); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : "Error"); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <h2 className="mb-5 text-lg font-semibold text-foreground">Invitar afiliado</h2>
        {error && <p className="mb-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Nombre *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Juan Pérez"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Email *</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="juan@agencia.com"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Comisión (%)</label>
            <input type="number" min="5" max="50" step="5" value={rate} onChange={e => setRate(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
            <p className="mt-1 text-xs text-muted-foreground">Porcentaje sobre cada pago del cliente referido (recurrente)</p>
          </div>
          <div className="flex gap-3">
            <NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</NelvyonDsButton>
            <NelvyonDsButton type="submit" disabled={saving} className="flex-1">{saving ? "Enviando…" : "Invitar"}</NelvyonDsButton>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SaasAfiliadosPage() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/affiliates/partners");
      const data = (await res.json().catch(() => ({ partners: [] }))) as { partners: Affiliate[] };
      setAffiliates(data.partners ?? []);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const totalRevenue = affiliates.reduce((s, a) => s + a.totalRevenue, 0);
  const totalPending = affiliates.reduce((s, a) => s + a.pendingPayout, 0);

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <SaasSidebar activeId="billing" />
          <main className="space-y-6">
      <div className="flex flex-col gap-6 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <NelvyonDsSectionHeader title="Programa de Afiliados" subtitle="Gana comisiones recurrentes por cada cliente que refieras a Nelvyon" />
          <NelvyonDsButton onClick={() => setShowInvite(true)}>+ Invitar afiliado</NelvyonDsButton>
        </div>

        {/* Program info banner */}
        <NelvyonDsCard className="border-primary/30 bg-primary/5 p-5">
          <div className="flex flex-wrap gap-6">
            <div>
              <p className="text-xs font-medium text-primary">Tu comisión estándar</p>
              <p className="text-2xl font-bold text-foreground">20%</p>
              <p className="text-xs text-muted-foreground">recurrente mensual</p>
            </div>
            <div>
              <p className="text-xs font-medium text-primary">Duración</p>
              <p className="text-2xl font-bold text-foreground">∞</p>
              <p className="text-xs text-muted-foreground">mientras el cliente pague</p>
            </div>
            <div>
              <p className="text-xs font-medium text-primary">Pago mínimo</p>
              <p className="text-2xl font-bold text-foreground">50€</p>
              <p className="text-xs text-muted-foreground">transferencia bancaria</p>
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground mb-2">Ejemplo: 10 clientes Pro (297€/mes)</p>
              <p className="text-lg font-bold text-green-400">594€/mes → 7.128€/año</p>
            </div>
          </div>
        </NelvyonDsCard>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Afiliados", value: affiliates.length },
            { label: "Activos", value: affiliates.filter(a => a.status === "active").length },
            { label: "Revenue generado", value: `${totalRevenue.toFixed(0)}€` },
            { label: "Pendiente pago", value: `${totalPending.toFixed(0)}€` },
          ].map(({ label, value }) => (
            <NelvyonDsCard key={label} className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
            </NelvyonDsCard>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted/30" />)}</div>
        ) : affiliates.length === 0 ? (
          <NelvyonDsCard className="p-16 text-center">
            <p className="text-5xl">🤝</p>
            <p className="mt-4 text-lg font-semibold text-foreground">Sin afiliados aún</p>
            <p className="mt-2 text-sm text-muted-foreground">Invita a agencias, consultores y freelancers para que recomienden Nelvyon</p>
            <NelvyonDsButton className="mt-5" onClick={() => setShowInvite(true)}>+ Invitar primer afiliado</NelvyonDsButton>
          </NelvyonDsCard>
        ) : (
          <div className="space-y-3">
            {affiliates.map(a => (
              <NelvyonDsCard key={a.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-foreground">{a.name}</p>
                      <NelvyonDsBadge tone={a.status === "active" ? "success" : "primary"}>
                        {a.status === "active" ? "Activo" : a.status === "pending" ? "Pendiente" : "Inactivo"}
                      </NelvyonDsBadge>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{a.email} · Código: <span className="font-mono text-primary">{a.referralCode}</span></p>
                  </div>
                  <div className="flex gap-6 text-center text-sm">
                    <div><p className="text-xs text-muted-foreground">Comisión</p><p className="font-semibold text-foreground">{a.commissionRate}%</p></div>
                    <div><p className="text-xs text-muted-foreground">Referencias</p><p className="font-semibold text-foreground">{a.totalReferrals}</p></div>
                    <div><p className="text-xs text-muted-foreground">Revenue</p><p className="font-semibold text-green-400">{a.totalRevenue.toFixed(0)}€</p></div>
                    <div><p className="text-xs text-muted-foreground">Pendiente</p><p className="font-semibold text-yellow-400">{a.pendingPayout.toFixed(0)}€</p></div>
                  </div>
                </div>
              </NelvyonDsCard>
            ))}
          </div>
        )}
      </div>
      {showInvite && <InviteModal onClose={() => setShowInvite(false)} onSaved={load} />}
          </main>
        </div>
      </div>
    </DashboardLayout>
  );
}
