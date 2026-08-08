"use client";

/**
 * /saas/packs sobre `(cms)/content` de W3CRM, con las piezas ya portadas.
 * Mapeo: filtros y catálogo -> `W3crmContentBox` + rejilla de `card`; KPIs ->
 * `W3crmKpiTile`. Sin componentes nuevos.
 *
 * Inventario: sin `data-testid` y sin spec dedicado — lo cubre
 * `saas-nav-full-coverage`. Verificado con grep que ningún spec hace
 * aserciones de texto ni de rol sobre esta ruta.
 *
 * Lógica de NELVYON intacta: `GET /api/saas/packs` (summary + catálogo);
 * `POST /api/saas/packs/[id]/purchase` con sus tres desenlaces (`granted`,
 * `checkoutRequired` con su `billingUrl`, y el fallo genérico); el salto a
 * `/saas/brief-to-launch?packId=` usando `launchPackId ?? id`; los cuatro
 * estados de acceso; la distinción entre `coming_soon` (bloqueado), `beta`
 * (lista de espera) y `canLaunch`; el "Ilimitado" cuando
 * `launchesRemaining === null`; los dos filtros; y el toast de 3,5 s.
 */
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmEmptyState, W3crmKpiTile } from "@/features/saas-w3crm/components/W3crmUi";
import { W3crmCargando, W3crmContentBox } from "@/features/saas-w3crm/components/W3crmContentBox";
import { SERVICE_PACK_CATEGORIES } from "@/lib/saas/servicePacksCatalog";
import type { PackStoreItem, StoreSummary } from "@nelvyon/saas";

const ACCESS_BADGE: Record<string, { label: string; badge: string }> = {
  included: { label: "Incluido en plan", badge: "badge-success" },
  owned: { label: "Comprado", badge: "badge-primary" },
  purchasable: { label: "Add-on", badge: "badge-warning" },
  coming_soon: { label: "Próximamente", badge: "badge-secondary" },
};

const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(
  SERVICE_PACK_CATEGORIES.map((c) => [c.id, c.label]),
);

/** Un `access` fuera de catálogo hacía estallar `badge.tone`. */
function accessBadge(a: unknown) {
  return ACCESS_BADGE[String(a ?? "")] ?? { label: String(a ?? "—"), badge: "badge-secondary" };
}
function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
function txt(v: unknown): string { return typeof v === "string" ? v : ""; }

