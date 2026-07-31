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

// ── Types ────────────────────────────────────────────────────────────────────

interface AffiliateProgram {
  id: string;
  commissionPct: number;
  cookieDays: number;
  active: boolean;
}
interface AffiliateLink {
  id: string;
  code: string;
  affiliateUserId: string;
  clicks: number;
  conversions: number;
  active: boolean;
  createdAt: string;
  affiliateUrl: string;
}
interface AffiliateCommission {
  id: string;
  affiliateUserId: string;
  amount: number;
  commissionPct: number;
  commissionAmount: number;
  status: "pending" | "approved" | "paid";
  stripeTransferId: string | null;
  createdAt: string;
}
interface ProgramStats {
  program: AffiliateProgram;
  links: AffiliateLink[];
  pendingAmount: number;
  approvedAmount: number;
  paidAmount: number;
  totalConversions: number;
}

type BadgeTone = "neutral" | "primary" | "success" | "warning" | "danger";
type Tab = "links" | "commissions" | "settings";
type CommissionFilter = "all" | "pending" | "approved" | "paid";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendiente",
  approved: "Aprobada",
  paid: "Pagada",
};
const STATUS_TONE: Record<string, BadgeTone> = {
  pending: "warning",
  approved: "primary",
  paid: "success",
};

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none";

async function apiFetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const r = await fetch(url, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts?.headers ?? {}) },
  });
  if (!r.ok) {
    const e = (await r.json().catch(() => ({}))) as { error?: string; code?: string };
    const msg = String(e.error ?? r.statusText);
    throw Object.assign(new Error(msg), { code: e.code });
  }
  return r.json() as Promise<T>;
}

