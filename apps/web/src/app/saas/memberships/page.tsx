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

// ── Types ─────────────────────────────────────────────────────────────────────

type BillingInterval = "month" | "year" | "lifetime";
type MemberStatus = "active" | "cancelled" | "expired";
type Tab = "planes" | "miembros" | "afiliados";

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

const INTERVAL_LABELS: Record<BillingInterval, string> = {
  month: "/ mes",
  year: "/ año",
  lifetime: "pago único",
};

const STATUS_LABEL: Record<MemberStatus, string> = {
  active: "Activa",
  cancelled: "Cancelada",
  expired: "Expirada",
};

function statusTone(s: MemberStatus): "success" | "danger" | "primary" {
  return s === "active" ? "success" : s === "expired" ? "danger" : "primary";
}

async function readError(res: Response): Promise<string> {
  const d = (await res.json().catch(() => ({}))) as { error?: string };
  return d.error ?? res.statusText;
}

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none";

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
    if (!name.trim()) {
      setErr("El nombre es obligatorio");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/saas/memberships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_plan",
          name: name.trim(),
          priceAmount: Number(price),
          billingInterval: interval,
          affiliateCommissionPct: Number(commission),
          includes: { features: features.split("\n").map((f) => f.trim()).filter(Boolean) },
        }),
      });
      if (!res.ok) throw new Error(await readError(res));
      onCreated();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error al crear plan");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <NelvyonDsCard className="w-full max-w-md p-6">
        <h3 className="mb-4 text-base font-semibold text-foreground">Nuevo plan de membresía</h3>
        <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground" htmlFor="mp-name">
              Nombre *
            </label>
            <input id="mp-name" className={inputCls} value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground" htmlFor="mp-price">
                Precio (€)
              </label>
              <input
                id="mp-price"
                type="number"
                min={0}
                step={0.01}
                className={inputCls}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground" htmlFor="mp-interval">
                Facturación
              </label>
              <select
                id="mp-interval"
                className={inputCls}
                value={interval}
                onChange={(e) => setInterval(e.target.value as BillingInterval)}
              >
                <option value="month">Mensual</option>
                <option value="year">Anual</option>
                <option value="lifetime">Pago único</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground" htmlFor="mp-comm">
              Comisión afiliado (%)
            </label>
            <input
              id="mp-comm"
              type="number"
              min={0}
              max={100}
              step={0.1}
              className={inputCls}
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted-foreground" htmlFor="mp-feat">
              Features incluidas (una por línea)
            </label>
            <textarea
              id="mp-feat"
              rows={3}
              className={inputCls}
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              placeholder={"Acceso ilimitado a cursos\nSoporte prioritario"}
            />
          </div>
          {err && (
            <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">
              {err}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <NelvyonDsButton variant="ghost" type="button" onClick={onClose}>
              Cancelar
            </NelvyonDsButton>
            <NelvyonDsButton variant="primary" type="submit" disabled={saving}>
              {saving ? "Guardando…" : "Crear plan"}
            </NelvyonDsButton>
          </div>
        </form>
      </NelvyonDsCard>
    </div>
  );
}

// ── Subscribe Modal ───────────────────────────────────────────────────────────

