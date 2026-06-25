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

interface AffiliateProgram { id: string; commissionPct: number; cookieDays: number; active: boolean }
interface AffiliateLink {
  id: string; code: string; affiliateUserId: string;
  clicks: number; conversions: number; active: boolean; createdAt: string; affiliateUrl: string;
}
interface AffiliateCommission {
  id: string; affiliateUserId: string; amount: number;
  commissionPct: number; commissionAmount: number;
  status: "pending" | "approved" | "paid"; createdAt: string;
}
interface ProgramStats {
  program: AffiliateProgram; links: AffiliateLink[];
  pendingAmount: number; approvedAmount: number; paidAmount: number; totalConversions: number;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = { pending: "Pendiente", approved: "Aprobada", paid: "Pagada" };
type BadgeTone = "neutral" | "primary" | "success" | "warning" | "danger";
const STATUS_TONE: Record<string, BadgeTone> = { pending: "warning", approved: "primary", paid: "success" };

async function apiFetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const r = await fetch(url, { ...opts, headers: { "Content-Type": "application/json", ...(opts?.headers ?? {}) } });
  if (!r.ok) { const e = await r.json().catch(() => ({})) as { error?: string }; throw new Error(String(e.error ?? r.statusText)); }
  return r.json() as Promise<T>;
}

const inputCls = "w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary";

// ── Main Page ────────────────────────────────────────────────────────────────

