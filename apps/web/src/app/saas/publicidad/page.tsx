"use client";

/**
 * /saas/publicidad sobre `(cms)/content` de W3CRM, con las piezas ya portadas.
 * Mapeo: campañas y atribución -> `W3crmContentBox` + `W3crmDataTable`; los
 * cuatro diálogos -> `W3crmModal`; métricas por plataforma -> `W3crmKpiTile`.
 * Sin componentes nuevos.
 *
 * CONTRATO — `saas-publicidad-attribution.spec.ts` exige, y aquí se conserva:
 *   - `getByRole("heading", { name: "Publicidad Digital" })` (l.13):
 *     `W3crmPageTitle` emite `h5.bc-title`, que `getByRole("heading")` sí ve.
 *   - `getByRole("button", { name: /Métricas y campañas/i })` y
 *     `/Atribución multi-touch/i` (l.58-59): las pestañas siguen siendo
 *     `<button>` SIN `role` explícito; ponerles `role="tab"` cambiaría el rol
 *     implícito y dejarían de encontrarse.
 *   - al pulsar Atribución debe dispararse `/api/saas/ads/attribution` y
 *     aparecer `Sin campañas vinculadas` (l.96-98): `AttributionTab` solo se
 *     monta en esa pestaña y hace su fetch al montar, y el vacío conserva ese
 *     texto exacto.
 *   - la carga principal sigue pasando por `/api/saas/ads` (l.12).
 *
 * Ningún título de `W3crmContentBox` contiene "Métricas y campañas",
 * "Atribución multi-touch", "Conectar cuenta" ni "Publicidad Digital": el
 * toggle de la caja expone `aria-label="Plegar <título>"` y crearía un segundo
 * botón con ese nombre accesible.
 *
 * A11y (`a11y-core-routes.spec.ts:33`): el botón visible de la página es
 * "+ Conectar plataforma" —copy original, se conserva—, así que la aserción
 * sobre `/conectar cuenta/i` sigue sin dispararse igual que hoy. Lo que sí se
 * corrige es el fondo: el input de Account ID no tenía `<label>` asociado (ni
 * `htmlFor` ni anidado), de modo que `getByLabel(/account id/i)` nunca habría
 * funcionado. Ahora todos los campos de los cuatro diálogos llevan `htmlFor`.
 *
 * Lógica de NELVYON intacta: `GET /api/saas/ads` (estado de plataformas) y
 * `GET /api/saas/ads?platform=&date_start=&date_end=` (métricas); `POST
 * /api/saas/ads` de alta de cuenta con su `extra_config.developerToken` solo
 * para Google; `GET/POST /api/saas/ads/campaigns` con su caso especial
 * `code === "NOT_CONNECTED"` (que vacía sin error), `POST
 * /api/saas/ads/campaigns/create` y `PATCH /api/saas/ads/campaigns/[id]`;
 * `GET /api/saas/ads/attribution?resource=roas&model=&days=` con su guardia
 * `lastFetch` contra respuestas fuera de orden, y su `POST { action: "link" }`;
 * los cinco enlaces OAuth; la ventana de 30 días; y los umbrales de ROAS
 * (>=2 verde, >=1 ámbar).
 */
import { useCallback, useEffect, useRef, useState } from "react";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmEmptyState, W3crmKpiTile } from "@/features/saas-w3crm/components/W3crmUi";
import {
  W3crmCargando,
  W3crmContentBox,
  W3crmDataTable,
  W3crmModal,
} from "@/features/saas-w3crm/components/W3crmContentBox";

type AdsPlatform = "meta" | "google" | "linkedin" | "tiktok" | "snapchat";

interface AdsStatusResult {
  platform: AdsPlatform;
  connected: boolean;
  accountName?: string;
  tokenExpired?: boolean;
}

interface AdsMetrics {
  platform: AdsPlatform;
  dateStart: string;
  dateEnd: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number | null;
  cpc: number | null;
  roas: number | null;
  fromCache: boolean;
  fetchedAt: string;
}