function SubscribeModal({
  plans,
  onCreated,
  onClose,
}: {
  plans: MembershipPlan[];
  onCreated: () => void;
  onClose: () => void;
}) {
  const activePlans = plans.filter((p) => p.isActive);
  const [planId, setPlanId] = useState(activePlans[0]?.id ?? "");
  const [email, setEmail] = useState("");
  const [affiliateRef, setAffiliateRef] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !planId) {
      setErr("Email y plan son obligatorios");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/saas/memberships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "subscribe",
          planId,
          contactEmail: email.trim(),
          affiliateRef: affiliateRef.trim() || null,
        }),
      });
      if (!res.ok) throw new Error(await readError(res));
      onCreated();
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Error al suscribir");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <NelvyonDsCard className="w-full max-w-md p-6">
        <h3 className="mb-4 text-base font-semibold text-foreground">Suscribir miembro</h3>
        {activePlans.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay planes activos. Activa o crea un plan primero.</p>
        ) : (
          <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground" htmlFor="sub-email">
                Email *
              </label>
              <input
                id="sub-email"
                type="email"
                className={inputCls}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground" htmlFor="sub-plan">
                Plan *
              </label>
              <select
                id="sub-plan"
                className={inputCls}
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
              >
                {activePlans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {p.priceCurrency} {p.priceAmount.toFixed(2)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground" htmlFor="sub-aff">
                Código afiliado (opcional)
              </label>
              <input
                id="sub-aff"
                className={inputCls}
                value={affiliateRef}
                onChange={(e) => setAffiliateRef(e.target.value)}
                placeholder="AFF…"
              />
            </div>
            {err && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">
                {err}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <NelvyonDsButton variant="ghost" type="button" onClick={onClose}>
                Cancelar
              </NelvyonDsButton>
              <NelvyonDsButton variant="primary" type="submit" disabled={saving}>
                {saving ? "Suscribiendo…" : "Suscribir"}
              </NelvyonDsButton>
            </div>
          </form>
        )}
        {activePlans.length === 0 && (
          <div className="mt-4 flex justify-end">
            <NelvyonDsButton variant="ghost" onClick={onClose}>
              Cerrar
            </NelvyonDsButton>
          </div>
        )}
      </NelvyonDsCard>
    </div>
  );
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

function PlanesTab({
  plans,
  onRefresh,
  onError,
  onOk,
}: {
  plans: MembershipPlan[];
  onRefresh: () => void;
  onError: (m: string) => void;
  onOk: (m: string) => void;
}) {
  const [showCreate, setShowCreate] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function deletePlan(id: string, name: string) {
    if (!confirm(`¿Eliminar plan "${name}"? Esta acción no se puede deshacer.`)) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/saas/memberships/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await readError(res));
      onOk("Plan eliminado");
      onRefresh();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Error al eliminar");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleActive(p: MembershipPlan) {
    setBusyId(p.id);
    try {
      const res = await fetch(`/api/saas/memberships/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !p.isActive }),
      });
      if (!res.ok) throw new Error(await readError(res));
      onOk(p.isActive ? "Plan desactivado" : "Plan activado");
      onRefresh();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Error al actualizar");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {plans.length} plan{plans.length !== 1 ? "es" : ""}
        </p>
        <NelvyonDsButton variant="primary" onClick={() => setShowCreate(true)}>
          + Nuevo plan
        </NelvyonDsButton>
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
                <NelvyonDsBadge tone={p.isActive ? "success" : "neutral"}>
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
                  {p.includes.features.slice(0, 3).map((f) => (
                    <li key={f} className="text-xs text-muted-foreground">
                      ✓ {f}
                    </li>
                  ))}
                  {p.includes.features.length > 3 && (
                    <li className="text-xs text-muted-foreground">+{p.includes.features.length - 3} más</li>
                  )}
                </ul>
              )}
              {p.affiliateCommissionPct > 0 && (
                <p className="text-xs text-primary">Comisión afiliado: {p.affiliateCommissionPct}%</p>
              )}
              <div className="mt-auto flex gap-2">
                <NelvyonDsButton
                  size="sm"
                  variant="secondary"
                  disabled={busyId === p.id}
                  onClick={() => void toggleActive(p)}
                  className="flex-1"
                >
                  {p.isActive ? "Desactivar" : "Activar"}
                </NelvyonDsButton>
                <NelvyonDsButton
                  size="sm"
                  variant="ghost"
                  disabled={busyId === p.id}
                  onClick={() => void deletePlan(p.id, p.name)}
                >
                  Eliminar
                </NelvyonDsButton>
              </div>
            </NelvyonDsCard>
          ))}
        </div>
      )}
      {showCreate && <CreatePlanModal onCreated={onRefresh} onClose={() => setShowCreate(false)} />}
    </div>
  );
}

function MiembrosTab({
  plans,
  onError,
  onOk,
}: {
  plans: MembershipPlan[];
  onError: (m: string) => void;
  onOk: (m: string) => void;
}) {
  const [members, setMembers] = useState<MembershipMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showSubscribe, setShowSubscribe] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const planMap = new Map(plans.map((p) => [p.id, p.name]));

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/saas/memberships?resource=members");
      if (!res.ok) throw new Error(await readError(res));
      const d = (await res.json()) as { members: MembershipMember[] };
      setMembers(d.members ?? []);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Error al cargar miembros");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function cancel(id: string, email: string) {
    if (!confirm(`¿Cancelar membresía de ${email}?`)) return;
    setBusyId(id);
    try {
      const res = await fetch("/api/saas/memberships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", memberId: id }),
      });
      if (!res.ok) throw new Error(await readError(res));
      onOk("Membresía cancelada");
      await load();
    } catch (e) {
      onError(e instanceof Error ? e.message : "Error al cancelar");
    } finally {
      setBusyId(null);
    }
  }

  const activeCount = members.filter((m) => m.status === "active").length;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          {members.length} miembro{members.length !== 1 ? "s" : ""} · {activeCount} activos
        </p>
        <NelvyonDsButton variant="primary" onClick={() => setShowSubscribe(true)}>
          + Suscribir miembro
        </NelvyonDsButton>
      </div>
      {loadError && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive" role="alert">
          {loadError}{" "}
          <button type="button" className="underline" onClick={() => void load()}>
            Reintentar
          </button>
        </p>
      )}
      {loading ? (
        <div className="h-32 animate-pulse rounded-xl bg-muted/30" />
      ) : members.length === 0 ? (
        <NelvyonDsCard className="py-12 text-center text-sm text-muted-foreground">
          Aún no hay miembros. Usa «Suscribir miembro» para dar de alta el primero.
        </NelvyonDsCard>
      ) : (
        <NelvyonDsCard className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Email", "Plan", "Estado", "Inicio", "Expira", "Afiliado", ""].map((h) => (
                  <th key={h || "actions"} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id} className="border-b border-border/40 hover:bg-muted/10">
                  <td className="px-4 py-3 text-foreground">{m.contactEmail}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {planMap.get(m.planId) ?? m.planId.slice(0, 8)}
                  </td>
                  <td className="px-4 py-3">
                    <NelvyonDsBadge tone={statusTone(m.status)}>
                      {STATUS_LABEL[m.status] ?? m.status}
                    </NelvyonDsBadge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(m.startsAt).toLocaleDateString("es-ES")}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {m.expiresAt ? new Date(m.expiresAt).toLocaleDateString("es-ES") : "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {m.affiliateRef ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    {m.status === "active" && (
                      <NelvyonDsButton
                        size="sm"
                        variant="ghost"
                        disabled={busyId === m.id}
                        onClick={() => void cancel(m.id, m.contactEmail)}
                      >
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
      {showSubscribe && (
        <SubscribeModal
          plans={plans}
          onCreated={() => {
            onOk("Miembro suscrito");
            void load();
          }}
          onClose={() => setShowSubscribe(false)}
        />
      )}
    </div>
  );
}

function AfiliadosTab() {
  const [commissions, setCommissions] = useState<AffiliateCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/affiliates?resource=commissions");
      if (!res.ok) throw new Error(await readError(res));
      // API returns AffiliateCommission[] directly (not { commissions })
      const d = (await res.json()) as AffiliateCommission[] | { commissions: AffiliateCommission[] };
      const list = Array.isArray(d) ? d : (d.commissions ?? []);
      setCommissions(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar comisiones");
      setCommissions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const total = commissions.reduce((s, c) => s + c.commissionAmount, 0);
  const pending = commissions
    .filter((c) => c.status === "pending")
    .reduce((s, c) => s + c.commissionAmount, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <KpiTile icon="💶" label="Total comisiones" value={`€ ${total.toFixed(2)}`} />
        <KpiTile icon="⏳" label="Pendiente de pago" value={`€ ${pending.toFixed(2)}`} accent />
        <KpiTile icon="🔗" label="Conversiones" value={commissions.length} />
      </div>
      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive" role="alert">
          {error}{" "}
          <button type="button" className="underline" onClick={() => void load()}>
            Reintentar
          </button>
        </p>
      )}
      {loading ? (
        <div className="h-32 animate-pulse rounded-xl bg-muted/30" />
      ) : commissions.length === 0 ? (
        <NelvyonDsCard className="py-12 text-center text-sm text-muted-foreground">
          Sin comisiones de afiliado. Aparecerán al suscribir con código de afiliado.
        </NelvyonDsCard>
      ) : (
        <NelvyonDsCard className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {["Venta (€)", "Comisión (€)", "Estado", "Fecha"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {commissions.map((c) => (
                <tr key={c.id} className="border-b border-border/40 hover:bg-muted/10">
                  <td className="px-4 py-3 text-foreground">€ {c.amount.toFixed(2)}</td>
                  <td className="px-4 py-3 text-primary">€ {c.commissionAmount.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <NelvyonDsBadge
                      tone={c.status === "paid" ? "success" : c.status === "approved" ? "primary" : "warning"}
                    >
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
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionOk, setActionOk] = useState<string | null>(null);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/memberships");
      if (!res.ok) throw new Error(await readError(res));
      const d = (await res.json()) as { plans: MembershipPlan[] };
      setPlans(d.plans ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar planes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlans();
  }, [loadPlans]);

  function flashOk(msg: string) {
    setActionOk(msg);
    setActionError(null);
    window.setTimeout(() => setActionOk(null), 3500);
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: "planes", label: "Planes" },
    { id: "miembros", label: "Miembros" },
    { id: "afiliados", label: "Afiliados" },
  ];

  const activePlans = plans.filter((p) => p.isActive).length;

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="memberships" />}>
      <div className="flex flex-col gap-6 pb-8">
        <NelvyonDsSectionHeader
          title="Membresías"
          subtitle="Planes recurrentes, acceso a cursos y comunidades, comisiones de afiliado"
        />

        {(actionError || error) && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive" role="alert">
            {actionError ?? error}
            {error && (
              <>
                {" "}
                <button type="button" className="underline" onClick={() => void loadPlans()}>
                  Reintentar
                </button>
              </>
            )}
          </p>
        )}
        {actionOk && (
          <p className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-sm text-primary" role="status">
            {actionOk}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <KpiTile icon="🎫" label="Planes" value={plans.length} />
          <KpiTile icon="✅" label="Planes activos" value={activePlans} accent />
          <KpiTile
            icon="💶"
            label="Desde"
            value={
              plans.length
                ? `${Math.min(...plans.map((p) => p.priceAmount)).toFixed(0)} €`
                : "—"
            }
          />
        </div>

        <div className="flex gap-1 border-b border-border" role="tablist" aria-label="Secciones membresías">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
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
            {tab === "planes" && (
              <PlanesTab
                plans={plans}
                onRefresh={() => void loadPlans()}
                onError={setActionError}
                onOk={flashOk}
              />
            )}
            {tab === "miembros" && (
              <MiembrosTab plans={plans} onError={setActionError} onOk={flashOk} />
            )}
            {tab === "afiliados" && <AfiliadosTab />}
          </>
        )}
      </div>
    </SaasShellLayout>
  );
}
