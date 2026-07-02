"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";
import { NelvyonDsBadge } from "@/design-system/components";
import type {
  PartnerZoneSummary,
  WholesaleSku,
  ConnectStatus,
  PartnerEligibility,
  LedgerEntry,
  LedgerTotals,
} from "@nelvyon/saas";

type Tab = "resumen" | "subcuentas" | "wholesale" | "connect" | "ledger" | "referidos";

const TABS: { id: Tab; label: string }[] = [
  { id: "resumen", label: "Resumen" },
  { id: "subcuentas", label: "Subcuentas" },
  { id: "wholesale", label: "Wholesale" },
  { id: "connect", label: "Connect" },
  { id: "ledger", label: "Ledger" },
  { id: "referidos", label: "Referidos" },
];

function eur(n: number): string {
  return `${n.toFixed(2)}€`;
}

function KpiCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-5 py-4">
      <p className="text-white/40 text-xs uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
      {hint && <p className="text-white/30 text-[10px] mt-0.5">{hint}</p>}
    </div>
  );
}

function ConnectBadge({ connect }: { connect: ConnectStatus }) {
  if (connect.connected && connect.chargesEnabled) return <NelvyonDsBadge tone="success">Conectado</NelvyonDsBadge>;
  if (connect.accountId) return <NelvyonDsBadge tone="warning">Pendiente</NelvyonDsBadge>;
  return <NelvyonDsBadge tone="neutral">Sin conectar</NelvyonDsBadge>;
}

