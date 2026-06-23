"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { NelvyonDsBadge } from "@/design-system/components";
import { SaasPermissionDenied } from "@/features/saas-shell/components/SaasPermissionDenied";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";
import { SaasShellLayout, DarkCard } from "@/features/saas-shell/components/SaasShellLayout";
import { saasRoleLabel } from "@/features/saas-shell/saasPermissions";
import type { SaasNavId } from "@/features/saas-shell/saasNav";

type BillingSummary = {
  tenant: { companyName: string; plan: string };
  role: string;
  limits: Record<string, number | null>;
  usage: Record<string, number>;
};

const PLANS = [
  { id: "starter", name: "Starter", price: 97, features: ["100 llamadas IA/mes", "3 sectores", "CRM + Email + Workflows"] },
  { id: "pro", name: "Pro", price: 297, features: ["500 llamadas IA/mes", "10 sectores", "Todo Starter + Deals + Campañas"] },
  { id: "agency", name: "Agency", price: 797, features: ["2.000 llamadas IA/mes", "Sectores ilimitados", "Todo Pro + White-label + OS"] },
] as const;

function usagePct(used: number, limit: number | null): number | null {
  if (limit === null || limit <= 0) return null;
  return Math.min(100, Math.round((used / limit) * 100));
}

const USAGE_LABELS: Record<string, string> = {
  contacts: "Contactos",
  deals: "Oportunidades",
  campanias: "Campañas",
  workflows: "Workflows",
  users: "Usuarios",
};

