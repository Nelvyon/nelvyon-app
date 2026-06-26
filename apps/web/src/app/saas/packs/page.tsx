"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";
import { NelvyonDsBadge } from "@/design-system/components";
import { SERVICE_PACK_CATEGORIES } from "@/lib/saas/servicePacksCatalog";
import type { PackStoreItem, StoreSummary, PackStoreAccess } from "@nelvyon/saas";

// ── Display helpers ───────────────────────────────────────────────────────────

const ACCESS_BADGE: Record<PackStoreAccess, { label: string; tone: "success" | "primary" | "warning" | "neutral" }> = {
  included: { label: "Incluido en plan", tone: "success" },
  owned: { label: "Comprado", tone: "primary" },
  purchasable: { label: "Add-on", tone: "warning" },
  coming_soon: { label: "Próximamente", tone: "neutral" },
};

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  SERVICE_PACK_CATEGORIES.map((c) => [c.id, c.label]),
);

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-5 py-4">
      <p className="text-white/40 text-xs uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
    </div>
  );
}

// ── Pack card ─────────────────────────────────────────────────────────────────

function PackCard({
  item,
  onLaunch,
  onPurchase,
  busy,
}: {
  item: PackStoreItem;
  onLaunch: (item: PackStoreItem) => void;
  onPurchase: (item: PackStoreItem) => void;
  busy: boolean;
}) {
  const badge = ACCESS_BADGE[item.access];
  const isComingSoon = item.availability === "coming_soon";
  const isBeta = item.availability === "beta";

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-white font-semibold text-sm">{item.name}</h3>
          <p className="text-white/40 text-[11px] mt-0.5">{CATEGORY_LABEL[item.category] ?? item.category}</p>
        </div>
        <NelvyonDsBadge tone={badge.tone}>{badge.label}</NelvyonDsBadge>
      </div>

      <p className="text-white/60 text-xs leading-relaxed flex-1">{item.tagline}</p>

      {item.outputs.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {item.outputs.slice(0, 4).map((o, i) => (
            <span key={i} className="rounded-md bg-white/5 px-2 py-0.5 text-[10px] text-white/50">{o}</span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between text-[11px] text-white/40">
        <span>⏱ ~{item.estimatedMinutes} min</span>
        {item.owned && item.launchesRemaining !== null && (
          <span>{item.launchesRemaining} lanzamiento(s) restantes</span>
        )}
        {item.owned && item.launchesRemaining === null && <span>Ilimitado</span>}
      </div>

      {/* CTA */}
      {isComingSoon ? (
        <button disabled className="rounded-lg bg-white/5 px-3 py-2 text-xs text-white/30 cursor-not-allowed">
          En desarrollo
        </button>
      ) : item.canLaunch ? (
        <button
          onClick={() => onLaunch(item)}
          className="rounded-lg bg-[#0084ff] px-3 py-2 text-xs text-white font-medium hover:bg-[#0070dd] transition-colors"
        >
          🚀 Lanzar ahora
        </button>
      ) : isBeta ? (
        <button
          onClick={() => onLaunch(item)}
          className="rounded-lg bg-white/10 px-3 py-2 text-xs text-white hover:bg-white/20 transition-colors"
        >
          Unirme a la lista (beta)
        </button>
      ) : (
        <button
          disabled={busy}
          onClick={() => onPurchase(item)}
          className="rounded-lg bg-emerald-600/80 px-3 py-2 text-xs text-white font-medium hover:bg-emerald-600 disabled:opacity-50 transition-colors"
        >
          {busy ? "Procesando…" : item.access === "included" ? "Activar" : "Comprar"}
        </button>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PackStorePage() {
  const router = useRouter();
  const [summary, setSummary] = useState<StoreSummary | null>(null);
  const [catalog, setCatalog] = useState<PackStoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<string>("all");
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/saas/packs");
      if (res.ok) {
        const d = (await res.json()) as { summary: StoreSummary; catalog: PackStoreItem[] };
        setSummary(d.summary);
        setCatalog(d.catalog ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function handleLaunch(item: PackStoreItem) {
    const target = item.launchPackId ?? item.id;
    router.push(`/saas/brief-to-launch?packId=${encodeURIComponent(target)}`);
  }

  async function handlePurchase(item: PackStoreItem) {
    setBusyId(item.id);
    try {
      const res = await fetch(`/api/saas/packs/${item.id}/purchase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const d = (await res.json().catch(() => ({}))) as {
        granted?: boolean;
        checkoutRequired?: boolean;
        billingUrl?: string;
        message?: string;
      };
      if (d.granted) {
        showToast(`${item.name} activado`);
        void load();
      } else if (d.checkoutRequired) {
        showToast(d.message ?? "Mejora tu plan para activar este pack");
        if (d.billingUrl) router.push(d.billingUrl);
      } else {
        showToast("No se pudo completar la operación");
      }
    } finally {
      setBusyId(null);
    }
  }

  const filtered = useMemo(() => {
    return catalog.filter((c) => {
      if (categoryFilter !== "all" && c.category !== categoryFilter) return false;
      if (availabilityFilter !== "all" && c.availability !== availabilityFilter) return false;
      return true;
    });
  }, [catalog, categoryFilter, availabilityFilter]);

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="pack-store" />}>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Pack Store</h1>
            <p className="text-white/50 text-sm mt-1">
              Explora, adquiere y lanza packs de marketing operados por IA
            </p>
          </div>
        </div>

        {/* Summary */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KpiCard label="Packs en catálogo" value={summary.totalPacks} />
            <KpiCard label="Disponibles" value={summary.available} />
            <KpiCard label="En tu cuenta" value={summary.owned} />
            <KpiCard
              label="Lanzamientos"
              value={summary.launchesRemaining === null ? "∞" : summary.launchesRemaining}
            />
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#0d1929] px-3 py-1.5 text-xs text-white"
          >
            <option value="all">Todas las categorías</option>
            {SERVICE_PACK_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
          <select
            value={availabilityFilter}
            onChange={(e) => setAvailabilityFilter(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#0d1929] px-3 py-1.5 text-xs text-white"
          >
            <option value="all">Cualquier estado</option>
            <option value="available">Disponible</option>
            <option value="beta">Beta</option>
            <option value="coming_soon">Próximamente</option>
          </select>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="text-white/40 text-sm py-12 text-center">Cargando catálogo…</div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-14 text-center space-y-2">
            <div className="text-4xl">🛒</div>
            <p className="text-white font-semibold">Sin packs para estos filtros</p>
            <p className="text-white/40 text-sm">Ajusta la categoría o el estado para ver más opciones.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((item) => (
              <PackCard
                key={item.id}
                item={item}
                onLaunch={handleLaunch}
                onPurchase={handlePurchase}
                busy={busyId === item.id}
              />
            ))}
          </div>
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