export default function PartnerZonePage() {
  const [tab, setTab] = useState<Tab>("resumen");
  const [summary, setSummary] = useState<PartnerZoneSummary | null>(null);
  const [catalog, setCatalog] = useState<WholesaleSku[]>([]);
  const [connect, setConnect] = useState<ConnectStatus | null>(null);
  const [eligibility, setEligibility] = useState<PartnerEligibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  // Ledger (lazy)
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [ledgerTotals, setLedgerTotals] = useState<LedgerTotals | null>(null);
  const [ledgerLoaded, setLedgerLoaded] = useState(false);

  // Referrals (lazy)
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<Array<Record<string, unknown>>>([]);
  const [referralsLoaded, setReferralsLoaded] = useState(false);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/saas/partner");
      if (res.ok) {
        const d = (await res.json()) as {
          summary: PartnerZoneSummary; catalog: WholesaleSku[]; connect: ConnectStatus; eligibility: PartnerEligibility;
        };
        setSummary(d.summary);
        setCatalog(d.catalog ?? []);
        setConnect(d.connect);
        setEligibility(d.eligibility);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function loadLedger() {
    if (ledgerLoaded) return;
    const res = await fetch("/api/saas/partner/ledger");
    if (res.ok) {
      const d = (await res.json()) as { entries: LedgerEntry[]; totals: LedgerTotals };
      setLedger(d.entries ?? []);
      setLedgerTotals(d.totals);
    }
    setLedgerLoaded(true);
  }

  async function loadReferrals() {
    if (referralsLoaded) return;
    const res = await fetch("/api/saas/partner/referrals");
    if (res.ok) {
      const d = (await res.json()) as { partner: { referralCode: string }; referrals: Array<Record<string, unknown>> };
      setReferralCode(d.partner?.referralCode ?? null);
      setReferrals(d.referrals ?? []);
    }
    setReferralsLoaded(true);
  }

  useEffect(() => {
    if (tab === "ledger") void loadLedger();
    if (tab === "referidos") void loadReferrals();
     
  }, [tab]);

  async function saveRetail(sku: string, retailEur: number) {
    const res = await fetch("/api/saas/partner/retail-prices", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sku, retailEur }),
    });
    if (res.ok) {
      const d = (await res.json()) as { item: WholesaleSku };
      setCatalog((prev) => prev.map((c) => (c.sku === sku ? d.item : c)));
      showToast("Precio retail actualizado");
    } else {
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      showToast(d.error ?? "No se pudo guardar");
    }
  }

  async function onboardConnect() {
    const res = await fetch("/api/saas/partner/connect/onboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const d = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    if (res.ok && d.url) window.location.href = d.url;
    else showToast(d.error ?? "Stripe Connect no disponible");
  }

  async function registerPartner() {
    const res = await fetch("/api/saas/partner/register", { method: "POST" });
    if (res.ok) {
      showToast("¡Registrado como partner!");
      setReferralsLoaded(false);
      void loadReferrals();
    } else {
      showToast("No se pudo registrar");
    }
  }

  // ── Upsell gate ────────────────────────────────────────────────────────────
  if (!loading && eligibility && !eligibility.eligible) {
    return (
      <SaasShellLayout sidebar={<SaasSidebar activeId="partner" />}>
        <div className="p-6">
          <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-14 text-center space-y-4 max-w-xl mx-auto">
            <div className="text-5xl">🤝</div>
            <h1 className="text-xl font-bold text-white">Partner Zone</h1>
            <p className="text-white/50 text-sm">
              Tu plan actual es <strong className="text-white/80">{eligibility.plan}</strong>. La Partner Zone
              (catálogo wholesale, rebilling y Stripe Connect) está disponible para los planes
              <strong className="text-white/80"> Agency</strong> y <strong className="text-white/80">Agency Partner</strong>.
            </p>
            <Link href="/saas/billing" className="inline-block rounded-xl bg-[#0084ff] px-5 py-2.5 text-sm text-white font-medium hover:bg-[#0070dd]">
              Mejorar a Agency Partner
            </Link>
          </div>
        </div>
      </SaasShellLayout>
    );
  }

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="partner" />}>
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold text-white">🤝 Partner Zone</h1>
          <p className="text-white/50 text-sm mt-1">Tu HQ de agencia: wholesale, subcuentas, Connect y ledger</p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 border-b border-white/10">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-2 text-xs font-medium transition-colors ${
                tab === t.id ? "text-white border-b-2 border-[#0084ff]" : "text-white/40 hover:text-white/70"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="text-white/40 text-sm py-12 text-center">Cargando Partner Zone…</div>
        ) : (
          <>
            {/* RESUMEN */}
            {tab === "resumen" && summary && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <KpiCard label="Subcuentas activas" value={summary.subcuentasActive} />
                  <KpiCard label="Margen acumulado" value={eur(summary.marginTotal)} hint="rebilling" />
                  <KpiCard label="Facturado bruto" value={eur(summary.grossTotal)} />
                  <div className="rounded-xl border border-white/10 bg-white/5 px-5 py-4">
                    <p className="text-white/40 text-xs uppercase tracking-wide">Stripe Connect</p>
                    <div className="mt-2"><ConnectBadge connect={summary.connect} /></div>
                  </div>
                </div>
                {!summary.connect.connected && (
                  <button onClick={() => void onboardConnect()} className="rounded-xl bg-[#0084ff] px-4 py-2 text-sm text-white hover:bg-[#0070dd]">
                    Conectar Stripe
                  </button>
                )}
              </div>
            )}

            {/* SUBCUENTAS */}
            {tab === "subcuentas" && summary && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <p className="text-white/60 text-sm">Últimas subcuentas</p>
                  <Link href="/saas/subcuentas" className="text-[#0084ff] text-xs hover:underline">Gestionar todas →</Link>
                </div>
                {summary.recentSubcuentas.length === 0 ? (
                  <p className="text-white/30 text-sm">Aún no tienes subcuentas. <Link href="/saas/subcuentas" className="text-[#0084ff] hover:underline">Crear la primera</Link>.</p>
                ) : (
                  <div className="rounded-xl border border-white/10 divide-y divide-white/5">
                    {summary.recentSubcuentas.map((s) => (
                      <div key={s.id} className="flex justify-between items-center px-4 py-2.5">
                        <span className="text-white/80 text-xs">{s.name}</span>
                        <NelvyonDsBadge tone={s.status === "active" ? "success" : "neutral"}>{s.status}</NelvyonDsBadge>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* WHOLESALE */}
            {tab === "wholesale" && (
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-white/40 text-xs uppercase tracking-wide">
                      <th className="px-4 py-3 text-left">SKU</th>
                      <th className="px-4 py-3 text-right">Wholesale</th>
                      <th className="px-4 py-3 text-right">Tu retail</th>
                      <th className="px-4 py-3 text-right">Margen</th>
                      <th className="px-4 py-3 text-right">%</th>
                      <th className="px-4 py-3 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catalog.map((c) => (
                      <RetailRow key={c.sku} item={c} onSave={saveRetail} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* CONNECT */}
            {tab === "connect" && connect && (
              <div className="space-y-4 max-w-lg">
                <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-3">
                  <div className="flex justify-between"><span className="text-white/50 text-xs">Estado</span><ConnectBadge connect={connect} /></div>
                  <div className="flex justify-between text-xs"><span className="text-white/50">Charges habilitados</span><span className="text-white/80">{connect.chargesEnabled ? "✅" : "❌"}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-white/50">Payouts habilitados</span><span className="text-white/80">{connect.payoutsEnabled ? "✅" : "❌"}</span></div>
                  {connect.accountId && <div className="flex justify-between text-xs"><span className="text-white/50">Account ID</span><span className="text-white/40 font-mono">{connect.accountId}</span></div>}
                </div>
                {!connect.connected && (
                  <>
                    <button onClick={() => void onboardConnect()} className="rounded-xl bg-[#0084ff] px-4 py-2 text-sm text-white hover:bg-[#0070dd]">
                      {connect.accountId ? "Continuar onboarding" : "Conectar Stripe"}
                    </button>
                    <p className="text-white/30 text-[11px]">Si Stripe Connect no está configurado en este entorno, verás un aviso al continuar.</p>
                  </>
                )}
              </div>
            )}

            {/* LEDGER */}
            {tab === "ledger" && (
              <div className="space-y-4">
                {ledgerTotals && (
                  <div className="grid grid-cols-3 gap-4">
                    <KpiCard label="Bruto" value={eur(ledgerTotals.gross)} />
                    <KpiCard label="Wholesale" value={eur(ledgerTotals.wholesale)} />
                    <KpiCard label="Margen" value={eur(ledgerTotals.margin)} />
                  </div>
                )}
                {ledger.length === 0 ? (
                  <p className="text-white/30 text-sm">Sin movimientos de rebilling todavía.</p>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-white/10">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-white/40 text-xs uppercase tracking-wide">
                          <th className="px-4 py-3 text-left">Fecha</th>
                          <th className="px-4 py-3 text-left">Origen</th>
                          <th className="px-4 py-3 text-right">Bruto</th>
                          <th className="px-4 py-3 text-right">Wholesale</th>
                          <th className="px-4 py-3 text-right">Margen</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ledger.map((e, i) => (
                          <tr key={i} className="border-b border-white/5">
                            <td className="px-4 py-2.5 text-white/50 text-xs">{new Date(e.createdAt).toLocaleDateString()}</td>
                            <td className="px-4 py-2.5"><NelvyonDsBadge tone={e.source === "connect" ? "primary" : "neutral"}>{e.source}</NelvyonDsBadge></td>
                            <td className="px-4 py-2.5 text-right text-white/80 text-xs">{eur(e.grossEur)}</td>
                            <td className="px-4 py-2.5 text-right text-white/50 text-xs">{eur(e.wholesaleEur)}</td>
                            <td className="px-4 py-2.5 text-right text-green-400 text-xs">{eur(e.marginEur)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* REFERIDOS */}
            {tab === "referidos" && (
              <div className="space-y-4 max-w-lg">
                {referralCode ? (
                  <>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-5 space-y-2">
                      <p className="text-white/40 text-xs uppercase">Tu código de referido</p>
                      <div className="flex items-center gap-2">
                        <code className="text-[#0084ff] text-lg font-mono">{referralCode}</code>
                        <button
                          onClick={() => { void navigator.clipboard.writeText(referralCode); showToast("Código copiado"); }}
                          className="text-white/40 hover:text-white text-xs"
                        >
                          copiar
                        </button>
                      </div>
                    </div>
                    <div>
                      <p className="text-white/60 text-sm mb-2">Comisiones ({referrals.length})</p>
                      {referrals.length === 0 ? (
                        <p className="text-white/30 text-xs">Sin comisiones todavía.</p>
                      ) : (
                        <div className="rounded-xl border border-white/10 divide-y divide-white/5">
                          {referrals.map((r, i) => (
                            <div key={i} className="flex justify-between px-4 py-2 text-xs">
                              <span className="text-white/60">{String((r as { status?: string }).status ?? "—")}</span>
                              <span className="text-green-400">{String((r as { commissionEur?: number }).commissionEur ?? "")}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-5 text-center space-y-3">
                    <p className="text-white/60 text-sm">Aún no estás registrado en el programa de referidos.</p>
                    <button onClick={() => void registerPartner()} className="rounded-xl bg-[#0084ff] px-4 py-2 text-sm text-white hover:bg-[#0070dd]">
                      Unirme al programa
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {toast && (
          <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-[#0084ff] px-4 py-2 text-white text-sm shadow-lg">
            {toast}
          </div>
        )}
      </div>
    </SaasShellLayout>
  );
}

// ── Inline-editable retail row ──────────────────────────────────────────────────

function RetailRow({ item, onSave }: { item: WholesaleSku; onSave: (sku: string, retail: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(item.retailEur));

  return (
    <tr className="border-b border-white/5">
      <td className="px-4 py-3">
        <p className="text-white/80 text-xs">{item.label}</p>
        <p className="text-white/30 text-[10px]">{item.sku}{item.hasOverride ? " · personalizado" : ""}</p>
      </td>
      <td className="px-4 py-3 text-right text-white/50 text-xs">{eur(item.wholesaleEur)}</td>
      <td className="px-4 py-3 text-right">
        {editing ? (
          <input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-20 rounded bg-[#0d1929] border border-white/10 px-2 py-1 text-xs text-white text-right"
          />
        ) : (
          <span className="text-white text-xs font-medium">{eur(item.retailEur)}</span>
        )}
      </td>
      <td className="px-4 py-3 text-right text-green-400 text-xs">{eur(item.marginEur)}</td>
      <td className="px-4 py-3 text-right text-white/50 text-xs">{item.marginPct}%</td>
      <td className="px-4 py-3 text-right">
        {editing ? (
          <div className="flex gap-1 justify-end">
            <button
              onClick={() => { onSave(item.sku, parseFloat(value)); setEditing(false); }}
              className="text-green-400 text-[11px] hover:underline"
            >
              guardar
            </button>
            <button onClick={() => { setValue(String(item.retailEur)); setEditing(false); }} className="text-white/40 text-[11px]">cancelar</button>
          </div>
        ) : (
          <button onClick={() => setEditing(true)} className="text-[#0084ff] text-[11px] hover:underline">editar</button>
        )}
      </td>
    </tr>
  );
}
