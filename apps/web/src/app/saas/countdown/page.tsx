"use client";

/**
 * /saas/countdown sobre `(cms)/content` de W3CRM, con las piezas ya portadas.
 *
 * Logica de NELVYON intacta: `GET/POST/DELETE /api/saas/countdown`, el tipo
 * `CountdownTimer`, `TYPE_LABEL`, `embedSnippet`, el reloj en vivo
 * `LiveClock` con su intervalo de 1 s, el copiado del embed con su aviso de
 * 1,5 s y `removeTimer`.
 */
import { useCallback, useEffect, useState } from "react";
import Alert from "sweetalert2";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmEmptyState, W3crmKpiTile } from "@/features/saas-w3crm/components/W3crmUi";
import { W3crmCargando, W3crmContentBox, W3crmDataTable, W3crmModal } from "@/features/saas-w3crm/components/W3crmContentBox";

type TimerType = "datetime" | "duration" | "evergreen";
type CountdownAction = "hide" | "show_message" | "redirect";

interface CountdownTimer {
  id: string;
  name: string;
  type: TimerType;
  targetDatetime: string | null;
  durationSeconds: number | null;
  evergreenSeconds: number | null;
  timezone: string;
  actionOnEnd: CountdownAction;
  actionValue: string | null;
  scans: number;
  createdAt: string;
}

const TYPE_LABEL: Record<TimerType, string> = {
  datetime: "Fecha fija",
  duration: "Duración fija",
  evergreen: "Evergreen (por visitante)",
};

/** Un tipo fuera de catalogo no puede dejar la pantalla en blanco. */
function tipoDe(t: TimerType | string) {
  return TYPE_LABEL[t as TimerType] ?? String(t || "—");
}
function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
function fechaValida(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function embedSnippet(id: string): string {
  const base = typeof window !== "undefined" ? window.location.origin : "https://app.nelvyon.com";
  return `<div data-nelvyon-countdown="${id}"></div><script src="${base}/embed/countdown.js" async></script>`;
}

function LiveClock({ targetDatetime }: { targetDatetime: string }) {
  const [remaining, setRemaining] = useState({ d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    function update() {
      const objetivo = new Date(targetDatetime).getTime();
      const diff = Number.isNaN(objetivo) ? 0 : Math.max(0, objetivo - Date.now());
      const s = Math.floor(diff / 1000);
      setRemaining({
        d: Math.floor(s / 86400),
        h: Math.floor((s % 86400) / 3600),
        m: Math.floor((s % 3600) / 60),
        s: s % 60,
      });
    }
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, [targetDatetime]);

  return (
    <span className="fw-bold">
      {[["d", remaining.d], ["h", remaining.h], ["m", remaining.m], ["s", remaining.s]].map(([label, val]) => (
        <span key={String(label)} className="me-2">
          {String(val).padStart(2, "0")}<span className="text-muted fs-12">{label}</span>
        </span>
      ))}
    </span>
  );
}

function CreateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<TimerType>("datetime");
  const [targetDatetime, setTargetDatetime] = useState("");
  const [durationH, setDurationH] = useState(48);
  const [evergreenMin, setEvergreenMin] = useState(20);
  const [redirectUrl, setRedirectUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("El nombre es obligatorio"); return; }
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        type,
        actionOnEnd: redirectUrl.trim() ? "redirect" : "hide",
        actionValue: redirectUrl.trim() || null,
      };
      if (type === "datetime") {
        if (!targetDatetime) { setError("Fecha objetivo obligatoria"); setSaving(false); return; }
        body.targetDatetime = new Date(targetDatetime).toISOString();
      } else if (type === "duration") {
        body.durationSeconds = Math.max(1, durationH) * 3600;
      } else {
        body.evergreenSeconds = Math.max(1, evergreenMin) * 60;
      }

      const res = await fetch("/api/saas/countdown", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      onCreated();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear");
    } finally {
      setSaving(false);
    }
  }

  return (
    <W3crmModal titulo="Nuevo temporizador" onClose={onClose} error={error} testId="modal-countdown">
      <form onSubmit={(e) => void save(e)}>
        <div className="row">
          <div className="col-lg-6">
            <div className="form-group mb-3">
              <label htmlFor="cd-nombre" className="text-black font-w600">Nombre <span className="required">*</span></label>
              <input id="cd-nombre" type="text" className="form-control" placeholder="Ej: Black Friday 2026"
                value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          </div>
          <div className="col-lg-6">
            <div className="form-group mb-3">
              <label htmlFor="cd-tipo" className="text-black font-w600">Tipo</label>
              <select id="cd-tipo" className="form-control" value={type} onChange={(e) => setType(e.target.value as TimerType)}>
                {(Object.keys(TYPE_LABEL) as TimerType[]).map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
              </select>
            </div>
          </div>
          {type === "datetime" && (
            <div className="col-lg-6">
              <div className="form-group mb-3">
                <label htmlFor="cd-fecha" className="text-black font-w600">Fecha y hora objetivo</label>
                <input id="cd-fecha" type="datetime-local" className="form-control"
                  value={targetDatetime} onChange={(e) => setTargetDatetime(e.target.value)} required />
              </div>
            </div>
          )}
          {type === "duration" && (
            <div className="col-lg-6">
              <div className="form-group mb-3">
                <label htmlFor="cd-duracion" className="text-black font-w600">Duración (horas)</label>
                <input id="cd-duracion" type="number" min={1} max={720} className="form-control"
                  value={durationH} onChange={(e) => setDurationH(Number(e.target.value))} />
              </div>
            </div>
          )}
          {type === "evergreen" && (
            <div className="col-lg-6">
              <div className="form-group mb-3">
                <label htmlFor="cd-evergreen" className="text-black font-w600">Minutos por visitante</label>
                <input id="cd-evergreen" type="number" min={1} max={10080} className="form-control"
                  value={evergreenMin} onChange={(e) => setEvergreenMin(Number(e.target.value))} />
              </div>
            </div>
          )}
          <div className="col-lg-12">
            <div className="form-group mb-3">
              <label htmlFor="cd-redirect" className="text-black font-w600">URL de redirección (opcional)</label>
              <input id="cd-redirect" type="text" className="form-control" placeholder="https://…"
                value={redirectUrl} onChange={(e) => setRedirectUrl(e.target.value)} />
            </div>
          </div>
          <div className="col-lg-12">
            <div className="text-end">
              <button type="button" className="btn btn-danger light me-2" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? "Creando…" : "Crear temporizador"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </W3crmModal>
  );
}

