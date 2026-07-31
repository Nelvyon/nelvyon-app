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

interface LoyaltyTier {
  name: string;
  min_points: number;
}
interface LoyaltyProgram {
  id: string;
  pointsPerEur: number;
  tiers: LoyaltyTier[];
  active: boolean;
}
interface LoyaltyBalance {
  id: string;
  contactId: string;
  points: number;
  tier: string;
  updatedAt: string;
}
interface LoyaltyTransaction {
  id: string;
  contactId: string;
  type: "earn" | "redeem" | "adjust";
  points: number;
  reason: string | null;
  referenceId: string | null;
  createdAt: string;
}

type BadgeTone = "neutral" | "primary" | "success" | "warning" | "danger";
type Tab = "members" | "earn" | "redeem" | "settings";

const TIER_TONE: Record<string, BadgeTone> = {
  Bronze: "warning",
  Silver: "neutral",
  Gold: "success",
  Platinum: "primary",
};
const TXN_LABEL: Record<string, string> = {
  earn: "Ganados",
  redeem: "Canjeados",
  adjust: "Ajuste",
};
const TXN_TONE: Record<string, BadgeTone> = {
  earn: "success",
  redeem: "warning",
  adjust: "primary",
};

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none";

async function apiFetch<T>(url: string, opts?: RequestInit): Promise<T> {
  const r = await fetch(url, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts?.headers ?? {}) },
  });
  if (!r.ok) {
    const e = (await r.json().catch(() => ({}))) as { error?: string };
    throw new Error(String(e.error ?? r.statusText));
  }
  return r.json() as Promise<T>;
}

