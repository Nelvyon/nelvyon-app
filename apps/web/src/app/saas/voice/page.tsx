"use client";

/**
 * /saas/voice sobre `(cms)/content` de W3CRM, con las piezas ya portadas.
 * Mapeo: catalogo por tipo e historial -> `W3crmContentBox` + `W3crmDataTable`.
 * Sin componentes nuevos.
 *
 * CONTRATO — `saas-voice-command.spec.ts` exige, y aqui se conserva:
 *   - un heading que case con `/Comandos de voz/` (l.23). `W3crmPageTitle`
 *     emite `h5.bc-title`, que `getByRole("heading")` si reconoce.
 *   - los textos de catalogo `Abrir el CRM` y `Abrir el Pack Store` (l.28-29),
 *     que salen de `item.description` y se pintan sin envolver.
 *   - el transcript del historial como `«ir a crm»` con `exact: true` (l.34):
 *     va en su PROPIO elemento, sin fecha ni estado dentro, o el match exacto
 *     se rompe.
 *   - el FAB `aria-label="Comando de voz"` (l.61) y el enlace `Voz` del
 *     sidebar (l.39), que los aporta `SaasW3crmShell`.
 *
 * Logica de NELVYON intacta: `GET /api/saas/voice` y el agrupado del catalogo
 * por `actionType` (`navigate` / `action` / `query`).
 */
import { useEffect, useState } from "react";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmEmptyState } from "@/features/saas-w3crm/components/W3crmUi";
import { W3crmCargando, W3crmContentBox, W3crmDataTable } from "@/features/saas-w3crm/components/W3crmContentBox";
import type { VoiceCatalogItem, VoiceCommandLog, VoiceActionType } from "@nelvyon/saas";

const TYPE_LABEL: Record<string, string> = {
  navigate: "Navegar",
  action: "Acción",
  query: "Consulta",
  unknown: "—",
};
const TYPE_BADGE: Record<string, string> = {
  navigate: "badge-primary",
  action: "badge-success",
  query: "badge-warning",
  unknown: "badge-secondary",
};
const TYPE_ICON: Record<string, string> = {
  navigate: "fa-solid fa-compass",
  action: "fa-solid fa-bolt",
  query: "fa-solid fa-magnifying-glass",
};

/** Un `actionType` fuera de catalogo pintaba `undefined`. */
function tipoLabel(t: string): string {
  return TYPE_LABEL[t] ?? (t ? String(t) : "—");
}
function tipoBadge(t: string): string {
  return TYPE_BADGE[t] ?? "badge-secondary";
}
/** `phrases` puede llegar ausente o no ser array. */
function frases(item: VoiceCatalogItem): string[] {
  return Array.isArray(item.phrases) ? item.phrases.filter(Boolean) : [];
}
function fechaHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("es-ES");
}

export default function VoicePage() {
  const [catalog, setCatalog] = useState<VoiceCatalogItem[]>([]);
  const [history, setHistory] = useState<VoiceCommandLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/saas/voice");
        if (res.ok) {
          const d = (await res.json().catch(() => ({}))) as {
            catalog?: VoiceCatalogItem[];
            history?: VoiceCommandLog[];
          };
          setCatalog(Array.isArray(d.catalog) ? d.catalog : []);
          setHistory(Array.isArray(d.history) ? d.history : []);
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const grupos: VoiceActionType[] = ["navigate", "action", "query"];

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="🎙️ Comandos de voz" parentTitle="Cuenta" pageTitle="Voz" />
      <div className="container-fluid">
        <div className="row">
          <div className="col-xl-12">
            <p className="fs-14 text-muted">
              Pulsa el micrófono flotante y di un comando. Gratis, sin coste de API (Web Speech).
            </p>

            {loading ? (
              <W3crmContentBox titulo="Comandos disponibles" icono="fa-solid fa-microphone">
                <W3crmCargando texto="Cargando comandos…" />
              </W3crmContentBox>
            ) : (
              <>
                {grupos.map((grupo) => {
                  const items = catalog.filter((c) => c.actionType === grupo);
                  if (items.length === 0) return null;
                  return (
                    <W3crmContentBox key={grupo} titulo={tipoLabel(grupo)} icono={TYPE_ICON[grupo]}>
                      <div className="row">
                        {items.map((item) => {
                          const fs = frases(item);
                          return (
                            <div className="col-xl-4 col-sm-6" key={item.id}>
                              <div className="card border mb-3">
                                <div className="card-body">
                                  <div className="d-flex align-items-start justify-content-between gap-2">
                                    {/* `Abrir el CRM` / `Abrir el Pack Store` — texto de contrato. */}
                                    <span className="fw-bold">{item.description}</span>
                                    <span className={`badge ${tipoBadge(item.actionType)}`}>
                                      {tipoLabel(item.actionType)}
                                    </span>
                                  </div>
                                  {fs.length > 0 && (
                                    <p className="text-muted fs-12 mt-2 mb-0">
                                      Di: «{fs[0]}»{fs[1] ? ` o «${fs[1]}»` : ""}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </W3crmContentBox>
                  );
                })}

                <W3crmContentBox titulo="Historial reciente" icono="fa-solid fa-clock-rotate-left">
                  {history.length === 0 ? (
                    <W3crmEmptyState
                      title="Sin comandos todavía"
                      description="Di «ir a CRM» o «lanzar pack» con el micrófono flotante."
                    />
                  ) : (
                    <W3crmDataTable
                      filas={history}
                      etiqueta="comandos"
                      wrapperId="voice_history_wrapper"
                      porPagina={10}
                      columnas={[{ titulo: "Comando" }, { titulo: "Fecha" }, { titulo: "Resultado", alFinal: true }]}
                      render={(h) => (
                        <tr key={h.id}>
                          {/* El transcript va solo en su celda: el spec lo busca
                              con `exact: true` como `«ir a crm»`. */}
                          <td><span className="fw-bold">«{h.transcript}»</span></td>
                          <td>{fechaHora(h.createdAt)}</td>
                          <td className="text-end">
                            <span className={`badge ${h.success ? "badge-success" : "badge-secondary"}`}>
                              {h.success ? "ok" : "no reconocido"}
                            </span>
                          </td>
                        </tr>
                      )}
                    />
                  )}
                </W3crmContentBox>
              </>
            )}
          </div>
        </div>
      </div>
    </SaasW3crmShell>
  );
}
