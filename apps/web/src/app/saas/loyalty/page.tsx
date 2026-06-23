"use client";

import { useCallback, useEffect, useState } from "react";
import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

interface LoyaltyMember {
  id: string; name: string; email: string;
  points: number; tier: "bronze" | "silver" | "gold" | "platinum";
  totalSpent: number; joinedAt: string; lastActivity: string;
}

interface LoyaltyReward {
  id: string; name: string; pointsCost: number; discount: number;
  type: "discount" | "product" | "service" | "freeMonth";
  redemptions: number; active: boolean;
}

const TIER_COLOR: Record<string, string> = {
  bronze: "text-amber-700", silver: "text-slate-400",
  gold: "text-yellow-400", platinum: "text-purple-400"
};
const TIER_LABEL: Record<string, string> = {
  bronze: "Bronce", silver: "Plata", gold: "Oro", platinum: "Platino"
};

export default function SaasLoyaltyPage() {
  const [members, setMembers] = useState<LoyaltyMember[]>([]);
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"members" | "rewards">("members");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, rRes] = await Promise.allSettled([
        fetch("/api/v1/loyalty/members"),
        fetch("/api/v1/loyalty/rewards"),
      ]);
      if (mRes.status === "fulfilled" && mRes.value.ok) {
        const d = (await mRes.value.json().catch(() => ({}))) as { members?: LoyaltyMember[] };
        setMembers(d.members ?? []);
      }
      if (rRes.status === "fulfilled" && rRes.value.ok) {
        const d = (await rRes.value.json().catch(() => ({}))) as { rewards?: LoyaltyReward[] };
        setRewards(d.rewards ?? []);
      }
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const totalPoints = members.reduce((s, m) => s + m.points, 0);
  const tierCounts = { bronze: 0, silver: 0, gold: 0, platinum: 0 };
  members.forEach(m => { tierCounts[m.tier] = (tierCounts[m.tier] ?? 0) + 1; });

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-background">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[260px_minmax(0,1fr)]">
          <SaasSidebar activeId="crm" />
          <main className="space-y-6">
      <div className="flex flex-col gap-6 pb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <NelvyonDsSectionHeader title="Programa de Fidelización" subtitle="Recompensa a tus mejores clientes con puntos, niveles y descuentos" />
          <NelvyonDsButton onClick={() => {}}>+ Nueva recompensa</NelvyonDsButton>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Miembros", value: members.length },
            { label: "Puntos en circulación", value: totalPoints.toLocaleString() },
            { label: "Recompensas activas", value: rewards.filter(r => r.active).length },
            { label: "Canjes totales", value: rewards.reduce((s, r) => s + r.redemptions, 0) },
          ].map(({ label, value }) => (
            <NelvyonDsCard key={label} className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
            </NelvyonDsCard>
          ))}
        </div>

        {/* Tier breakdown */}
        <div className="grid grid-cols-4 gap-3">
          {(["platinum", "gold", "silver", "bronze"] as const).map(tier => (
            <NelvyonDsCard key={tier} className="p-4 text-center">
              <p className={`text-2xl font-bold ${TIER_COLOR[tier]}`}>{TIER_LABEL[tier]}</p>
              <p className="mt-1 text-xl font-bold text-foreground">{tierCounts[tier]}</p>
              <p className="text-xs text-muted-foreground">miembros</p>
            </NelvyonDsCard>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          {(["members", "rewards"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${tab === t ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:text-foreground"}`}>
              {t === "members" ? "Miembros" : "Recompensas"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted/30" />)}</div>
        ) : tab === "members" ? (
          members.length === 0 ? (
            <NelvyonDsCard className="p-16 text-center">
              <p className="text-5xl">⭐</p>
              <p className="mt-4 text-lg font-semibold text-foreground">Sin miembros aún</p>
              <p className="mt-2 text-sm text-muted-foreground">Los clientes se unen automáticamente cuando realizan su primera compra o se inscriben al programa</p>
            </NelvyonDsCard>
          ) : (
            <div className="space-y-2">
              {members.map(m => (
                <NelvyonDsCard key={m.id} className="flex items-center justify-between gap-4 px-5 py-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.email}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Puntos</p>
                      <p className="font-bold text-foreground">{m.points.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Gasto total</p>
                      <p className="font-semibold text-green-400">{m.totalSpent.toFixed(0)}€</p>
                    </div>
                    <span className={`text-sm font-bold ${TIER_COLOR[m.tier]}`}>{TIER_LABEL[m.tier]}</span>
                  </div>
                </NelvyonDsCard>
              ))}
            </div>
          )
        ) : (
          rewards.length === 0 ? (
            <NelvyonDsCard className="p-16 text-center">
              <p className="text-5xl">🎁</p>
              <p className="mt-4 text-lg font-semibold text-foreground">Sin recompensas</p>
              <p className="mt-2 text-sm text-muted-foreground">Crea recompensas canjeables por puntos para incentivar la fidelidad</p>
            </NelvyonDsCard>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {rewards.map(r => (
                <NelvyonDsCard key={r.id} className="flex items-start justify-between gap-3 p-4">
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{r.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{r.pointsCost.toLocaleString()} puntos · {r.redemptions} canjes</p>
                  </div>
                  <NelvyonDsBadge tone={r.active ? "success" : "primary"}>{r.active ? "Activa" : "Inactiva"}</NelvyonDsBadge>
                </NelvyonDsCard>
              ))}
            </div>
          )
        )}
      </div>
          </main>
        </div>
      </div>
    </DashboardLayout>
  );
}