function PackCard({ item, onLaunch, onPurchase, busy }: {
  item: PackStoreItem;
  onLaunch: (item: PackStoreItem) => void;
  onPurchase: (item: PackStoreItem) => void;
  busy: boolean;
}) {
  const badge = accessBadge(item.access);
  const isComingSoon = item.availability === "coming_soon";
  const isBeta = item.availability === "beta";
  // `outputs` podía no ser array y reventaba `.length`/`.slice`.
  const outputs = Array.isArray(item.outputs) ? item.outputs : [];

  return (
    <div className="card border mb-3 h-100">
      <div className="card-body d-flex flex-column">
        <div className="d-flex align-items-start justify-content-between gap-2">
          <div>
            <span className="fw-bold d-block">{txt(item.name) || "—"}</span>
            <span className="text-muted fs-12">
              {CATEGORY_LABEL[item.category] ?? (txt(item.category) || "—")}
            </span>
          </div>
          <span className={`badge ${badge.badge}`}>{badge.label}</span>
        </div>

        <p className="text-muted fs-12 mt-2 flex-grow-1">{txt(item.tagline)}</p>

        {outputs.length > 0 && (
          <div className="mb-2">
            {outputs.slice(0, 4).map((o, i) => (
              <span key={i} className="badge badge-secondary me-1 mb-1">{txt(o)}</span>
            ))}
          </div>
        )}

        <div className="d-flex align-items-center justify-content-between text-muted fs-12 mb-3">
          <span>~{num(item.estimatedMinutes)} min</span>
          {item.owned && item.launchesRemaining !== null && (
            <span>{num(item.launchesRemaining)} lanzamiento(s) restantes</span>
          )}
          {item.owned && item.launchesRemaining === null && <span>Ilimitado</span>}
        </div>

        {isComingSoon ? (
          <button type="button" className="btn btn-primary light btn-sm w-100" disabled>
            En desarrollo
          </button>
        ) : item.canLaunch ? (
          <button type="button" className="btn btn-primary btn-sm w-100"
            aria-label={`Lanzar ahora ${item.name}`} onClick={() => onLaunch(item)}>
            Lanzar ahora
          </button>
        ) : isBeta ? (
          <button type="button" className="btn btn-primary light btn-sm w-100"
            aria-label={`Unirme a la lista beta de ${item.name}`} onClick={() => onLaunch(item)}>
            Unirme a la lista (beta)
          </button>
        ) : (
          <button type="button" className="btn btn-success btn-sm w-100" disabled={busy}
            aria-label={`${item.access === "included" ? "Activar" : "Comprar"} ${item.name}`}
            onClick={() => onPurchase(item)}>
            {busy ? "Procesando…" : item.access === "included" ? "Activar" : "Comprar"}
          </button>
        )}
      </div>
    </div>
  );
}

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
    window.setTimeout(() => setToast(null), 3500);
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/saas/packs");
      if (res.ok) {
        const d = (await res.json().catch(() => ({}))) as {
          summary?: StoreSummary; catalog?: PackStoreItem[];
        };
        if (d.summary && typeof d.summary === "object") setSummary(d.summary);
        setCatalog(Array.isArray(d.catalog) ? d.catalog : []);
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
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Pack Store" parentTitle="Gestión" pageTitle="Packs" />
      <div className="container-fluid">
        <div className="row">
          {summary && (
            <>
              <div className="col-xl-3 col-sm-6">
                <W3crmKpiTile label="Packs en catálogo" value={num(summary.totalPacks)} accent />
              </div>
              <div className="col-xl-3 col-sm-6">
                <W3crmKpiTile label="Disponibles" value={num(summary.available)} />
              </div>
              <div className="col-xl-3 col-sm-6">
                <W3crmKpiTile label="En tu cuenta" value={num(summary.owned)} />
              </div>
              <div className="col-xl-3 col-sm-6">
                <W3crmKpiTile
                  label="Lanzamientos"
                  value={summary.launchesRemaining === null ? "∞" : num(summary.launchesRemaining)}
                />
              </div>
            </>
          )}

          <div className="col-xl-12">
            <p className="fs-14 text-muted">
              Explora, adquiere y lanza packs de marketing operados por IA
            </p>

            {toast && <div className="alert alert-primary" role="status">{toast}</div>}

            <W3crmContentBox titulo="Catálogo de packs" icono="fa-solid fa-cart-shopping">
              <div className="row align-items-end mb-3">
                <div className="col-xl-4 col-sm-6">
                  <div className="form-group mb-2">
                    <label htmlFor="pk-categoria" className="text-black font-w600">Categoría</label>
                    <select id="pk-categoria" className="form-control" value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}>
                      <option value="all">Todas las categorías</option>
                      {SERVICE_PACK_CATEGORIES.map((c) => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="col-xl-4 col-sm-6">
                  <div className="form-group mb-2">
                    <label htmlFor="pk-estado" className="text-black font-w600">Estado</label>
                    <select id="pk-estado" className="form-control" value={availabilityFilter}
                      onChange={(e) => setAvailabilityFilter(e.target.value)}>
                      <option value="all">Cualquier estado</option>
                      <option value="available">Disponible</option>
                      <option value="beta">Beta</option>
                      <option value="coming_soon">Próximamente</option>
                    </select>
                  </div>
                </div>
              </div>

              {loading ? (
                <W3crmCargando texto="Cargando catálogo…" />
              ) : filtered.length === 0 ? (
                <W3crmEmptyState
                  title="Sin packs para estos filtros"
                  description="Ajusta la categoría o el estado para ver más opciones."
                />
              ) : (
                <div className="row">
                  {filtered.map((item) => (
                    <div className="col-xl-4 col-sm-6" key={item.id}>
                      <PackCard
                        item={item}
                        onLaunch={handleLaunch}
                        onPurchase={handlePurchase}
                        busy={busyId === item.id}
                      />
                    </div>
                  ))}
                </div>
              )}
            </W3crmContentBox>
          </div>
        </div>
      </div>
    </SaasW3crmShell>
  );
}
