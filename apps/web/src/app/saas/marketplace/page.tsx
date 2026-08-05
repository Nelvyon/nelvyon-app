"use client";

/**
 * /saas/marketplace sobre `(cms)/content` de W3CRM, con las piezas ya portadas.
 * Mapeo: catalogo de apps -> `W3crmContentBox` + `W3crmDataTable`; KPIs ->
 * `W3crmKpiTile`. Sin componentes nuevos.
 *
 * Inventario: el modulo no exponia `data-testid`, no tiene spec dedicado y su
 * unica cobertura es `saas-nav-full-coverage` (recorre `SAAS_NAV_ITEMS`, que
 * incluye `marketplace`): exige que la ruta cargue sin redirigir a login y sin
 * "Internal Server Error". Ningun texto actua como contrato.
 *
 * Logica de NELVYON intacta: `GET/POST /api/saas/marketplace` con sus acciones
 * `install` / `uninstall`, el enlace de descarga de blueprint para make, n8n y
 * zapier cuando la app esta instalada, y el manejo de error con reintento.
 */
import { useCallback, useEffect, useState } from "react";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmEmptyState, W3crmKpiTile } from "@/features/saas-w3crm/components/W3crmUi";
import { W3crmCargando, W3crmContentBox, W3crmDataTable } from "@/features/saas-w3crm/components/W3crmContentBox";

type App = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  installed: boolean;
};

/** Slugs con blueprint descargable. */
const CON_BLUEPRINT = ["make", "n8n", "zapier"];

export default function MarketplacePage() {
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/marketplace");
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const d = (await res.json().catch(() => ({}))) as { apps?: App[] };
      setApps(Array.isArray(d.apps) ? d.apps : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar marketplace");
      setApps([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const toggle = async (app: App) => {
    setToggling(app.id);
    setError(null);
    try {
      const res = await fetch("/api/saas/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appId: app.id, action: app.installed ? "uninstall" : "install" }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => null)) as { error?: string; message?: string } | null;
        throw new Error(d?.message ?? d?.error ?? `Error ${res.status}`);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar instalación");
    } finally {
      setToggling(null);
    }
  };

  const instaladas = apps.filter((a) => a.installed).length;
  const categorias = new Set(apps.map((a) => a.category).filter(Boolean)).size;

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Integration Marketplace" parentTitle="Cuenta" pageTitle="Marketplace" />
      <div className="container-fluid">
        <div className="row">
          {error && (
            <div className="col-xl-12">
              <div className="alert alert-danger alert-dismissible fade show" role="alert">
                {error}
                <button type="button" className="btn-close" aria-label="Cerrar"
                  onClick={() => { setError(null); void load(); }} />
              </div>
            </div>
          )}

          <div className="col-xl-4 col-sm-6"><W3crmKpiTile label="Apps en catálogo" value={apps.length} accent /></div>
          <div className="col-xl-4 col-sm-6"><W3crmKpiTile label="Instaladas" value={instaladas} /></div>
          <div className="col-xl-4 col-sm-6"><W3crmKpiTile label="Categorías" value={categorias} /></div>

          <div className="col-xl-12">
            <W3crmContentBox titulo="Catálogo de apps" icono="fa-solid fa-puzzle-piece">
              {loading ? (
                <W3crmCargando texto="Cargando marketplace…" />
              ) : apps.length === 0 ? (
                <W3crmEmptyState
                  title="Sin apps en el catálogo"
                  description="Cuando haya integraciones disponibles aparecerán aquí."
                />
              ) : (
                <W3crmDataTable
                  filas={apps}
                  etiqueta="apps"
                  columnas={[{ titulo: "App" }, { titulo: "Categoría" }, { titulo: "Estado" }, { titulo: "Gestión", alFinal: true }]}
                  render={(app) => (
                    <tr key={app.id}>
                      <td>
                        <span className="fw-bold">{app.name || app.slug || "—"}</span>
                        {app.description ? <div className="text-muted fs-12">{app.description}</div> : null}
                      </td>
                      <td>
                        <span className="badge badge-secondary light">{app.category || "—"}</span>
                      </td>
                      <td>
                        {app.installed
                          ? <span className="badge badge-success">Instalada</span>
                          : <span className="badge badge-secondary">Sin instalar</span>}
                      </td>
                      <td className="text-end">
                        {CON_BLUEPRINT.includes(app.slug) && app.installed && (
                          <a
                            href={`/api/saas/marketplace/blueprints?slug=${app.slug}`}
                            className="btn btn-primary light btn-sm me-1"
                            target="_blank"
                            rel="noreferrer"
                          >
                            Descargar blueprint
                          </a>
                        )}
                        <button
                          type="button"
                          className={`btn btn-sm ${app.installed ? "btn-danger light" : "btn-primary"}`}
                          disabled={toggling === app.id}
                          aria-label={`${app.installed ? "Desinstalar" : "Instalar"} ${app.name || app.slug}`}
                          onClick={() => void toggle(app)}
                        >
                          {toggling === app.id ? "…" : app.installed ? "Desinstalar" : "Instalar"}
                        </button>
                      </td>
                    </tr>
                  )}
                />
              )}
            </W3crmContentBox>
          </div>
        </div>
      </div>
    </SaasW3crmShell>
  );
}