export default function SaasCountdownPage() {
  const [timers, setTimers] = useState<CountdownTimer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/countdown");
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      const d = (await res.json().catch(() => ({}))) as { timers?: CountdownTimer[] };
      setTimers(Array.isArray(d.timers) ? d.timers : []);
    } catch (e) {
      setTimers([]);
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function copyEmbed(timer: CountdownTimer) {
    void navigator.clipboard?.writeText(embedSnippet(timer.id));
    setCopiedId(timer.id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  async function removeTimer(id: string) {
    const r = await Alert.fire({
      title: "¿Eliminar este temporizador?",
      text: "Esta acción no se puede deshacer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
    });
    if (!r.value) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/saas/countdown?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al eliminar");
    } finally {
      setBusyId(null);
    }
  }

  const totalScans = timers.reduce((s, t) => s + num(t.scans), 0);

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Cuenta atrás" parentTitle="Gestión" pageTitle="Cuenta atrás" />
      <div className="container-fluid">
        <div className="row">
          {error && (
            <div className="col-xl-12">
              <div className="alert alert-danger alert-dismissible fade show" role="alert">
                {error}
                <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => setError(null)} />
              </div>
            </div>
          )}

          <div className="col-xl-4 col-sm-6"><W3crmKpiTile label="Temporizadores" value={timers.length} accent /></div>
          <div className="col-xl-4 col-sm-6"><W3crmKpiTile label="Escaneos / vistas" value={totalScans.toLocaleString("es-ES")} /></div>
          <div className="col-xl-4 col-sm-6"><W3crmKpiTile label="Fecha fija" value={timers.filter((t) => t.type === "datetime").length} /></div>

          <div className="col-xl-12">
            <div className="mb-3">
              <ul className="d-flex align-items-center flex-wrap">
                <li><button type="button" className="btn btn-primary" onClick={() => setShowModal(true)}>+ Nuevo temporizador</button></li>
              </ul>
            </div>

            <W3crmContentBox titulo="Temporizadores" icono="fa-solid fa-stopwatch">
              {loading ? (
                <W3crmCargando texto="Cargando temporizadores…" />
              ) : timers.length === 0 ? (
                <W3crmEmptyState title="Sin temporizadores" description="Crea el primero para embeberlo en landings o emails." />
              ) : (
                <W3crmDataTable
                  filas={timers}
                  etiqueta="temporizadores"
                  columnas={[{ titulo: "Nombre" }, { titulo: "Tipo" }, { titulo: "Configuración" }, { titulo: "Al terminar" }, { titulo: "Escaneos" }, { titulo: "Acciones", alFinal: true }]}
                  render={(timer) => {
                    const objetivo = fechaValida(timer.targetDatetime);
                    return (
                      <tr key={timer.id}>
                        <td><span className="fw-bold">{timer.name || "—"}</span></td>
                        <td><span className="badge badge-primary">{tipoDe(timer.type)}</span></td>
                        <td>
                          {timer.type === "datetime" && objetivo ? (
                            <>
                              <LiveClock targetDatetime={timer.targetDatetime!} />
                              <div className="text-muted fs-12">
                                hasta {objetivo.toLocaleString("es-ES", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </div>
                            </>
                          ) : timer.type === "duration" && timer.durationSeconds != null ? (
                            <span className="text-muted fs-12">{(num(timer.durationSeconds) / 3600).toFixed(1)} h desde el primer inicio</span>
                          ) : timer.type === "evergreen" && timer.evergreenSeconds != null ? (
                            <span className="text-muted fs-12">{Math.round(num(timer.evergreenSeconds) / 60)} min por visitante</span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td><span className="badge badge-secondary light">{timer.actionOnEnd || "—"}</span></td>
                        <td>{num(timer.scans).toLocaleString("es-ES")}</td>
                        <td className="text-end">
                          <button type="button" className="btn btn-primary light btn-sm content-icon me-1"
                            aria-label={`Copiar embed de ${timer.name || "temporizador"}`} onClick={() => copyEmbed(timer)}>
                            <i className={`fa-solid ${copiedId === timer.id ? "fa-check" : "fa-copy"}`} />
                          </button>
                          <button type="button" className="btn btn-danger btn-sm content-icon" disabled={busyId === timer.id}
                            aria-label={`Eliminar ${timer.name || "temporizador"}`} onClick={() => void removeTimer(timer.id)}>
                            <i className="fa-solid fa-trash" />
                          </button>
                        </td>
                      </tr>
                    );
                  }}
                />
              )}
            </W3crmContentBox>
          </div>
        </div>
      </div>

      {showModal && <CreateModal onClose={() => setShowModal(false)} onCreated={() => void load()} />}
    </SaasW3crmShell>
  );
}