const PLATFORM_CFG: Record<string, { label: string; icon: string; tokenLabel: string; tokenPlaceholder: string }> = {
  google: { label: "Google Ads", icon: "fa-brands fa-google", tokenLabel: "OAuth Access Token", tokenPlaceholder: "ya29..." },
  meta: { label: "Meta Ads", icon: "fa-brands fa-meta", tokenLabel: "Access Token", tokenPlaceholder: "EAAG..." },
  linkedin: { label: "LinkedIn Ads", icon: "fa-brands fa-linkedin", tokenLabel: "Access Token", tokenPlaceholder: "AQV..." },
  tiktok: { label: "TikTok Ads", icon: "fa-brands fa-tiktok", tokenLabel: "Access Token", tokenPlaceholder: "d4ff..." },
  snapchat: { label: "Snapchat Ads", icon: "fa-brands fa-snapchat", tokenLabel: "OAuth Access Token", tokenPlaceholder: "Bearer token..." },
};
const PLATFORM_IDS: AdsPlatform[] = ["meta", "google", "linkedin", "tiktok", "snapchat"];

/** Una plataforma fuera de catálogo hacía estallar `cfg.icon`. */
function cfgOf(platform: string) {
  return PLATFORM_CFG[platform] ?? {
    label: platform || "—",
    icon: "fa-solid fa-bullhorn",
    tokenLabel: "Access Token",
    tokenPlaceholder: "token...",
  };
}
function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
/** `null` es "sin dato" y se pinta "-"; cualquier otra cosa se sanea a 0. */
function opt(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}
function fmt(n: unknown) { return num(n).toLocaleString("es-ES", { maximumFractionDigits: 2 }); }
function eur(n: unknown) { return `${num(n).toFixed(2)} EUR`; }
function today() { return new Date().toISOString().slice(0, 10); }
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); }
/** Clase de color por umbral de ROAS: >=2 verde, >=1 ámbar. */
function roasClass(v: number) { return v >= 2 ? "text-success fw-bold" : v >= 1 ? "text-warning" : "text-danger"; }

const OAUTH_HREF: Record<string, string> = {
  meta: "/api/oauth/meta",
  google: "/api/oauth/google",
  linkedin: "/api/oauth/linkedin",
  tiktok: "/api/oauth/tiktok",
  snapchat: "/api/oauth/snapchat",
};