export default function SaasAffiliatesPage() {
  const [stats, setStats] = useState<ProgramStats | null>(null);
  const [commissions, setComms] = useState<AffiliateCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionOk, setActionOk] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("links");
  const [commFilter, setCommFilter] = useState<CommissionFilter>("all");
  const [newUserId, setNewUserId] = useState("");
  const [creating, setCreating] = useState(false);
  const [cfgCommPct, setCfgCommPct] = useState("");
  const [cfgCookieDays, setCfgCookieDays] = useState("");
  const [cfgActive, setCfgActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, c] = await Promise.all([
        apiFetch<ProgramStats>("/api/saas/affiliates?resource=stats"),
        apiFetch<AffiliateCommission[]>("/api/saas/affiliates?resource=commissions"),
      ]);
      setStats(s);
      setComms(c);
      setCfgCommPct(String(s.program.commissionPct));
      setCfgCookieDays(String(s.program.cookieDays));
      setCfgActive(s.program.active);
    } catch (e) {
      setError(String((e as Error).message));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function flashOk(msg: string) {
    setActionOk(msg);
    setActionError(null);
    window.setTimeout(() => setActionOk(null), 3500);
  }

  async function createLink() {
    if (!newUserId.trim()) return;
    setCreating(true);
    setActionError(null);
    try {
      await apiFetch("/api/saas/affiliates", {
        method: "POST",
        body: JSON.stringify({ action: "create-link", affiliateUserId: newUserId.trim() }),
      });
      setNewUserId("");
      flashOk("Enlace creado");
      await load();
    } catch (e) {
      setActionError(String((e as Error).message));
    } finally {
      setCreating(false);
    }
  }

  async function toggleLink(link: AffiliateLink) {
    setBusyId(link.id);
    setActionError(null);
    try {
      await apiFetch("/api/saas/affiliates", {
        method: "POST",
        body: JSON.stringify({ action: "set-link-active", id: link.id, active: !link.active }),
      });
      flashOk(link.active ? "Enlace pausado" : "Enlace reactivado");
      await load();
    } catch (e) {
      setActionError(String((e as Error).message));
    } finally {
      setBusyId(null);
    }
  }

  async function approveCommission(id: string) {
    setBusyId(id);
    setActionError(null);
    try {
      await apiFetch("/api/saas/affiliates", {
        method: "POST",
        body: JSON.stringify({ action: "approve-commission", id }),
      });
      flashOk("Comisión aprobada");
      await load();
    } catch (e) {
      setActionError(String((e as Error).message));
    } finally {
      setBusyId(null);
    }
  }

  async function markPaid(id: string) {
    setBusyId(id);
    setActionError(null);
    try {
      await apiFetch("/api/saas/affiliates", {
        method: "POST",
        body: JSON.stringify({ action: "mark-paid", id }),
      });
      flashOk("Comisión marcada como pagada");
      await load();
    } catch (e) {
      const err = e as Error & { code?: string };
      setActionError(
        err.code === "CEO_GATE"
          ? `${err.message} (los pagos reales requieren autorización CEO; la comisión permanece aprobada).`
          : String(err.message),
      );
    } finally {
      setBusyId(null);
    }
  }

  async function saveConfig() {
    setSaving(true);
    setActionError(null);
    try {
      await apiFetch("/api/saas/affiliates", {
        method: "POST",
        body: JSON.stringify({
          action: "update-program",
          commissionPct: Number(cfgCommPct),
          cookieDays: Number(cfgCookieDays),
          active: cfgActive,
        }),
      });
      flashOk("Configuración guardada");
      await load();
    } catch (e) {
      setActionError(String((e as Error).message));
    } finally {
      setSaving(false);
    }
  }

  async function copyUrl(link: AffiliateLink) {
    try {
      await navigator.clipboard.writeText(link.affiliateUrl);
      setCopiedId(link.id);
      window.setTimeout(() => setCopiedId((cur) => (cur === link.id ? null : cur)), 2000);
    } catch {
      setActionError("No se pudo copiar al portapapeles");
    }
  }

  const filteredCommissions =
    commFilter === "all" ? commissions : commissions.filter((c) => c.status === commFilter);

  if (loading) {
    return (
      <SaasShellLayout sidebar={<SaasSidebar activeId="affiliates" />}>
        <p className="p-8 text-sm text-muted-foreground" role="status">
          Cargando programa de afiliados…
        </p>
      </SaasShellLayout>
    );
  }

  if (error || !stats) {
    return (
      <SaasShellLayout sidebar={<SaasSidebar activeId="affiliates" />}>
        <div className="flex flex-col gap-4 p-8">
          <p className="text-sm text-destructive" role="alert">
            {error ?? "No se pudo cargar el programa"}
          </p>
          <NelvyonDsButton variant="secondary" onClick={() => void load()}>
            Reintentar
          </NelvyonDsButton>
        </div>
      </SaasShellLayout>
    );
  }

  const s = stats;

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="affiliates" />}>
      <div className="flex flex-col gap-6 pb-8">
        <NelvyonDsSectionHeader
          title="Programa de Afiliados"
          subtitle={`Comisión ${s.program.commissionPct}% · Cookie ${s.program.cookieDays} días · ${s.links.length} enlaces · ${s.program.active ? "Activo" : "Pausado"}`}
        />

        {actionError && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive" role="alert">
            {actionError}
          </p>
        )}
        {actionOk && (
          <p className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-sm text-primary" role="status">
            {actionOk}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiTile icon="🔗" label="Conversiones" value={s.totalConversions} />
          <KpiTile icon="⏳" label="Pendiente pago" value={`${s.pendingAmount.toFixed(2)} €`} />
          <KpiTile icon="✅" label="Aprobado" value={`${s.approvedAmount.toFixed(2)} €`} accent />
          <KpiTile icon="💶" label="Pagado" value={`${s.paidAmount.toFixed(2)} €`} />
        </div>

        <div className="flex gap-2 border-b border-border" role="tablist" aria-label="Secciones afiliados">
          {(["links", "commissions", "settings"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                tab === t
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "links" ? "Enlaces" : t === "commissions" ? "Comisiones" : "Configuración"}
            </button>
          ))}
        </div>

        {tab === "links" && (
          <div className="flex flex-col gap-4">
            <NelvyonDsCard className="flex flex-col items-stretch gap-3 p-4 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1">
                <label htmlFor="aff-user" className="mb-1 block text-xs text-muted-foreground">
                  ID del afiliado (email, user_id…)
                </label>
                <input
                  id="aff-user"
                  className={inputCls}
                  value={newUserId}
                  onChange={(ev) => setNewUserId(ev.target.value)}
                  placeholder="john@empresa.com"
                  aria-label="ID del afiliado"
                />
              </div>
              <NelvyonDsButton
                onClick={() => void createLink()}
                disabled={creating || !newUserId.trim() || !s.program.active}
                variant="primary"
              >
                {creating ? "Creando…" : "Crear enlace"}
              </NelvyonDsButton>
            </NelvyonDsCard>
            {!s.program.active && (
              <p className="text-xs text-muted-foreground">
                El programa está pausado. Reactívalo en Configuración para crear nuevos enlaces.
              </p>
            )}
            {s.links.length === 0 ? (
              <NelvyonDsCard className="p-8 text-center text-sm text-muted-foreground">
                Sin enlaces. Crea el primero arriba.
              </NelvyonDsCard>
            ) : (
              s.links.map((link) => (
                <NelvyonDsCard key={link.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-sm text-foreground">{link.affiliateUrl}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Afiliado: {link.affiliateUserId} · Código {link.code}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-4 text-xs text-muted-foreground">
                    <span>{link.clicks} clics</span>
                    <span>{link.conversions} conv.</span>
                  </div>
                  <NelvyonDsBadge tone={link.active ? "success" : "neutral"}>
                    {link.active ? "Activo" : "Pausado"}
                  </NelvyonDsBadge>
                  <button
                    type="button"
                    onClick={() => void copyUrl(link)}
                    className="shrink-0 text-xs text-primary hover:underline"
                  >
                    {copiedId === link.id ? "Copiado" : "Copiar"}
                  </button>
                  <NelvyonDsButton
                    size="sm"
                    variant="secondary"
                    disabled={busyId === link.id}
                    onClick={() => void toggleLink(link)}
                  >
                    {link.active ? "Pausar" : "Reactivar"}
                  </NelvyonDsButton>
                </NelvyonDsCard>
              ))
            )}
          </div>
        )}

        {tab === "commissions" && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar comisiones">
              {(["all", "pending", "approved", "paid"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setCommFilter(f)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    commFilter === f
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f === "all" ? "Todas" : STATUS_LABEL[f]}
                </button>
              ))}
            </div>
            {filteredCommissions.length === 0 ? (
              <NelvyonDsCard className="p-8 text-center text-sm text-muted-foreground">
                Sin comisiones{commFilter !== "all" ? ` en estado «${STATUS_LABEL[commFilter]}»` : " registradas"}.
              </NelvyonDsCard>
            ) : (
              filteredCommissions.map((c) => (
                <NelvyonDsCard key={c.id} className="flex flex-col gap-3 p-4 md:flex-row md:items-center">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{c.affiliateUserId}</p>
                    <p className="text-xs text-muted-foreground">
                      Importe: {c.amount.toFixed(2)} € · Comisión: {c.commissionAmount.toFixed(2)} € ({c.commissionPct}%)
                      {" · "}
                      {new Date(c.createdAt).toLocaleDateString("es-ES")}
                      {c.stripeTransferId ? ` · Transfer ${c.stripeTransferId}` : ""}
                    </p>
                  </div>
                  <NelvyonDsBadge tone={STATUS_TONE[c.status] ?? "neutral"}>
                    {STATUS_LABEL[c.status] ?? c.status}
                  </NelvyonDsBadge>
                  {c.status === "pending" && (
                    <NelvyonDsButton
                      size="sm"
                      variant="secondary"
                      disabled={busyId === c.id}
                      onClick={() => void approveCommission(c.id)}
                    >
                      Aprobar
                    </NelvyonDsButton>
                  )}
                  {c.status === "approved" && (
                    <NelvyonDsButton
                      size="sm"
                      variant="primary"
                      disabled={busyId === c.id}
                      onClick={() => void markPaid(c.id)}
                    >
                      Marcar pagada
                    </NelvyonDsButton>
                  )}
                </NelvyonDsCard>
              ))
            )}
          </div>
        )}

        {tab === "settings" && (
          <NelvyonDsCard className="flex max-w-sm flex-col gap-4 p-6">
            <div>
              <label htmlFor="cfg-pct" className="mb-1 block text-xs text-muted-foreground">
                Comisión (%)
              </label>
              <input
                id="cfg-pct"
                className={inputCls}
                type="number"
                value={cfgCommPct}
                onChange={(ev) => setCfgCommPct(ev.target.value)}
                min={0}
                max={100}
                step={0.01}
              />
            </div>
            <div>
              <label htmlFor="cfg-cookie" className="mb-1 block text-xs text-muted-foreground">
                Ventana de cookie (días)
              </label>
              <input
                id="cfg-cookie"
                className={inputCls}
                type="number"
                value={cfgCookieDays}
                onChange={(ev) => setCfgCookieDays(ev.target.value)}
                min={1}
                max={3650}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={cfgActive}
                onChange={(ev) => setCfgActive(ev.target.checked)}
                className="rounded border-border"
              />
              Programa activo
            </label>
            <NelvyonDsButton onClick={() => void saveConfig()} disabled={saving} variant="primary">
              {saving ? "Guardando…" : "Guardar configuración"}
            </NelvyonDsButton>
          </NelvyonDsCard>
        )}
      </div>
    </SaasShellLayout>
  );
}