export default function SaasLoyaltyPage() {
  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [balances, setBalances] = useState<LoyaltyBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionOk, setActionOk] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("members");

  const [earnContactId, setEarnContactId] = useState("");
  const [earnAmount, setEarnAmount] = useState("");
  const [earnReason, setEarnReason] = useState("");
  const [earning, setEarning] = useState(false);

  const [redeemContactId, setRedeemContactId] = useState("");
  const [redeemPoints, setRedeemPoints] = useState("");
  const [redeemReason, setRedeemReason] = useState("");
  const [adjustMode, setAdjustMode] = useState(false);
  const [redeeming, setRedeeming] = useState(false);

  const [cfgPPE, setCfgPPE] = useState("");
  const [cfgActive, setCfgActive] = useState(true);
  const [cfgTiers, setCfgTiers] = useState<LoyaltyTier[]>([]);
  const [saving, setSaving] = useState(false);

  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [txns, setTxns] = useState<LoyaltyTransaction[]>([]);
  const [txnsLoading, setTxnsLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, b] = await Promise.all([
        apiFetch<LoyaltyProgram>("/api/saas/loyalty?resource=program"),
        apiFetch<LoyaltyBalance[]>("/api/saas/loyalty?resource=balances"),
      ]);
      setProgram(p);
      setBalances(b);
      setCfgPPE(String(p.pointsPerEur));
      setCfgActive(p.active);
      setCfgTiers(p.tiers.map((t) => ({ ...t })));
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

  async function openMember(contactId: string) {
    setSelectedContact(contactId);
    setTxnsLoading(true);
    setActionError(null);
    try {
      const list = await apiFetch<LoyaltyTransaction[]>(
        `/api/saas/loyalty?resource=transactions&contactId=${encodeURIComponent(contactId)}`,
      );
      setTxns(list);
    } catch (e) {
      setActionError(String((e as Error).message));
      setTxns([]);
    } finally {
      setTxnsLoading(false);
    }
  }

  async function earn() {
    if (!earnContactId.trim() || !earnAmount.trim()) return;
    setEarning(true);
    setActionError(null);
    try {
      await apiFetch("/api/saas/loyalty", {
        method: "POST",
        body: JSON.stringify({
          action: "earn",
          contactId: earnContactId.trim(),
          eurAmount: Number(earnAmount),
          reason: earnReason || undefined,
        }),
      });
      setEarnContactId("");
      setEarnAmount("");
      setEarnReason("");
      flashOk("Puntos otorgados");
      await load();
    } catch (e) {
      setActionError(String((e as Error).message));
    } finally {
      setEarning(false);
    }
  }

  async function redeemOrAdjust() {
    if (!redeemContactId.trim() || !redeemPoints.trim()) return;
    const pts = Number(redeemPoints);
    if (!Number.isFinite(pts) || pts === 0) {
      setActionError("Indica una cantidad de puntos distinta de cero");
      return;
    }
    setRedeeming(true);
    setActionError(null);
    try {
      const contactId = redeemContactId.trim();
      if (adjustMode) {
        await apiFetch("/api/saas/loyalty", {
          method: "POST",
          body: JSON.stringify({
            action: "adjust",
            contactId,
            points: pts,
            reason: redeemReason || undefined,
          }),
        });
        flashOk("Saldo ajustado");
      } else {
        if (pts <= 0) {
          setActionError("Los puntos a canjear deben ser positivos");
          setRedeeming(false);
          return;
        }
        await apiFetch("/api/saas/loyalty", {
          method: "POST",
          body: JSON.stringify({
            action: "redeem",
            contactId,
            points: pts,
            reason: redeemReason || undefined,
          }),
        });
        flashOk("Puntos canjeados");
      }
      setRedeemContactId("");
      setRedeemPoints("");
      setRedeemReason("");
      await load();
      if (selectedContact === contactId) {
        await openMember(contactId);
      }
    } catch (e) {
      setActionError(String((e as Error).message));
    } finally {
      setRedeeming(false);
    }
  }

  async function saveSettings() {
    setSaving(true);
    setActionError(null);
    try {
      const tiers = cfgTiers
        .map((t) => ({ name: t.name.trim(), min_points: Number(t.min_points) }))
        .filter((t) => t.name.length > 0);
      await apiFetch("/api/saas/loyalty", {
        method: "POST",
        body: JSON.stringify({
          action: "update-program",
          pointsPerEur: Number(cfgPPE),
          active: cfgActive,
          tiers,
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

  if (loading) {
    return (
      <SaasShellLayout sidebar={<SaasSidebar activeId="loyalty" />}>
        <p className="p-8 text-sm text-muted-foreground" role="status">
          Cargando programa de fidelización…
        </p>
      </SaasShellLayout>
    );
  }

  if (error || !program) {
    return (
      <SaasShellLayout sidebar={<SaasSidebar activeId="loyalty" />}>
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

  const p = program;
  const tierCount: Record<string, number> = {};
  for (const b of balances) {
    tierCount[b.tier] = (tierCount[b.tier] ?? 0) + 1;
  }
  const totalPoints = balances.reduce((sum, b) => sum + b.points, 0);
  const goldIdx = p.tiers.findIndex((t) => t.name === "Gold");
  const goldPlus =
    goldIdx >= 0
      ? Object.entries(tierCount)
          .filter(([t]) => p.tiers.findIndex((x) => x.name === t) >= goldIdx)
          .reduce((sum, [, n]) => sum + n, 0)
      : 0;

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="loyalty" />}>
      <div className="flex flex-col gap-6 pb-8">
        <NelvyonDsSectionHeader
          title="Programa de Fidelización"
          subtitle={`${p.pointsPerEur} punto(s)/€ · ${p.tiers.length} niveles · ${balances.length} miembros · ${p.active ? "Activo" : "Pausado"}`}
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
          <KpiTile icon="👥" label="Miembros" value={balances.length} />
          <KpiTile icon="⭐" label="Puntos emitidos" value={totalPoints.toLocaleString("es-ES")} />
          <KpiTile icon="🥇" label="Gold+" value={goldPlus} accent />
          <KpiTile icon="📐" label="Puntos / €" value={p.pointsPerEur} />
        </div>

        <div className="flex flex-wrap gap-2">
          {p.tiers.map((tier) => (
            <NelvyonDsCard key={tier.name} className="flex items-center gap-2 p-3">
              <NelvyonDsBadge tone={TIER_TONE[tier.name] ?? "neutral"}>{tier.name}</NelvyonDsBadge>
              <span className="text-xs text-muted-foreground">≥ {tier.min_points.toLocaleString("es-ES")} pts</span>
              <span className="ml-2 text-xs font-semibold text-foreground">{tierCount[tier.name] ?? 0}</span>
            </NelvyonDsCard>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 border-b border-border" role="tablist" aria-label="Secciones fidelización">
          {(["members", "earn", "redeem", "settings"] as const).map((t) => (
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
              {t === "members"
                ? "Miembros"
                : t === "earn"
                  ? "Dar puntos"
                  : t === "redeem"
                    ? "Canjear / Ajustar"
                    : "Configuración"}
            </button>
          ))}
        </div>

        {tab === "members" && (
          <div className="flex flex-col gap-2">
            {balances.length === 0 ? (
              <NelvyonDsCard className="p-8 text-center text-sm text-muted-foreground">
                Sin miembros todavía. Usa «Dar puntos» para enrolar el primer contacto.
              </NelvyonDsCard>
            ) : (
              balances.map((b) => (
                <NelvyonDsCard key={b.id || b.contactId} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() => void openMember(b.contactId)}
                    aria-expanded={selectedContact === b.contactId}
                  >
                    <p className="truncate font-mono text-sm text-foreground">{b.contactId}</p>
                    <p className="text-xs text-muted-foreground">
                      Actualizado: {new Date(b.updatedAt).toLocaleDateString("es-ES")}
                      {" · "}
                      Ver historial
                    </p>
                  </button>
                  <NelvyonDsBadge tone={TIER_TONE[b.tier] ?? "neutral"}>{b.tier}</NelvyonDsBadge>
                  <span className="shrink-0 text-sm font-semibold text-foreground">
                    {b.points.toLocaleString("es-ES")} pts
                  </span>
                </NelvyonDsCard>
              ))
            )}

            {selectedContact && (
              <NelvyonDsCard className="mt-2 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    Historial · <span className="font-mono text-xs">{selectedContact}</span>
                  </h3>
                  <NelvyonDsButton size="sm" variant="ghost" onClick={() => setSelectedContact(null)}>
                    Cerrar
                  </NelvyonDsButton>
                </div>
                {txnsLoading ? (
                  <p className="text-sm text-muted-foreground" role="status">
                    Cargando transacciones…
                  </p>
                ) : txns.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin transacciones.</p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {txns.map((t) => (
                      <li
                        key={t.id}
                        className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-xs"
                      >
                        <NelvyonDsBadge tone={TXN_TONE[t.type] ?? "neutral"}>
                          {TXN_LABEL[t.type] ?? t.type}
                        </NelvyonDsBadge>
                        <span className="font-semibold text-foreground">
                          {t.points > 0 && t.type !== "redeem" ? "+" : ""}
                          {t.type === "redeem" ? -Math.abs(t.points) : t.points} pts
                        </span>
                        <span className="text-muted-foreground">
                          {new Date(t.createdAt).toLocaleString("es-ES")}
                        </span>
                        {t.reason && <span className="text-muted-foreground">· {t.reason}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </NelvyonDsCard>
            )}
          </div>
        )}

        {tab === "earn" && (
          <NelvyonDsCard className="flex max-w-md flex-col gap-4 p-6">
            <p className="text-sm font-medium text-foreground">Dar puntos a un contacto</p>
            {!p.active && (
              <p className="text-xs text-muted-foreground">
                El programa está pausado; puedes seguir otorgando puntos, pero conviene reactivarlo en Configuración.
              </p>
            )}
            <div>
              <label htmlFor="earn-contact" className="mb-1 block text-xs text-muted-foreground">
                Contact ID (UUID)
              </label>
              <input
                id="earn-contact"
                className={inputCls}
                value={earnContactId}
                onChange={(ev) => setEarnContactId(ev.target.value)}
                placeholder="uuid-del-contacto"
              />
            </div>
            <div>
              <label htmlFor="earn-amount" className="mb-1 block text-xs text-muted-foreground">
                Importe en euros (€)
              </label>
              <input
                id="earn-amount"
                className={inputCls}
                type="number"
                value={earnAmount}
                onChange={(ev) => setEarnAmount(ev.target.value)}
                placeholder="150"
                min={0.01}
                step={0.01}
              />
              {earnAmount && (
                <p className="mt-1 text-xs text-muted-foreground">
                  = {Math.floor(Number(earnAmount) * p.pointsPerEur)} puntos
                </p>
              )}
            </div>
            <div>
              <label htmlFor="earn-reason" className="mb-1 block text-xs text-muted-foreground">
                Razón (opcional)
              </label>
              <input
                id="earn-reason"
                className={inputCls}
                value={earnReason}
                onChange={(ev) => setEarnReason(ev.target.value)}
                placeholder="Compra #12345"
              />
            </div>
            <NelvyonDsButton
              onClick={() => void earn()}
              disabled={earning || !earnContactId.trim() || !earnAmount.trim()}
              variant="primary"
            >
              {earning ? "Procesando…" : "Dar puntos"}
            </NelvyonDsButton>
          </NelvyonDsCard>
        )}

        {tab === "redeem" && (
          <NelvyonDsCard className="flex max-w-md flex-col gap-4 p-6">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setAdjustMode(false)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                  !adjustMode
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground"
                }`}
              >
                Canjear
              </button>
              <button
                type="button"
                onClick={() => setAdjustMode(true)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                  adjustMode
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground"
                }`}
              >
                Ajuste manual
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              {adjustMode
                ? "Suma o resta puntos (usa valores negativos para restar). El saldo no baja de 0."
                : "Resta puntos del saldo del contacto (canje de recompensa)."}
            </p>
            <div>
              <label htmlFor="rdm-contact" className="mb-1 block text-xs text-muted-foreground">
                Contact ID (UUID)
              </label>
              <input
                id="rdm-contact"
                className={inputCls}
                value={redeemContactId}
                onChange={(ev) => setRedeemContactId(ev.target.value)}
                placeholder="uuid-del-contacto"
              />
            </div>
            <div>
              <label htmlFor="rdm-pts" className="mb-1 block text-xs text-muted-foreground">
                Puntos {adjustMode ? "(±)" : "a canjear"}
              </label>
              <input
                id="rdm-pts"
                className={inputCls}
                type="number"
                value={redeemPoints}
                onChange={(ev) => setRedeemPoints(ev.target.value)}
                placeholder={adjustMode ? "-50" : "100"}
                step={1}
              />
            </div>
            <div>
              <label htmlFor="rdm-reason" className="mb-1 block text-xs text-muted-foreground">
                Razón (opcional)
              </label>
              <input
                id="rdm-reason"
                className={inputCls}
                value={redeemReason}
                onChange={(ev) => setRedeemReason(ev.target.value)}
                placeholder={adjustMode ? "Corrección inventario" : "Cupón 10€"}
              />
            </div>
            <NelvyonDsButton
              onClick={() => void redeemOrAdjust()}
              disabled={redeeming || !redeemContactId.trim() || !redeemPoints.trim()}
              variant="primary"
            >
              {redeeming ? "Procesando…" : adjustMode ? "Aplicar ajuste" : "Canjear puntos"}
            </NelvyonDsButton>
          </NelvyonDsCard>
        )}

        {tab === "settings" && (
          <NelvyonDsCard className="flex max-w-md flex-col gap-6 p-6">
            <div>
              <label htmlFor="cfg-ppe" className="mb-1 block text-xs text-muted-foreground">
                Puntos por euro
              </label>
              <input
                id="cfg-ppe"
                className={inputCls}
                type="number"
                value={cfgPPE}
                onChange={(ev) => setCfgPPE(ev.target.value)}
                min={0.1}
                step={0.1}
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
            <div>
              <p className="mb-2 text-sm font-medium text-foreground">Niveles</p>
              <div className="flex flex-col gap-2">
                {cfgTiers.map((tier, idx) => (
                  <div key={`${tier.name}-${idx}`} className="flex gap-2">
                    <input
                      className={inputCls}
                      value={tier.name}
                      onChange={(ev) => {
                        const next = [...cfgTiers];
                        next[idx] = { ...tier, name: ev.target.value };
                        setCfgTiers(next);
                      }}
                      aria-label={`Nombre nivel ${idx + 1}`}
                    />
                    <input
                      className={`${inputCls} w-28 shrink-0`}
                      type="number"
                      min={0}
                      value={tier.min_points}
                      onChange={(ev) => {
                        const next = [...cfgTiers];
                        next[idx] = { ...tier, min_points: Number(ev.target.value) || 0 };
                        setCfgTiers(next);
                      }}
                      aria-label={`Mínimo puntos nivel ${idx + 1}`}
                    />
                  </div>
                ))}
              </div>
            </div>
            <NelvyonDsButton onClick={() => void saveSettings()} disabled={saving} variant="primary">
              {saving ? "Guardando…" : "Guardar configuración"}
            </NelvyonDsButton>
          </NelvyonDsCard>
        )}
      </div>
    </SaasShellLayout>
  );
}