// ── Conectar cuenta publicitaria ─────────────────────────────────────────────
function ConnectModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [platform, setPlatform] = useState<AdsPlatform>("meta");
  const [accountId, setAccountId] = useState("");
  const [accountName, setAccountName] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [developerToken, setDeveloperToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!accountId.trim() || !accessToken.trim()) { setError("Account ID y Access Token son obligatorios"); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/saas/ads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform,
          account_id: accountId.trim(),
          account_name: accountName.trim() || accountId.trim(),
          access_token: accessToken.trim(),
          extra_config: platform === "google" && developerToken.trim()
            ? { developerToken: developerToken.trim() }
            : undefined,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Error al conectar cuenta");
      }
      onSaved(); onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally { setSaving(false); }
  }

  const cfg = cfgOf(platform);

  return (
    <W3crmModal titulo="Conectar cuenta publicitaria" onClose={onClose} error={error} size="lg">
      <form onSubmit={(e) => void submit(e)}>
        <div className="form-group mb-3">
          <span className="text-black font-w600 d-block mb-2">Plataforma</span>
          <div role="group" aria-label="Plataforma publicitaria">
            {PLATFORM_IDS.map((p) => (
              <button key={p} type="button" aria-pressed={platform === p}
                className={`btn btn-sm me-1 mb-1 ${platform === p ? "btn-primary" : "btn-primary light"}`}
                onClick={() => setPlatform(p)}>
                <i className={`${cfgOf(p).icon} me-2`} aria-hidden="true" />
                {cfgOf(p).label.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>

        <div className="alert alert-primary py-2" role="note">
          <span className="fs-12 d-block mb-2">Conexión recomendada — OAuth oficial:</span>
          <a className="btn btn-primary btn-sm" href={OAUTH_HREF[platform] ?? "/saas/integraciones"}>
            Conectar {cfg.label.split(" ")[0]} OAuth
          </a>
        </div>

        {/* `htmlFor` real: sin él `getByLabel(/account id/i)` no resolvía. */}
        <div className="form-group mb-3">
          <label htmlFor="ads-account-id" className="text-black font-w600">
            Account ID <span className="required">*</span>
          </label>
          <input id="ads-account-id" className="form-control" placeholder="act_123456789"
            value={accountId} onChange={(e) => setAccountId(e.target.value)} />
        </div>
        <div className="form-group mb-3">
          <label htmlFor="ads-account-name" className="text-black font-w600">Nombre de cuenta</label>
          <input id="ads-account-name" className="form-control" placeholder="Mi cuenta de publicidad"
            value={accountName} onChange={(e) => setAccountName(e.target.value)} />
        </div>
        <div className="form-group mb-3">
          <label htmlFor="ads-token" className="text-black font-w600">
            {cfg.tokenLabel} <span className="required">*</span>
          </label>
          <input id="ads-token" className="form-control" type="password" placeholder={cfg.tokenPlaceholder}
            value={accessToken} onChange={(e) => setAccessToken(e.target.value)} />
        </div>
        {platform === "google" && (
          <div className="form-group mb-3">
            <label htmlFor="ads-dev-token" className="text-black font-w600">
              Google Ads Developer Token <span className="required">*</span>
            </label>
            <input id="ads-dev-token" className="form-control" type="password"
              placeholder="Developer token de Google Ads API Center"
              value={developerToken} onChange={(e) => setDeveloperToken(e.target.value)} />
          </div>
        )}
        {(platform === "tiktok" || platform === "snapchat") && (
          <div className="alert alert-primary py-2 fs-12" role="note">
            {platform === "tiktok"
              ? "TikTok: genera el Access Token desde TikTok for Business → Marketing API → App → Access Token."
              : "Snapchat: genera el token OAuth desde Snapchat Business → Snap Marketing API → OAuth."}
          </div>
        )}
        <div className="alert alert-warning py-2 fs-12" role="note">
          El token se almacena cifrado. Necesitas permisos de lectura de metricas.
        </div>
        <div className="text-end">
          <button type="button" className="btn btn-primary light me-2" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Conectando..." : "Conectar cuenta"}
          </button>
        </div>
      </form>
    </W3crmModal>
  );
}

type AdsCampaign = { id: string; name: string; status: string; platform: string; dailyBudget: number | null };

const OBJECTIVES: Record<string, string> = {
  LINK_CLICKS: "Clics en enlace", LEAD_GENERATION: "Generación de leads",
  CONVERSIONS: "Conversiones", BRAND_AWARENESS: "Notoriedad de marca",
  REACH: "Alcance", VIDEO_VIEWS: "Visualizaciones de vídeo",
};

function CreateCampaignModal({ platform, onClose, onSaved }: {
  platform: AdsPlatform; onClose: () => void; onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [budget, setBudget] = useState("10");
  const [objective, setObjective] = useState("LINK_CLICKS");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const dailyBudgetUsd = parseFloat(budget);
    if (!name.trim() || isNaN(dailyBudgetUsd) || dailyBudgetUsd <= 0) {
      setError("Nombre y presupuesto válido son obligatorios"); return;
    }
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/saas/ads/campaigns/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, name: name.trim(), daily_budget_usd: dailyBudgetUsd, objective }),
      });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!d.ok) throw new Error(d.error ?? "Error al crear campaña");
      onSaved(); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : "Error"); }
    finally { setSaving(false); }
  }

  return (
    <W3crmModal titulo={`Crear campaña — ${String(platform).toUpperCase()}`} onClose={onClose} error={error}>
      <form onSubmit={(e) => void submit(e)}>
        <div className="form-group mb-3">
          <label htmlFor="camp-nombre" className="text-black font-w600">
            Nombre de campaña <span className="required">*</span>
          </label>
          <input id="camp-nombre" className="form-control" placeholder="Ej: Captación verano 2026"
            value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="form-group mb-3">
          <label htmlFor="camp-ppto" className="text-black font-w600">
            Presupuesto diario (USD) <span className="required">*</span>
          </label>
          <input id="camp-ppto" className="form-control" type="number" min="0.01" step="0.01"
            value={budget} onChange={(e) => setBudget(e.target.value)} />
        </div>
        {platform === "meta" && (
          <div className="form-group mb-3">
            <label htmlFor="camp-objetivo" className="text-black font-w600">Objetivo</label>
            <select id="camp-objetivo" className="form-control" value={objective}
              onChange={(e) => setObjective(e.target.value)}>
              {Object.entries(OBJECTIVES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        )}
        <p className="fs-12 text-muted">
          La campaña se creará en estado <strong>Pausada</strong>. Actívala desde el panel de campañas.
        </p>
        <div className="text-end">
          <button type="button" className="btn btn-primary light me-2" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Creando…" : "Crear campaña"}
          </button>
        </div>
      </form>
    </W3crmModal>
  );
}

function EditBudgetModal({ campaign, platform, onClose, onSaved }: {
  campaign: AdsCampaign; platform: AdsPlatform; onClose: () => void; onSaved: () => void;
}) {
  const [budget, setBudget] = useState(String(campaign.dailyBudget ?? 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const dailyBudgetUsd = parseFloat(budget);
    if (isNaN(dailyBudgetUsd) || dailyBudgetUsd <= 0) { setError("Presupuesto debe ser mayor a 0"); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/saas/ads/campaigns/${campaign.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, daily_budget_usd: dailyBudgetUsd }),
      });
      const d = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!d.ok) throw new Error(d.error ?? "Error al actualizar presupuesto");
      onSaved(); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : "Error"); }
    finally { setSaving(false); }
  }

  return (
    <W3crmModal titulo="Editar presupuesto" onClose={onClose} error={error}>
      <p className="fs-14 text-muted">{campaign.name || "—"}</p>
      <form onSubmit={(e) => void submit(e)}>
        <div className="form-group mb-3">
          <label htmlFor="camp-ppto-edit" className="text-black font-w600">
            Presupuesto diario (USD) <span className="required">*</span>
          </label>
          <input id="camp-ppto-edit" className="form-control" type="number" min="0.01" step="0.01"
            value={budget} onChange={(e) => setBudget(e.target.value)} />
        </div>
        <div className="text-end">
          <button type="button" className="btn btn-primary light me-2" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </W3crmModal>
  );
}

