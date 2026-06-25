"use client";

import { useEffect, useState, useCallback } from "react";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";
import {
  NelvyonDsSectionHeader,
  NelvyonDsCard,
  NelvyonDsBadge,
  NelvyonDsButton,
} from "@/design-system/components";

// ── Types ────────────────────────────────────────────────────────────────────

interface LoyaltyTier { name: string; min_points: number }
interface LoyaltyProgram { id: string; pointsPerEur: number; tiers: LoyaltyTier[]; active: boolean }
interface LoyaltyBalance { id: string; contactId: string; points: number; tier: string; updatedAt: string }

// ── Helpers ──────────────────────────────────────────────────────────────────

type BadgeTone = "neutral" | "primary" | "success" | "warning" | "danger";
const TIER_TONE: Record<string, BadgeTone> = { Bronze: "warning", Silver: "neutral", Gold: "success", Platinum: "primary" };

async function apiFetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const r = await fetch(url, { ...opts, headers: { "Content-Type": "application/json", ...(opts?.headers ?? {}) } });
  if (!r.ok) { const e = await r.json().catch(() => ({})) as { error?: string }; throw new Error(String(e.error ?? r.statusText)); }
  return r.json() as Promise<T>;
}

const inputCls = "w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary";

// ── Main Page ────────────────────────────────────────────────────────────────