export default function SaasBillingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<BillingSummary | null>(null);
  const [upgrading, setUpgrading] = useState<string | null>(null);
  const [portaling, setPortaling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/saas/billing", { credentials: "same-origin" });
        if (res.status === 401) { router.replace("/auth/login?next=/saas/billing"); return; }
        if (res.status === 403) {
          setError("Tu rol no tiene acceso a facturación. Solo propietarios y administradores.");
          return;
        }
        if (!res.ok) throw new Error("No se pudo cargar la facturación");
        setData((await res.json()) as BillingSummary);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Error");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  async function handleUpgrade(planId: string) {
    setUpgrading(planId);
    setActionError(null);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ planId }),
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "No se pudo iniciar el checkout");
      window.location.href = json.url;
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Error al iniciar el checkout");
    } finally {
      setUpgrading(null);
    }
  }

  async function handlePortal() {
    setPortaling(true);
    setActionError(null);
    try {
      const res = await fetch("/api/saas/billing/portal", {
        method: "POST",
        credentials: "same-origin",
      });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) throw new Error(json.error ?? "No se pudo abrir el portal de facturación");
      window.location.href = json.url;
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : "Error al abrir el portal");
    } finally {
      setPortaling(false);
    }
  }

  const activeId: SaasNavId = "billing";
  const currentPlan = data?.tenant.plan ?? null;

  return (
    <SaasShellLayout
      sidebar={
        <SaasSidebar
          activeId={activeId}
          tenantCompany={data?.tenant.companyName}
          tenantPlan={currentPlan as "starter" | "pro" | "enterprise" | undefined}
        />
      }
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-[#0084ff]/70">Cuenta</p>
        <h1 className="mt-1 text-2xl font-bold text-white">Facturación y plan</h1>
        <p className="mt-0.5 text-sm text-white/40">Gestiona tu suscripción y consulta el uso en tiempo real.</p>
      </div>

      {loading && <DarkCard><p className="text-sm text-white/40">Cargando…</p></DarkCard>}
      {error && <SaasPermissionDenied message={error} />}
      {actionError && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400 flex items-center justify-between gap-3">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="shrink-0 font-medium hover:underline">Cerrar</button>
        </div>
      )}

      {!loading && !error && data && (
        <>
          {/* Plan actual */}
          <DarkCard glow className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className={`rounded-md px-2.5 py-1 text-xs font-bold uppercase tracking-wider ${
                data.tenant.plan === "enterprise" ? "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/25" :
                data.tenant.plan === "pro" ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/25" :
                "bg-[#0084ff]/15 text-[#0084ff] ring-1 ring-[#0084ff]/25"
              }`}>{data.tenant.plan}</span>
              <span className="text-sm text-white/50">{data.tenant.companyName}</span>
              <span className="text-xs text-white/30">{saasRoleLabel(data.role)}</span>
            </div>
            <button
              onClick={() => void handlePortal()}
              disabled={portaling}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-white/60 transition-all hover:bg-white/[0.08] hover:text-white disabled:opacity-40"
            >
              {portaling ? "Abriendo portal…" : "Gestionar facturación"}
            </button>
          </DarkCard>

          {/* Uso */}
          <DarkCard>
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/30">Uso del plan</p>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {(["contacts", "deals", "campanias", "workflows", "users"] as const).map((key) => {
                const used = data.usage[key] ?? 0;
                const limit = data.limits[key] ?? null;
                const pct = usagePct(used, limit);
                const isHigh = pct !== null && pct >= 80;
                return (
                  <div key={key} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-white/30">{USAGE_LABELS[key] ?? key}</p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums text-white">
                      {used}
                      <span className="text-base font-normal text-white/30">{limit !== null ? ` / ${limit}` : " / ∞"}</span>
                    </p>
                    {pct !== null ? (
                      <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className={`h-full rounded-full transition-all ${isHigh ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "bg-[#0084ff] shadow-[0_0_8px_rgba(0,132,255,0.4)]"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-white/25">Sin límite</p>
                    )}
                  </div>
                );
              })}
            </div>
          </DarkCard>

          {/* Plan cards */}
          <div>
            <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-white/30">Cambiar de plan</p>
            <div className="grid gap-4 sm:grid-cols-3">
              {PLANS.map((plan) => {
                const isCurrent = currentPlan === plan.id;
                return (
                  <div
                    key={plan.id}
                    className={`relative overflow-hidden rounded-xl border p-5 flex flex-col gap-4 transition-all ${
                      isCurrent
                        ? "border-[#0084ff]/40 bg-gradient-to-b from-[#0084ff]/10 to-[#0047ab]/5 shadow-[0_0_32px_rgba(0,132,255,0.15)]"
                        : "border-white/[0.07] bg-white/[0.02] hover:border-white/[0.14] hover:bg-white/[0.04]"
                    }`}
                  >
                    {isCurrent && (
                      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#0084ff]/60 to-transparent" />
                    )}
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">{plan.name}</span>
                      {isCurrent && (
                        <span className="rounded-md bg-[#0084ff]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#0084ff]">Activo</span>
                      )}
                    </div>
                    <p className="text-3xl font-bold text-white">
                      {plan.price}€
                      <span className="text-sm font-normal text-white/35">/mes</span>
                    </p>
                    <ul className="space-y-2 flex-1">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm text-white/50">
                          <span className="mt-0.5 text-[#0084ff]">✓</span> {f}
                        </li>
                      ))}
                    </ul>
                    <button
                      disabled={isCurrent || upgrading !== null}
                      onClick={() => void handleUpgrade(plan.id)}
                      className={`w-full rounded-lg py-2 text-sm font-medium transition-all disabled:opacity-40 ${
                        isCurrent
                          ? "border border-[#0084ff]/30 bg-[#0084ff]/10 text-[#0084ff] cursor-default"
                          : "bg-gradient-to-r from-[#0084ff] to-[#0047ab] text-white shadow-[0_0_12px_rgba(0,132,255,0.3)] hover:shadow-[0_0_20px_rgba(0,132,255,0.4)]"
                      }`}
                    >
                      {upgrading === plan.id ? "Redirigiendo…" : isCurrent ? "Plan actual" : "Cambiar a este plan"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </SaasShellLayout>
  );
}
