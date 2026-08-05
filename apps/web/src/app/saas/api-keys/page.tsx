"use client";

/**
 * /saas/api-keys sobre `(cms)/content` de W3CRM, con las piezas ya portadas.
 * Las dos pestanas (keys / documentacion) usan el `nav nav-tabs` de la
 * plantilla (`(bootstrap)/ui-tab`), y las tablas su
 * `table table-responsive-lg table-striped table-condensed flip-content`.
 *
 * Logica de NELVYON intacta: `GET/POST/DELETE /api/saas/api-keys`, el tipo
 * `ApiKey`, `SCOPE_LABELS` con su agrupacion, `toggleScope` (con la exclusion
 * mutua de `full_access`), `ENDPOINTS`, `timeAgo`, la clave en claro que solo
 * se muestra una vez y `revokeKey` con su error.
 */
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmEmptyState, W3crmKpiTile } from "@/features/saas-w3crm/components/W3crmUi";
import { W3crmContentBox, W3crmDataTable, W3crmModal } from "@/features/saas-w3crm/components/W3crmContentBox";

type ApiKeyScope = "read:contacts" | "write:contacts" | "read:deals" | "write:deals" | "read:campaigns" | "write:campaigns" | "read:reports" | "webhooks:manage" | "full_access";

interface ApiKey {
  id: string;
  name: string;
  keyPreview: string;
  scopes: ApiKeyScope[];
  active: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  requests: number;
  createdAt: string;
}

const SCOPE_LABELS: Record<ApiKeyScope, { label: string; group: string }> = {
  "read:contacts": { label: "Leer contactos", group: "CRM" },
  "write:contacts": { label: "Crear/editar contactos", group: "CRM" },
  "read:deals": { label: "Leer deals", group: "Pipeline" },
  "write:deals": { label: "Crear/editar deals", group: "Pipeline" },
  "read:campaigns": { label: "Leer campañas", group: "Email" },
  "write:campaigns": { label: "Crear/enviar campañas", group: "Email" },
  "read:reports": { label: "Leer reportes", group: "Analytics" },
  "webhooks:manage": { label: "Gestionar webhooks", group: "Sistema" },
  "full_access": { label: "Acceso completo", group: "Sistema" },
};

const ENDPOINTS = [
  { method: "GET", path: "/api/public/v1/contacts", desc: "Lista contactos" },
  { method: "POST", path: "/api/public/v1/contacts", desc: "Crear contacto" },
  { method: "GET", path: "/api/public/v1/deals", desc: "Lista oportunidades" },
  { method: "POST", path: "/api/public/v1/deals", desc: "Crear oportunidad" },
  { method: "GET", path: "/api/public/v1/campaigns", desc: "Lista campañas" },
  { method: "POST", path: "/api/public/v1/workflows/trigger", desc: "Disparar workflow" },
];

const METHOD_BADGE: Record<string, string> = {
  GET: "badge-success", POST: "badge-primary", PUT: "badge-warning", DELETE: "badge-danger",
};

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function timeAgo(iso: string) {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  const d = Date.now() - t;
  if (d < 3600000) return `Hace ${Math.floor(d / 60000)}m`;
  if (d < 86400000) return `Hace ${Math.floor(d / 3600000)}h`;
  return `Hace ${Math.floor(d / 86400000)}d`;
}

function CreateKeyModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<ApiKeyScope[]>([]);
  const [expiry, setExpiry] = useState("");
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggleScope(s: ApiKeyScope) {
    if (s === "full_access") { setScopes(["full_access"]); return; }
    setScopes((prev) => prev.includes(s)
      ? prev.filter((x) => x !== s && x !== "full_access")
      : [...prev.filter((x) => x !== "full_access"), s]);
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, scopes, expiresAt: expiry || null }),
      });
      if (res.ok) {
        const d = (await res.json().catch(() => ({}))) as { rawKey?: string };
        if (d.rawKey) setCreated(d.rawKey);
        else throw new Error("No rawKey in response");
      } else {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error ?? "Error creando API key");
      }
    } catch (err) {
      setError(String((err as Error).message));
    } finally {
      setSaving(false);
    }
  }

  if (created) {
    return (
      <W3crmModal titulo="API Key creada" onClose={onClose} testId="modal-key-creada">
        <p className="fs-14">
          Copia esta clave ahora. <strong className="text-danger">No podrás verla de nuevo.</strong>
        </p>
        <div className="d-flex align-items-center border rounded p-3 mb-3">
          <code className="flex-grow-1 text-primary fs-12 text-break">{created}</code>
          <button type="button" className="btn btn-primary light btn-sm ms-2"
            onClick={() => { void navigator.clipboard?.writeText(created); }}>
            Copiar
          </button>
        </div>
        <div className="text-end">
          <button type="button" className="btn btn-primary" onClick={onClose}>Entendido, ya la copié</button>
        </div>
      </W3crmModal>
    );
  }

  const byGroup = Object.entries(SCOPE_LABELS).reduce((acc, [k, v]) => {
    if (!acc[v.group]) acc[v.group] = [];
    acc[v.group]!.push(k as ApiKeyScope);
    return acc;
  }, {} as Record<string, ApiKeyScope[]>);

  return (
    <W3crmModal titulo="Nueva API Key" onClose={onClose} error={error} testId="modal-api-key">
      <form onSubmit={create}>
        <div className="row">
          <div className="col-lg-12">
            <div className="form-group mb-3">
              <label htmlFor="ak-nombre" className="text-black font-w600">Nombre descriptivo <span className="required">*</span></label>
              <input id="ak-nombre" type="text" className="form-control" placeholder="Ej: Integración Zapier"
                value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>
          <div className="col-lg-12">
            <label className="text-black font-w600 d-block mb-2">Permisos (scopes) <span className="required">*</span></label>
            {Object.entries(byGroup).map(([group, groupScopes]) => (
              <div key={group} className="card mb-2">
                <div className="card-body py-2">
                  <p className="fw-bold fs-14 mb-2">{group}</p>
                  {groupScopes.map((s) => (
                    <div className="form-check mb-1" key={s}>
                      <input className="form-check-input" type="checkbox" id={`scope-${s}`}
                        checked={scopes.includes(s)} onChange={() => toggleScope(s)} />
                      <label className="form-check-label fs-12" htmlFor={`scope-${s}`}>
                        <code>{s}</code> — {SCOPE_LABELS[s].label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="col-lg-12">
            <div className="form-group mb-3">
              <label htmlFor="ak-expira" className="text-black font-w600">Expiración (opcional)</label>
              <input id="ak-expira" type="date" className="form-control" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
            </div>
          </div>
          <div className="col-lg-12">
            <div className="text-end">
              <button type="button" className="btn btn-danger light me-2" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={saving || !name || scopes.length === 0}>
                {saving ? "Generando…" : "Generar API Key"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </W3crmModal>
  );
}

export default function SaasApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);
  const [tab, setTab] = useState<"keys" | "docs">("keys");

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/saas/api-keys");
      if (res.ok) {
        const d = (await res.json().catch(() => ({}))) as { keys?: ApiKey[] };
        setKeys(Array.isArray(d.keys) ? d.keys : []);
      }
    } catch { /* silencioso */ }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function revokeKey(id: string) {
    setRevokeError(null);
    try {
      const res = await fetch(`/api/saas/api-keys?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        const d = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(d?.error ?? `Error ${res.status}`);
      }
      setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, active: false } : k)));
    } catch (err) {
      setRevokeError(err instanceof Error ? err.message : "No se pudo revocar la key");
    }
  }

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="API Keys" parentTitle="Cuenta" pageTitle="API Keys" />
      <div className="container-fluid">
        <div className="row">
          {revokeError && (
            <div className="col-xl-12">
              <div className="alert alert-danger alert-dismissible fade show" role="alert">
                {revokeError}
                <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => setRevokeError(null)} />
              </div>
            </div>
          )}

          <div className="col-xl-4 col-sm-6"><W3crmKpiTile label="Keys activas" value={keys.filter((k) => k.active).length} accent /></div>
          <div className="col-xl-4 col-sm-6"><W3crmKpiTile label="Total peticiones" value={keys.reduce((s, k) => s + num(k.requests), 0).toLocaleString("es-ES")} /></div>
          <div className="col-xl-4 col-sm-6"><W3crmKpiTile label="Base URL" value={<code className="fs-14">api.nelvyon.com/v1</code>} /></div>

          <div className="col-xl-12">
            <div className="mb-3">
              <ul className="d-flex align-items-center flex-wrap">
                <li>
                  <button type="button" className="btn btn-primary" onClick={() => setShowModal(true)}>+ Nueva API Key</button>
                </li>
                <li>
                  <Link href="/saas/developers" className="btn btn-primary light mx-1">Documentación API</Link>
                </li>
              </ul>
            </div>

            <ul className="nav nav-tabs mb-3" role="tablist">
              {(["keys", "docs"] as const).map((t) => (
                <li className="nav-item" key={t} role="presentation">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={tab === t}
                    className={`nav-link ${tab === t ? "active" : ""}`}
                    onClick={() => setTab(t)}
                  >
                    {t === "keys" ? `Mis keys (${keys.length})` : "Documentación API"}
                  </button>
                </li>
              ))}
            </ul>

            {tab === "keys" ? (
              <W3crmContentBox titulo="API Keys" icono="fa-solid fa-key">
                {keys.length === 0 ? (
                  <W3crmEmptyState title="Sin API Keys" description="Genera una clave para conectar tus aplicaciones externas." />
                ) : (
                  <W3crmDataTable
                    filas={keys}
                    etiqueta="keys"
                    columnas={[{ titulo: "Nombre" }, { titulo: "Clave" }, { titulo: "Scopes" }, { titulo: "Peticiones" }, { titulo: "Último uso" }, { titulo: "Expira" }, { titulo: "Estado" }, { titulo: "Acciones", alFinal: true }]}
                    render={(key) => (
                      <tr key={key.id}>
                        <td><span className="fw-bold">{key.name || "—"}</span></td>
                        <td><code className="fs-12">{key.keyPreview}</code></td>
                        <td>
                          {(key.scopes ?? []).map((s) => (
                            <span key={s} className="badge badge-secondary light me-1 fs-12">{s}</span>
                          ))}
                        </td>
                        <td>{num(key.requests).toLocaleString("es-ES")}</td>
                        <td>{key.lastUsedAt ? timeAgo(key.lastUsedAt) : "—"}</td>
                        <td>
                          {key.expiresAt && !Number.isNaN(new Date(key.expiresAt).getTime())
                            ? new Date(key.expiresAt).toLocaleDateString("es-ES")
                            : "Sin expiración"}
                        </td>
                        <td>
                          <span className={`badge ${key.active ? "badge-success" : "badge-danger"}`}>
                            {key.active ? "Activa" : "Revocada"}
                          </span>
                        </td>
                        <td className="text-end">
                          {key.active && (
                            <button type="button" className="btn btn-danger btn-sm content-icon"
                              aria-label={`Revocar ${key.name || "key"}`} onClick={() => void revokeKey(key.id)}>
                              <i className="fa-solid fa-ban" />
                            </button>
                          )}
                        </td>
                      </tr>
                    )}
                  />
                )}
              </W3crmContentBox>
            ) : (
              <>
                <W3crmContentBox titulo="Autenticación" icono="fa-solid fa-lock">
                  <p className="fs-14 text-muted">Incluye tu API key en el header <code>Authorization</code> de cada petición:</p>
                  <pre className="border rounded p-3 fs-12 mb-0">{`curl https://api.nelvyon.com/v1/contacts \\
  -H "Authorization: Bearer nlv_live_tu_api_key" \\
  -H "Content-Type: application/json"`}</pre>
                </W3crmContentBox>

                <W3crmContentBox titulo="Endpoints disponibles" icono="fa-solid fa-file-lines">
                  <div className="table-responsive">
                    <div id="endpoints_wrapper" className="dataTables_wrapper no-footer">
                      <table className="table table-responsive-lg table-striped table-condensed flip-content">
                        <thead>
                          <tr>
                            <th className="text-black">Método</th>
                            <th className="text-black">Ruta</th>
                            <th className="text-black">Descripción</th>
                          </tr>
                        </thead>
                        <tbody>
                          {ENDPOINTS.map((ep) => (
                            <tr key={`${ep.method}-${ep.path}`}>
                              <td><span className={`badge ${METHOD_BADGE[ep.method] ?? "badge-secondary"}`}>{ep.method}</span></td>
                              <td><code className="fs-12">{ep.path}</code></td>
                              <td><span className="text-muted fs-12">{ep.desc}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </W3crmContentBox>

                <W3crmContentBox titulo="Rate limiting" icono="fa-solid fa-gauge">
                  <div className="row">
                    {[{ plan: "Starter", rps: "10 req/s" }, { plan: "Pro", rps: "100 req/s" }, { plan: "Agency", rps: "1.000 req/s" }].map((r) => (
                      <div className="col-xl-4 col-sm-6 mb-3" key={r.plan}>
                        <div className="card mb-0">
                          <div className="card-body">
                            <p className="mb-1 fs-14 text-muted">{r.plan}</p>
                            <h4 className="mb-0">{r.rps}</h4>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </W3crmContentBox>
              </>
            )}
          </div>
        </div>
      </div>

      {showModal && <CreateKeyModal onClose={() => { setShowModal(false); void load(); }} />}
    </SaasW3crmShell>
  );
}