export default function SaasAffiliatesPage() {
  const [stats, setStats]       = useState<ProgramStats | null>(null);
  const [commissions, setComms] = useState<AffiliateCommission[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [tab, setTab]           = useState<"links" | "commissions" | "settings">("links");
  const [newUserId, setNewUserId] = useState("");
  const [creating, setCreating]   = useState(false);
  const [cfgCommPct, setCfgCommPct]   = useState("");
  const [cfgCookieDays, setCfgCookieDays] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, c] = await Promise.all([
        apiFetch<ProgramStats>("/api/saas/affiliates?resource=stats"),
        apiFetch<AffiliateCommission[]>("/api/saas/affiliates?resource=commissions"),
      ]);
      setStats(s); setComms(c);
      setCfgCommPct(String(s.program.commissionPct));
      setCfgCookieDays(String(s.program.cookieDays));
    } catch (e) { setError(String((e as Error).message)); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const createLink = async () => {
    if (!newUserId.trim()) return;
    setCreating(true);
    try {
      await apiFetch("/api/saas/affiliates", { method: "POST", body: JSON.stringify({ action: "create-link", affiliateUserId: newUserId.trim() }) });
      setNewUserId("");
      await load();
    } catch (e) { alert(String((e as Error).message)); }
    finally { setCreating(false); }
  };

  const approveCommission = async (id: string) => {
    try {
      await apiFetch("/api/saas/affiliates", { method: "POST", body: JSON.stringify({ action: "approve-commission", id }) });
      await load();
    } catch (e) { alert(String((e as Error).message)); }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      await apiFetch("/api/saas/affiliates", { method: "POST", body: JSON.stringify({ action: "update-program", commissionPct: Number(cfgCommPct), cookieDays: Number(cfgCookieDays) }) });
      await load();
    } catch (e) { alert(String((e as Error).message)); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="affiliates" />}>
      <p className="text-muted-foreground text-sm p-8">Cargando programa de afiliados…</p>
    </SaasShellLayout>
  );
  if (error) return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="affiliates" />}>
      <p className="text-destructive text-sm p-8">{error}</p>
    </SaasShellLayout>
  );

  const s = stats!;

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="affiliates" />}>
      <div className="flex flex-col gap-6 pb-8">
        <NelvyonDsSectionHeader
          title="Programa de Afiliados"
          subtitle={`Comisión ${s.program.commissionPct}% · Cookie ${s.program.cookieDays} días · ${s.links.length} enlaces`}
        />

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Conversiones",     value: String(s.totalConversions) },
            { label: "Pendiente pago",   value: `${s.pendingAmount.toFixed(2)} €` },
            { label: "Aprobado",         value: `${s.approvedAmount.toFixed(2)} €` },
            { label: "Pagado",           value: `${s.paidAmount.toFixed(2)} €` },
          ].map(k => (
            <NelvyonDsCard key={k.label} className="p-4">
              <p className="text-xs text-muted-foreground">{k.label}</p>
              <p className="text-2xl font-bold text-foreground mt-1">{k.value}</p>
            </NelvyonDsCard>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-border">
          {(["links", "commissions", "settings"] as const).map(t => (
            <button key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            >
              {t === "links" ? "Enlaces" : t === "commissions" ? "Comisiones" : "Configuración"}
            </button>
          ))}
        </div>

        {/* LINKS */}
        {tab === "links" && (
          <div className="flex flex-col gap-4">
            <NelvyonDsCard className="p-4 flex gap-2 items-end">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">ID del afiliado (email, user_id…)</p>
                <input className={inputCls} value={newUserId} onChange={(ev: React.ChangeEvent<HTMLInputElement>) => setNewUserId(ev.target.value)} placeholder="john@empresa.com" />
              </div>
              <NelvyonDsButton onClick={createLink} disabled={creating || !newUserId.trim()} variant="primary">
                {creating ? "Creando…" : "Crear enlace"}
              </NelvyonDsButton>
            </NelvyonDsCard>
            {s.links.length === 0 ? (
              <NelvyonDsCard className="p-8 text-center text-muted-foreground text-sm">Sin enlaces. Crea el primero arriba.</NelvyonDsCard>
            ) : (
              s.links.map(link => (
                <NelvyonDsCard key={link.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono text-foreground truncate">{link.affiliateUrl}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Afiliado: {link.affiliateUserId}</p>
                  </div>
                  <div className="flex gap-4 shrink-0 text-xs text-muted-foreground">
                    <span>{link.clicks} clics</span>
                    <span>{link.conversions} conv.</span>
                  </div>
                  <button onClick={() => { void navigator.clipboard.writeText(link.affiliateUrl); }} className="text-xs text-primary hover:underline shrink-0">
                    Copiar
                  </button>
                </NelvyonDsCard>
              ))
            )}
          </div>
        )}

        {/* COMMISSIONS */}
        {tab === "commissions" && (
          <div className="flex flex-col gap-2">
            {commissions.length === 0 ? (
              <NelvyonDsCard className="p-8 text-center text-muted-foreground text-sm">Sin comisiones registradas.</NelvyonDsCard>
            ) : (
              commissions.map(c => (
                <NelvyonDsCard key={c.id} className="p-4 flex flex-col md:flex-row md:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground font-medium">{c.affiliateUserId}</p>
                    <p className="text-xs text-muted-foreground">
                      Importe: {c.amount.toFixed(2)} € · Comisión: {c.commissionAmount.toFixed(2)} € ({c.commissionPct}%)
                    </p>
                  </div>
                  <NelvyonDsBadge tone={STATUS_TONE[c.status] ?? "neutral"}>
                    {STATUS_LABEL[c.status] ?? c.status}
                  </NelvyonDsBadge>
                  {c.status === "pending" && (
                    <NelvyonDsButton size="sm" variant="secondary" onClick={() => { void approveCommission(c.id); }}>
                      Aprobar
                    </NelvyonDsButton>
                  )}
                </NelvyonDsCard>
              ))
            )}
          </div>
        )}

        {/* SETTINGS */}
        {tab === "settings" && (
          <NelvyonDsCard className="p-6 flex flex-col gap-4 max-w-sm">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Comisión (%)</p>
              <input className={inputCls} type="number" value={cfgCommPct} onChange={(ev: React.ChangeEvent<HTMLInputElement>) => setCfgCommPct(ev.target.value)} min="0" max="100" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Ventana de cookie (días)</p>
              <input className={inputCls} type="number" value={cfgCookieDays} onChange={(ev: React.ChangeEvent<HTMLInputElement>) => setCfgCookieDays(ev.target.value)} min="1" />
            </div>
            <NelvyonDsButton onClick={saveConfig} disabled={saving} variant="primary">
              {saving ? "Guardando…" : "Guardar configuración"}
            </NelvyonDsButton>
          </NelvyonDsCard>
        )}
      </div>
    </SaasShellLayout>
  );
}