export default function SaasLoyaltyPage() {
  const [program, setProgram]   = useState<LoyaltyProgram | null>(null);
  const [balances, setBalances] = useState<LoyaltyBalance[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [tab, setTab]           = useState<"members" | "earn" | "settings">("members");

  const [earnContactId, setEarnContactId] = useState("");
  const [earnAmount, setEarnAmount]       = useState("");
  const [earnReason, setEarnReason]       = useState("");
  const [earning, setEarning]             = useState(false);
  const [cfgPPE, setCfgPPE]   = useState("");
  const [saving, setSaving]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, b] = await Promise.all([
        apiFetch<LoyaltyProgram>("/api/saas/loyalty?resource=program"),
        apiFetch<LoyaltyBalance[]>("/api/saas/loyalty?resource=balances"),
      ]);
      setProgram(p); setBalances(b); setCfgPPE(String(p.pointsPerEur));
    } catch (e) { setError(String((e as Error).message)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const earn = async () => {
    if (!earnContactId.trim() || !earnAmount.trim()) return;
    setEarning(true);
    try {
      await apiFetch("/api/saas/loyalty", {
        method: "POST",
        body: JSON.stringify({ action: "earn", contactId: earnContactId.trim(), eurAmount: Number(earnAmount), reason: earnReason || undefined }),
      });
      setEarnContactId(""); setEarnAmount(""); setEarnReason("");
      await load();
    } catch (e) { alert(String((e as Error).message)); }
    finally { setEarning(false); }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      await apiFetch("/api/saas/loyalty", { method: "POST", body: JSON.stringify({ action: "update-program", pointsPerEur: Number(cfgPPE) }) });
      await load();
    } catch (e) { alert(String((e as Error).message)); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="loyalty" />}>
      <p className="text-muted-foreground text-sm p-8">Cargando programa de fidelización…</p>
    </SaasShellLayout>
  );
  if (error) return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="loyalty" />}>
      <p className="text-destructive text-sm p-8">{error}</p>
    </SaasShellLayout>
  );

  const p = program!;
  const tierCount: Record<string, number> = {};
  for (const b of balances) { tierCount[b.tier] = (tierCount[b.tier] ?? 0) + 1; }
  const totalPoints = balances.reduce((s, b) => s + b.points, 0);

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="loyalty" />}>
      <div className="flex flex-col gap-6 pb-8">
        <NelvyonDsSectionHeader
          title="Programa de Fidelización"
          subtitle={`${p.pointsPerEur} punto(s)/€ · ${p.tiers.length} niveles · ${balances.length} miembros`}
        />

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <NelvyonDsCard className="p-4">
            <p className="text-xs text-muted-foreground">Total miembros</p>
            <p className="text-2xl font-bold text-foreground mt-1">{balances.length}</p>
          </NelvyonDsCard>
          <NelvyonDsCard className="p-4">
            <p className="text-xs text-muted-foreground">Puntos emitidos</p>
            <p className="text-2xl font-bold text-foreground mt-1">{totalPoints.toLocaleString()}</p>
          </NelvyonDsCard>
          {p.tiers.slice(1, 3).map(tier => {
            const minIdx = p.tiers.findIndex(x => x.name === tier.name);
            const count = Object.entries(tierCount).filter(([t]) => p.tiers.findIndex(x => x.name === t) >= minIdx).reduce((s, [, n]) => s + n, 0);
            return (
              <NelvyonDsCard key={tier.name} className="p-4">
                <p className="text-xs text-muted-foreground">{tier.name}+</p>
                <p className="text-2xl font-bold text-foreground mt-1">{count}</p>
              </NelvyonDsCard>
            );
          })}
        </div>

        {/* Tier legend */}
        <div className="flex gap-2 flex-wrap">
          {p.tiers.map(tier => (
            <NelvyonDsCard key={tier.name} className="p-3 flex items-center gap-2">
              <NelvyonDsBadge tone={TIER_TONE[tier.name] ?? "neutral"}>{tier.name}</NelvyonDsBadge>
              <span className="text-xs text-muted-foreground">≥ {tier.min_points.toLocaleString()} pts</span>
              <span className="text-xs font-semibold text-foreground ml-2">{tierCount[tier.name] ?? 0}</span>
            </NelvyonDsCard>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border">
          {(["members", "earn", "settings"] as const).map(t => (
            <button key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {t === "members" ? "Miembros" : t === "earn" ? "Dar puntos" : "Configuración"}
            </button>
          ))}
        </div>

        {/* MEMBERS */}
        {tab === "members" && (
          <div className="flex flex-col gap-2">
            {balances.length === 0 ? (
              <NelvyonDsCard className="p-8 text-center text-muted-foreground text-sm">
                Sin miembros todavía. Usa "Dar puntos" para enrolar el primer contacto.
              </NelvyonDsCard>
            ) : (
              balances.map(b => (
                <NelvyonDsCard key={b.id || b.contactId} className="p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono text-foreground truncate">{b.contactId}</p>
                    <p className="text-xs text-muted-foreground">
                      Actualizado: {new Date(b.updatedAt).toLocaleDateString("es-ES")}
                    </p>
                  </div>
                  <NelvyonDsBadge tone={TIER_TONE[b.tier] ?? "neutral"}>{b.tier}</NelvyonDsBadge>
                  <span className="text-sm font-semibold text-foreground shrink-0">{b.points.toLocaleString()} pts</span>
                </NelvyonDsCard>
              ))
            )}
          </div>
        )}

        {/* EARN */}
        {tab === "earn" && (
          <NelvyonDsCard className="p-6 flex flex-col gap-4 max-w-md">
            <p className="text-sm font-medium text-foreground">Dar puntos a un contacto</p>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Contact ID (UUID)</p>
              <input className={inputCls} value={earnContactId} onChange={(ev: React.ChangeEvent<HTMLInputElement>) => setEarnContactId(ev.target.value)} placeholder="uuid-del-contacto" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Importe en euros (€)</p>
              <input className={inputCls} type="number" value={earnAmount} onChange={(ev: React.ChangeEvent<HTMLInputElement>) => setEarnAmount(ev.target.value)} placeholder="150" min="0.01" step="0.01" />
              {earnAmount && p && (
                <p className="text-xs text-muted-foreground mt-1">= {Math.floor(Number(earnAmount) * p.pointsPerEur)} puntos</p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Razón (opcional)</p>
              <input className={inputCls} value={earnReason} onChange={(ev: React.ChangeEvent<HTMLInputElement>) => setEarnReason(ev.target.value)} placeholder="Compra #12345" />
            </div>
            <NelvyonDsButton onClick={earn} disabled={earning || !earnContactId.trim() || !earnAmount.trim()} variant="primary">
              {earning ? "Procesando…" : "Dar puntos"}
            </NelvyonDsButton>
          </NelvyonDsCard>
        )}

        {/* SETTINGS */}
        {tab === "settings" && (
          <NelvyonDsCard className="p-6 flex flex-col gap-6 max-w-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Puntos por euro</p>
              <input className={inputCls} type="number" value={cfgPPE} onChange={(ev: React.ChangeEvent<HTMLInputElement>) => setCfgPPE(ev.target.value)} min="0.1" step="0.1" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground mb-2">Niveles</p>
              <div className="flex flex-col gap-1">
                {p.tiers.map(t => (
                  <div key={t.name} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <NelvyonDsBadge tone={TIER_TONE[t.name] ?? "neutral"}>{t.name}</NelvyonDsBadge>
                    <span>desde {t.min_points.toLocaleString()} puntos</span>
                  </div>
                ))}
              </div>
            </div>
            <NelvyonDsButton onClick={saveSettings} disabled={saving} variant="primary">
              {saving ? "Guardando…" : "Guardar configuración"}
            </NelvyonDsButton>
          </NelvyonDsCard>
        )}
      </div>
    </SaasShellLayout>
  );
}