function CampaignsSection({ platform }: { platform: AdsPlatform }) {
  const [campaigns, setCampaigns] = useState<AdsCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editCampaign, setEditCampaign] = useState<AdsCampaign | null>(null);

  const load = useCallback(() => {
    setLoading(true); setError(null);
    fetch(`/api/saas/ads/campaigns?platform=${platform}`)
      .then((r) => r.json() as Promise<{ campaigns?: AdsCampaign[]; error?: string; code?: string }>)
      .then((d) => {
        // `NOT_CONNECTED` no es un error de usuario: vacía sin mensaje.
        if (d?.error && d.code === "NOT_CONNECTED") { setCampaigns([]); setError(null); }
        else if (d?.error) setError(d.error);
        else setCampaigns(Array.isArray(d?.campaigns) ? d.campaigns : []);
      })
      .catch(() => setError("Error de red"))
      .finally(() => setLoading(false));
  }, [platform]);

  useEffect(() => { void load(); }, [load]);

  async function toggle(c: AdsCampaign) {
    setToggling(c.id);
    try {
      const action = c.status === "ACTIVE" ? "pause" : "activate";
      const res = await fetch("/api/saas/ads/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, campaign_id: c.id, action }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Error");
      }
      load();
    } catch (err) { setError(err instanceof Error ? err.message : "Error"); }
    finally { setToggling(null); }
  }

  return (
    <>
      <W3crmContentBox
        titulo={`Campañas ${cfgOf(platform).label}`}
        icono="fa-solid fa-rectangle-ad"
        acciones={
          <button type="button" className="btn btn-primary btn-sm me-2" onClick={() => setShowCreate(true)}>
            + Crear campaña
          </button>
        }
      >
        {error && <div className="alert alert-danger py-2 fs-14" role="alert">{error}</div>}
        {loading ? (
          <W3crmCargando texto="Cargando campañas…" />
        ) : campaigns.length === 0 ? (
          <W3crmEmptyState
            title={`Sin campañas en ${String(platform).toUpperCase()}`}
            description="Crea la primera con el botón de la cabecera."
          />
        ) : (
          <W3crmDataTable
            filas={campaigns}
            etiqueta="campañas"
            wrapperId={`ads_campaigns_${platform}_wrapper`}
            porPagina={10}
            columnas={[
              { titulo: "Campaña" },
              { titulo: "Presupuesto" },
              { titulo: "Estado" },
              { titulo: "Gestión", alFinal: true },
            ]}
            render={(c) => (
              <tr key={c.id}>
                <td><span className="fw-bold">{c.name || "—"}</span></td>
                <td>
                  {c.dailyBudget != null ? (
                    <>
                      {num(c.dailyBudget).toFixed(2)} USD
                      <button type="button" className="btn btn-link btn-sm p-0 ms-2"
                        aria-label={`Editar presupuesto de ${c.name}`}
                        onClick={() => setEditCampaign(c)}>
                        Editar
                      </button>
                    </>
                  ) : "—"}
                </td>
                <td>
                  <span className={`badge ${c.status === "ACTIVE" ? "badge-success" : "badge-secondary"}`}>
                    {c.status === "ACTIVE" ? "Activa" : "Pausada"}
                  </span>
                </td>
                <td className="text-end">
                  <button type="button" className="btn btn-primary light btn-sm" disabled={toggling === c.id}
                    aria-label={`${c.status === "ACTIVE" ? "Pausar" : "Activar"} ${c.name}`}
                    onClick={() => void toggle(c)}>
                    {toggling === c.id ? "…" : c.status === "ACTIVE" ? "Pausar" : "Activar"}
                  </button>
                </td>
              </tr>
            )}
          />
        )}
      </W3crmContentBox>
      {showCreate && <CreateCampaignModal platform={platform} onClose={() => setShowCreate(false)} onSaved={load} />}
      {editCampaign && (
        <EditBudgetModal campaign={editCampaign} platform={platform}
          onClose={() => setEditCampaign(null)} onSaved={load} />
      )}
    </>
  );
}

function MetricsCard({ platform, dateStart, dateEnd }: {
  platform: AdsPlatform; dateStart: string; dateEnd: string;
}) {
  const [metrics, setMetrics] = useState<AdsMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true); setError(null);
    fetch(`/api/saas/ads?platform=${platform}&date_start=${dateStart}&date_end=${dateEnd}`)
      .then((r) => r.json() as Promise<{ metrics?: AdsMetrics; error?: string }>)
      .then((d) => {
        if (d?.metrics && typeof d.metrics === "object") setMetrics(d.metrics);
        else setError(d?.error ?? "Error");
      })
      .catch(() => setError("Error de red"))
      .finally(() => setLoading(false));
  }, [platform, dateStart, dateEnd]);

  const cfg = cfgOf(platform);
  const ctr = opt(metrics?.ctr);
  const roas = opt(metrics?.roas);

  return (
    <W3crmContentBox
      titulo={`${cfg.label} · ${dateStart} a ${dateEnd}`}
      icono={cfg.icon}
      acciones={metrics?.fromCache ? <span className="badge badge-primary me-2">cache</span> : undefined}
    >
      {loading ? (
        <W3crmCargando texto="Cargando métricas…" />
      ) : error ? (
        <div className="alert alert-danger py-2 fs-14 mb-0" role="alert">{error}</div>
      ) : metrics ? (
        <div className="row">
          <div className="col-xl-2 col-sm-4"><W3crmKpiTile label="Gasto" value={eur(metrics.spend)} accent /></div>
          <div className="col-xl-2 col-sm-4"><W3crmKpiTile label="Impresiones" value={fmt(metrics.impressions)} /></div>
          <div className="col-xl-2 col-sm-4"><W3crmKpiTile label="Clics" value={fmt(metrics.clicks)} /></div>
          <div className="col-xl-2 col-sm-4"><W3crmKpiTile label="Conversiones" value={fmt(metrics.conversions)} /></div>
          <div className="col-xl-2 col-sm-4">
            <W3crmKpiTile label="CTR" value={ctr != null ? `${ctr.toFixed(2)}%` : "-"} />
          </div>
          <div className="col-xl-2 col-sm-4">
            <W3crmKpiTile
              label="ROAS"
              value={roas != null ? <span className={roasClass(roas)}>{roas.toFixed(2)}x</span> : "-"}
            />
          </div>
        </div>
      ) : null}
    </W3crmContentBox>
  );
}

type AdsAttributionModel = "first_touch" | "last_touch" | "linear" | "time_decay";

interface AdsCampaignLink {
  id: string; tenantId: string; platform: string;
  externalCampaignId: string; externalCampaignName: string | null;
  utmCampaign: string; utmSource: string | null; utmMedium: string | null;
  createdAt: string;
}

interface AttributedRoasRow {
  link: AdsCampaignLink;
  spend: number;
  attributedCredit: number;
  attributedConversions: number;
  attributedRoas: number | null;
  model: AdsAttributionModel;
}

const MODEL_LABELS: Record<string, string> = {
  first_touch: "Primer toque",
  last_touch: "Último toque",
  linear: "Lineal",
  time_decay: "Decaimiento temporal",
};

function LinkCampaignModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [platform, setPlatform] = useState<AdsPlatform>("meta");
  const [campaignId, setCampaignId] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [utmSource, setUtmSource] = useState("");
  const [utmMedium, setUtmMedium] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!campaignId.trim() || !utmCampaign.trim()) {
      setError("Campaign ID y UTM Campaign son obligatorios"); return;
    }
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/saas/ads/attribution", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "link",
          platform,
          external_campaign_id: campaignId.trim(),
          external_campaign_name: campaignName.trim() || undefined,
          utm_campaign: utmCampaign.trim(),
          utm_source: utmSource.trim() || undefined,
          utm_medium: utmMedium.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Error al vincular campaña");
      }
      onSaved(); onClose();
    } catch (err) { setError(err instanceof Error ? err.message : "Error"); }
    finally { setSaving(false); }
  }

  return (
    <W3crmModal titulo="Vincular campaña Ads ↔ UTM" onClose={onClose} error={error} size="lg">
      <form onSubmit={(e) => void submit(e)}>
        <div className="form-group mb-3">
          <span className="text-black font-w600 d-block mb-2">Plataforma</span>
          <div role="group" aria-label="Plataforma de la campaña">
            {PLATFORM_IDS.map((p) => (
              <button key={p} type="button" aria-pressed={platform === p}
                className={`btn btn-sm me-1 mb-1 ${platform === p ? "btn-primary" : "btn-primary light"}`}
                onClick={() => setPlatform(p)}>
                <i className={`${cfgOf(p).icon} me-2`} aria-hidden="true" />
                {cfgOf(p).label.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>
        <div className="row">
          <div className="col-sm-6">
            <div className="form-group mb-3">
              <label htmlFor="atr-camp-id" className="text-black font-w600">
                Campaign ID (plataforma) <span className="required">*</span>
              </label>
              <input id="atr-camp-id" className="form-control" placeholder="12345678"
                value={campaignId} onChange={(e) => setCampaignId(e.target.value)} />
            </div>
          </div>
          <div className="col-sm-6">
            <div className="form-group mb-3">
              <label htmlFor="atr-camp-nombre" className="text-black font-w600">Nombre (opcional)</label>
              <input id="atr-camp-nombre" className="form-control" placeholder="Captación verano"
                value={campaignName} onChange={(e) => setCampaignName(e.target.value)} />
            </div>
          </div>
          <div className="col-sm-4">
            <div className="form-group mb-3">
              <label htmlFor="atr-utm-camp" className="text-black font-w600">
                utm_campaign <span className="required">*</span>
              </label>
              <input id="atr-utm-camp" className="form-control" placeholder="verano_2026"
                value={utmCampaign} onChange={(e) => setUtmCampaign(e.target.value)} />
            </div>
          </div>
          <div className="col-sm-4">
            <div className="form-group mb-3">
              <label htmlFor="atr-utm-source" className="text-black font-w600">utm_source</label>
              <input id="atr-utm-source" className="form-control" placeholder="meta"
                value={utmSource} onChange={(e) => setUtmSource(e.target.value)} />
            </div>
          </div>
          <div className="col-sm-4">
            <div className="form-group mb-3">
              <label htmlFor="atr-utm-medium" className="text-black font-w600">utm_medium</label>
              <input id="atr-utm-medium" className="form-control" placeholder="cpc"
                value={utmMedium} onChange={(e) => setUtmMedium(e.target.value)} />
            </div>
          </div>
        </div>
        <div className="text-end">
          <button type="button" className="btn btn-primary light me-2" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Vinculando…" : "Vincular campaña"}
          </button>
        </div>
      </form>
    </W3crmModal>
  );
}

function AttributionTab() {
  const [model, setModel] = useState<AdsAttributionModel>("linear");
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState<AttributedRoasRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showLink, setShowLink] = useState(false);
  const lastFetch = useRef<string>("");

  const load = useCallback(() => {
    const key = `${model}-${days}`;
    lastFetch.current = key;
    setLoading(true); setError(null);
    fetch(`/api/saas/ads/attribution?resource=roas&model=${model}&days=${days}`)
      .then((r) => r.json() as Promise<{ roas?: AttributedRoasRow[]; error?: string }>)
      .then((d) => {
        // Guardia contra respuestas fuera de orden.
        if (lastFetch.current !== key) return;
        if (d?.error) setError(d.error);
        else setRows(Array.isArray(d?.roas) ? d.roas : []);
      })
      .catch(() => setError("Error de red"))
      .finally(() => setLoading(false));
  }, [model, days]);

  useEffect(() => { void load(); }, [load]);

  return (
    <>
      <W3crmContentBox
        titulo="ROAS atribuido"
        icono="fa-solid fa-diagram-project"
        acciones={
          <button type="button" className="btn btn-primary btn-sm me-2" onClick={() => setShowLink(true)}>
            + Vincular campaña
          </button>
        }
      >
        <div className="row">
          <div className="col-sm-4">
            <div className="form-group mb-3">
              <label htmlFor="atr-modelo" className="text-black font-w600">Modelo</label>
              <select id="atr-modelo" className="form-control" value={model}
                onChange={(e) => setModel(e.target.value as AdsAttributionModel)}>
                {Object.entries(MODEL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="col-sm-4">
            <div className="form-group mb-3">
              <label htmlFor="atr-ventana" className="text-black font-w600">Ventana</label>
              <select id="atr-ventana" className="form-control" value={days}
                onChange={(e) => setDays(Number(e.target.value))}>
                <option value={7}>7 días</option>
                <option value={30}>30 días</option>
                <option value={90}>90 días</option>
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <W3crmCargando texto="Calculando atribución…" />
        ) : error ? (
          <div className="alert alert-danger py-2 fs-14 mb-0" role="alert">{error}</div>
        ) : rows.length === 0 ? (
          // Texto de contrato: `getByText("Sin campañas vinculadas")`.
          <W3crmEmptyState
            title="Sin campañas vinculadas"
            description="Vincula una campaña de Ads con su utm_campaign para calcular ROAS atribuido."
          />
        ) : (
          <>
            <W3crmDataTable
              filas={rows}
              etiqueta="campañas"
              wrapperId="ads_attribution_wrapper"
              porPagina={10}
              reiniciarEn={`${model}-${days}`}
              columnas={[
                { titulo: "Campaña" },
                { titulo: "Plataforma" },
                { titulo: "UTM Campaign" },
                { titulo: "Gasto" },
                { titulo: "Conv. atrib." },
                { titulo: "ROAS atrib.", alFinal: true },
              ]}
              render={(r) => {
                // `link` podía faltar entero y reventaba todos los accesos.
                const link = r.link ?? ({} as AdsCampaignLink);
                const gasto = num(r.spend);
                const conv = num(r.attributedConversions);
                const roas = opt(r.attributedRoas);
                return (
                  <tr key={link.id ?? `${link.externalCampaignId}-${link.utmCampaign}`}>
                    <td>
                      <span className="fw-bold">
                        {link.externalCampaignName ?? link.externalCampaignId ?? "—"}
                      </span>
                    </td>
                    <td className="text-muted text-uppercase fs-12">{link.platform || "—"}</td>
                    <td><code className="fs-12">{link.utmCampaign || "—"}</code></td>
                    <td>{gasto > 0 ? eur(gasto) : "—"}</td>
                    <td>{conv > 0 ? fmt(conv) : "—"}</td>
                    <td className="text-end">
                      {roas != null ? <span className={roasClass(roas)}>{roas.toFixed(2)}x</span> : "—"}
                    </td>
                  </tr>
                );
              }}
            />
            <p className="fs-12 text-muted mb-0">
              Modelo: <strong>{MODEL_LABELS[model] ?? model}</strong> · Ventana: {days} días · Spend de
              métricas en caché · Conversiones de <code>saas_lead_attribution</code>
            </p>
          </>
        )}
      </W3crmContentBox>
      {showLink && <LinkCampaignModal onClose={() => setShowLink(false)} onSaved={load} />}
    </>
  );
}

type PublicidadTab = "metricas" | "atribucion";

export default function SaasPublicidadPage() {
  const [tab, setTab] = useState<PublicidadTab>("metricas");
  const [status, setStatus] = useState<AdsStatusResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConnect, setShowConnect] = useState(false);
  const dateStart = daysAgo(30);
  const dateEnd = today();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/saas/ads");
      if (res.ok) {
        const d = (await res.json().catch(() => ({}))) as { status?: AdsStatusResult[] };
        setStatus(Array.isArray(d.status) ? d.status : []);
      } else setStatus([]);
    } catch { setStatus([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const connected = status.filter((s) => s.connected);
  const disconnected = status.filter((s) => !s.connected);

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Publicidad Digital" parentTitle="Captación" pageTitle="Publicidad" />
      <div className="container-fluid">
        <div className="row">
          <div className="col-xl-12">
            <p className="fs-14 text-muted">Metricas reales de Google, Meta, LinkedIn y TikTok Ads</p>

            {!loading && connected.length === 0 && (
              <div className="alert alert-warning" role="alert">
                Conecta Meta, Google, LinkedIn o TikTok Ads en Integraciones para métricas y campañas en
                vivo. Sin OAuth configurado, las métricas y campañas no se sincronizan.
              </div>
            )}

            {/* Pestañas: `<button>` sin `role`, para que sigan siendo
                localizables con `getByRole("button", …)`. Los dos rótulos son
                contrato literal. */}
            <ul className="nav nav-tabs mb-3">
              {([["metricas", "Métricas y campañas"], ["atribucion", "Atribución multi-touch"]] as [PublicidadTab, string][])
                .map(([id, label]) => (
                  <li className="nav-item" key={id}>
                    <button type="button" className={`nav-link ${tab === id ? "active" : ""}`}
                      aria-pressed={tab === id} onClick={() => setTab(id)}>
                      {label}
                    </button>
                  </li>
                ))}
            </ul>

            {tab === "atribucion" ? (
              <AttributionTab />
            ) : loading ? (
              <W3crmContentBox titulo="Rendimiento por plataforma" icono="fa-solid fa-chart-column">
                <W3crmCargando texto="Cargando plataformas…" />
              </W3crmContentBox>
            ) : connected.length === 0 ? (
              <W3crmContentBox
                titulo="Rendimiento por plataforma"
                icono="fa-solid fa-chart-column"
                acciones={
                  <button type="button" className="btn btn-primary btn-sm me-2" onClick={() => setShowConnect(true)}>
                    + Conectar plataforma
                  </button>
                }
              >
                <W3crmEmptyState
                  title="Sin plataformas conectadas"
                  description="Conecta tu cuenta de Meta, Google, LinkedIn o TikTok para ver metricas reales aqui."
                />
              </W3crmContentBox>
            ) : (
              <>
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="text-muted fs-12 text-uppercase">Ultimos 30 dias</span>
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowConnect(true)}>
                    + Conectar plataforma
                  </button>
                </div>
                {connected.map((s) => (
                  <div key={s.platform}>
                    <MetricsCard platform={s.platform} dateStart={dateStart} dateEnd={dateEnd} />
                    <CampaignsSection platform={s.platform} />
                  </div>
                ))}
                {disconnected.length > 0 && (
                  <W3crmContentBox titulo="Plataformas no conectadas" icono="fa-solid fa-plug-circle-xmark">
                    <div className="row">
                      {disconnected.map((s) => {
                        const cfg = cfgOf(s.platform);
                        return (
                          <div className="col-xl-6" key={s.platform}>
                            <div className="card border mb-3">
                              <div className="card-body d-flex align-items-center gap-3">
                                <i className={`${cfg.icon} fa-lg text-primary`} aria-hidden="true" />
                                <div className="flex-grow-1">
                                  <span className="fw-bold d-block">{cfg.label}</span>
                                  <span className="text-muted fs-12">No conectada</span>
                                </div>
                                <button type="button" className="btn btn-primary light btn-sm"
                                  aria-label={`Conectar ${cfg.label}`} onClick={() => setShowConnect(true)}>
                                  Conectar
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </W3crmContentBox>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {showConnect && <ConnectModal onClose={() => setShowConnect(false)} onSaved={load} />}
    </SaasW3crmShell>
  );
}
