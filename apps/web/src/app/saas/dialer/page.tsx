"use client";

/**
 * /saas/dialer sobre `(cms)/content` de W3CRM, con las piezas ya portadas.
 * Mapeo: log de llamadas y registros A2P -> `W3crmContentBox` +
 * `W3crmDataTable`; las tres secciones y los tres modos -> `nav nav-tabs`; el
 * alta de llamada -> `W3crmModal`; contadores -> `W3crmKpiTile`. Sin
 * componentes nuevos.
 *
 * Inventario: sin `data-testid` y sin spec dedicado — lo cubre
 * `saas-nav-full-coverage`. Sin textos-contrato. Los selectores de pestaña
 * eran `<button>` sin `role`, y asi se conservan: ponerles `role="tab"`
 * cambiaria el rol implicito y con el la forma de localizarlos.
 *
 * Logica de NELVYON intacta: `GET /api/saas/dialer?limit=50`, `POST
 * /api/saas/dialer` (click-to-call), `GET`/`POST /api/saas/dialer/a2p`, y las
 * tres llamadas de `dialerAdvancedApi` (`powerDial`, `parallelDial`,
 * `voicemailDrop`) con sus mismos cuerpos: `client_id: "saas-tenant"`, la cola
 * con `use_voicemail` derivado de la URL, `parallel_limit` acotado a 1..10 y
 * `max_calls` igual al numero de telefonos.
 *
 * Guardas anadidas: `data.calls` y `registrations` podian no ser array y
 * `data?.calls.filter(...)` reventaba la pantalla entera.
 */
import { useCallback, useEffect, useState } from "react";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmEmptyState, W3crmKpiTile } from "@/features/saas-w3crm/components/W3crmUi";
import {
  W3crmCargando,
  W3crmContentBox,
  W3crmDataTable,
  W3crmModal,
} from "@/features/saas-w3crm/components/W3crmContentBox";
import { dialerAdvancedApi } from "@/features/dialer-advanced/api";

type DialerTab = "click" | "power" | "a2p";
type PowerMode = "sequential" | "parallel" | "voicemail";

interface CallRecord {
  id: string;
  to: string;
  message: string;
  callSid: string | null;
  status: "initiated" | "failed";
  contactId: string | null;
  createdAt: string;
}

interface DialerStatus {
  dialer_configured: boolean;
  from_number: string | null;
  calls: CallRecord[];
}

interface A2pReg {
  id: string;
  businessName: string;
  status: string;
}

const CALL_LABEL: Record<string, string> = { initiated: "Iniciada", failed: "Fallida" };
const CALL_BADGE: Record<string, string> = { initiated: "badge-success", failed: "badge-danger" };

/** Un estado fuera de catalogo pintaba `undefined`. */
function llamadaLabel(s: string): string {
  return CALL_LABEL[s] ?? (s ? String(s) : "—");
}
function llamadaBadge(s: string): string {
  return CALL_BADGE[s] ?? "badge-secondary";
}
function fechaHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("es-ES");
}

function CallModal({ onClose, onCalled }: { onClose: () => void; onCalled: () => void }) {
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!to.trim()) { setError("El teléfono es obligatorio"); return; }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/dialer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: to.trim(), message: message.trim() || undefined }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(j.error ?? "Error al iniciar llamada");
      onCalled();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSaving(false);
    }
  }

  return (
    <W3crmModal titulo="Nueva llamada" onClose={onClose} error={error} size="lg">
      <form onSubmit={(e) => void submit(e)}>
        <div className="form-group mb-3">
          <label htmlFor="dial-to" className="text-black font-w600">
            Teléfono destino <span className="required">*</span>
          </label>
          <input id="dial-to" className="form-control" type="tel" placeholder="+34612345678"
            value={to} onChange={(e) => setTo(e.target.value)} />
          <p className="fs-12 text-muted mt-1 mb-0">Formato internacional: +34612345678</p>
        </div>
        <div className="form-group mb-3">
          <label htmlFor="dial-msg" className="text-black font-w600">Mensaje de voz (opcional)</label>
          <textarea id="dial-msg" className="form-control" rows={3} placeholder="Hola, te llamamos desde…"
            value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>
        <div className="text-end">
          <button type="button" className="btn btn-primary light me-2" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Llamando…" : "Iniciar llamada"}
          </button>
        </div>
      </form>
    </W3crmModal>
  );
}

export default function SaasDialerPage() {
  const [tab, setTab] = useState<DialerTab>("click");
  const [data, setData] = useState<DialerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCall, setShowCall] = useState(false);
  const [powerQueue, setPowerQueue] = useState("");
  const [powerBusy, setPowerBusy] = useState(false);
  const [powerMode, setPowerMode] = useState<PowerMode>("sequential");
  const [parallelLimit, setParallelLimit] = useState(3);
  const [voicemailUrl, setVoicemailUrl] = useState("");
  const [vmDropNumber, setVmDropNumber] = useState("");
  const [vmBusy, setVmBusy] = useState(false);
  const [a2pRegs, setA2pRegs] = useState<A2pReg[]>([]);
  const [a2pName, setA2pName] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [res, a2pRes] = await Promise.all([
        fetch("/api/saas/dialer?limit=50"),
        fetch("/api/saas/dialer/a2p"),
      ]);
      if (res.ok) {
        const d = (await res.json().catch(() => ({}))) as Partial<DialerStatus>;
        setData({
          dialer_configured: Boolean(d.dialer_configured),
          from_number: d.from_number ?? null,
          calls: Array.isArray(d.calls) ? d.calls : [],
        });
      }
      if (a2pRes.ok) {
        const d = (await a2pRes.json().catch(() => ({}))) as { registrations?: A2pReg[] };
        setA2pRegs(Array.isArray(d.registrations) ? d.registrations : []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function runPowerDial() {
    const phones = powerQueue.split(/\n+/).map((s) => s.trim()).filter(Boolean);
    if (!phones.length) return;
    setPowerBusy(true);
    try {
      const queue = phones.map((phone) => ({
        phone,
        use_voicemail: Boolean(voicemailUrl.trim()),
      }));
      if (powerMode === "parallel") {
        await dialerAdvancedApi.parallelDial({
          client_id: "saas-tenant",
          queue,
          parallel_limit: Math.min(10, Math.max(1, parallelLimit)),
          voicemail_url: voicemailUrl.trim() || null,
        });
      } else {
        await dialerAdvancedApi.powerDial({
          client_id: "saas-tenant",
          queue,
          max_calls: phones.length,
          voicemail_url: voicemailUrl.trim() || null,
        });
      }
      void load();
    } finally {
      setPowerBusy(false);
    }
  }

  async function runVoicemailDrop() {
    if (!voicemailUrl.trim() || !vmDropNumber.trim()) return;
    setVmBusy(true);
    try {
      await dialerAdvancedApi.voicemailDrop({
        to_number: vmDropNumber.trim(),
        voicemail_url: voicemailUrl.trim(),
      });
      void load();
    } finally {
      setVmBusy(false);
    }
  }

  async function createA2pDraft() {
    if (!a2pName.trim()) return;
    await fetch("/api/saas/dialer/a2p", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessName: a2pName.trim() }),
    });
    setA2pName("");
    void load();
  }

  const llamadas = Array.isArray(data?.calls) ? data.calls : [];
  const configurado = Boolean(data?.dialer_configured);

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Dialer Enterprise" parentTitle="Comunicación" pageTitle="Dialer" />
      <div className="container-fluid">
        <div className="row">
          <div className="col-xl-12">
            <p className="fs-14 text-muted">
              Click-to-call, power dial, parallel dial y registro A2P 10DLC
            </p>

            <ul className="nav nav-tabs mb-3">
              {([
                ["click", "Click-to-call"],
                ["power", "Power / Parallel"],
                ["a2p", "A2P 10DLC"],
              ] as const).map(([id, label]) => (
                <li className="nav-item" key={id}>
                  <button type="button" className={`nav-link ${tab === id ? "active" : ""}`}
                    aria-pressed={tab === id} onClick={() => setTab(id)}>
                    {label}
                  </button>
                </li>
              ))}
            </ul>

            {tab === "power" && (
              <W3crmContentBox titulo="Marcación masiva" icono="fa-solid fa-phone-volume">
                <ul className="nav nav-tabs mb-3">
                  {([
                    ["sequential", "Power dial"],
                    ["parallel", "Parallel dial"],
                    ["voicemail", "Voicemail drop"],
                  ] as const).map(([id, label]) => (
                    <li className="nav-item" key={id}>
                      <button type="button" className={`nav-link ${powerMode === id ? "active" : ""}`}
                        aria-pressed={powerMode === id} onClick={() => setPowerMode(id)}>
                        {label}
                      </button>
                    </li>
                  ))}
                </ul>

                {powerMode !== "voicemail" ? (
                  <>
                    <p className="fs-14 text-muted">
                      {powerMode === "parallel"
                        ? `Hasta ${parallelLimit} llamadas simultáneas vía Twilio.`
                        : "Un teléfono por línea — power dial secuencial vía Twilio."}
                    </p>
                    <div className="row">
                      {powerMode === "parallel" && (
                        <div className="col-xl-3 col-sm-6">
                          <div className="form-group mb-3">
                            <label htmlFor="dial-lineas" className="text-black font-w600">Líneas paralelas</label>
                            <input id="dial-lineas" className="form-control" type="number" min={1} max={10}
                              value={parallelLimit} onChange={(e) => setParallelLimit(Number(e.target.value))} />
                          </div>
                        </div>
                      )}
                      <div className={powerMode === "parallel" ? "col-xl-9 col-sm-6" : "col-xl-12"}>
                        <div className="form-group mb-3">
                          <label htmlFor="dial-vm-url" className="text-black font-w600">
                            URL audio voicemail (opcional)
                          </label>
                          <input id="dial-vm-url" className="form-control"
                            value={voicemailUrl} onChange={(e) => setVoicemailUrl(e.target.value)} />
                        </div>
                      </div>
                      <div className="col-xl-12">
                        <div className="form-group mb-3">
                          <label htmlFor="dial-cola" className="text-black font-w600">
                            Cola de teléfonos (uno por línea)
                          </label>
                          <textarea id="dial-cola" className="form-control" rows={5}
                            placeholder={"+34612345678\n+34698765432"}
                            value={powerQueue} onChange={(e) => setPowerQueue(e.target.value)} />
                        </div>
                      </div>
                      <div className="col-xl-12">
                        <div className="text-end">
                          <button type="button" className="btn btn-primary"
                            disabled={powerBusy || !configurado} onClick={() => void runPowerDial()}>
                            {powerBusy ? "Marcando…" : powerMode === "parallel" ? "Iniciar parallel dial" : "Iniciar power dial"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="row">
                    <div className="col-xl-12">
                      <p className="fs-14 text-muted">
                        Deja un mensaje de voz en un número sin contestar la llamada.
                      </p>
                    </div>
                    <div className="col-xl-6 col-sm-6">
                      <div className="form-group mb-3">
                        <label htmlFor="vm-url" className="text-black font-w600">URL del audio MP3/WAV</label>
                        <input id="vm-url" className="form-control"
                          value={voicemailUrl} onChange={(e) => setVoicemailUrl(e.target.value)} />
                      </div>
                    </div>
                    <div className="col-xl-6 col-sm-6">
                      <div className="form-group mb-3">
                        <label htmlFor="vm-num" className="text-black font-w600">Número destino</label>
                        <input id="vm-num" className="form-control" type="tel" placeholder="+34612345678"
                          value={vmDropNumber} onChange={(e) => setVmDropNumber(e.target.value)} />
                      </div>
                    </div>
                    <div className="col-xl-12">
                      <div className="text-end">
                        <button type="button" className="btn btn-primary"
                          disabled={vmBusy || !configurado} onClick={() => void runVoicemailDrop()}>
                          {vmBusy ? "Enviando…" : "Enviar voicemail drop"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </W3crmContentBox>
            )}

            {tab === "a2p" && (
              <W3crmContentBox titulo="Registro A2P 10DLC" icono="fa-solid fa-id-card">
                <p className="fs-14 text-muted">Registro A2P 10DLC para SMS masivo en EE.UU.</p>
                <div className="row align-items-end">
                  <div className="col-xl-8 col-sm-6">
                    <div className="form-group mb-3">
                      <label htmlFor="a2p-nombre" className="text-black font-w600">Nombre legal del negocio</label>
                      <input id="a2p-nombre" className="form-control"
                        value={a2pName} onChange={(e) => setA2pName(e.target.value)} />
                    </div>
                  </div>
                  <div className="col-xl-4 col-sm-6">
                    <div className="form-group mb-3">
                      <button type="button" className="btn btn-primary w-100" disabled={!a2pName.trim()}
                        onClick={() => void createA2pDraft()}>
                        Crear borrador
                      </button>
                    </div>
                  </div>
                </div>
                {a2pRegs.length === 0 ? (
                  <W3crmEmptyState title="Sin registros" description="Crea el primer borrador con el formulario de arriba." />
                ) : (
                  <W3crmDataTable
                    filas={a2pRegs}
                    etiqueta="registros"
                    wrapperId="a2p_wrapper"
                    porPagina={10}
                    columnas={[{ titulo: "Negocio" }, { titulo: "Estado", alFinal: true }]}
                    render={(r) => (
                      <tr key={r.id}>
                        <td><span className="fw-bold">{r.businessName || "—"}</span></td>
                        <td className="text-end">
                          <span className={`badge ${r.status === "approved" ? "badge-success" : "badge-secondary"}`}>
                            {r.status || "—"}
                          </span>
                        </td>
                      </tr>
                    )}
                  />
                )}
              </W3crmContentBox>
            )}

            {tab === "click" && (
              <>
                {!loading && data && !configurado && (
                  <div className="alert alert-warning" role="alert">
                    <strong>Dialer no configurado.</strong> Configura <code>TWILIO_ACCOUNT_SID</code> +{" "}
                    <code>TWILIO_AUTH_TOKEN</code> + <code>TWILIO_FROM_NUMBER</code> en las variables de entorno.
                  </div>
                )}
                {!loading && configurado && (
                  <div className="alert alert-success" role="status">
                    Dialer activo — desde <code>{data?.from_number ?? "—"}</code>
                  </div>
                )}

                <div className="row">
                  <div className="col-xl-4 col-sm-6">
                    <W3crmKpiTile label="Iniciadas" value={llamadas.filter((c) => c.status === "initiated").length} accent />
                  </div>
                  <div className="col-xl-4 col-sm-6">
                    <W3crmKpiTile label="Fallidas" value={llamadas.filter((c) => c.status === "failed").length} />
                  </div>
                  <div className="col-xl-4 col-sm-6">
                    <W3crmKpiTile label="Total" value={llamadas.length} />
                  </div>
                </div>

                <W3crmContentBox
                  titulo="Llamadas"
                  icono="fa-solid fa-phone"
                  acciones={
                    <button type="button" className="btn btn-primary btn-sm me-2" disabled={!configurado}
                      onClick={() => setShowCall(true)}>
                      + Nueva llamada
                    </button>
                  }
                >
                  {loading ? (
                    <W3crmCargando texto="Cargando llamadas…" />
                  ) : llamadas.length === 0 ? (
                    <W3crmEmptyState title="Sin llamadas" description="Inicia tu primera llamada click-to-call." />
                  ) : (
                    <W3crmDataTable
                      filas={llamadas}
                      etiqueta="llamadas"
                      wrapperId="calls_wrapper"
                      porPagina={10}
                      columnas={[
                        { titulo: "Destino" },
                        { titulo: "Mensaje" },
                        { titulo: "Fecha" },
                        { titulo: "Estado", alFinal: true },
                      ]}
                      render={(c) => (
                        <tr key={c.id}>
                          <td>
                            <span className="fw-bold">{c.to || "—"}</span>
                            {c.callSid ? <div className="text-muted fs-12">{c.callSid}</div> : null}
                          </td>
                          <td className="text-muted">{c.message || "—"}</td>
                          <td>{fechaHora(c.createdAt)}</td>
                          <td className="text-end">
                            <span className={`badge ${llamadaBadge(c.status)}`}>{llamadaLabel(c.status)}</span>
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

      {showCall && <CallModal onClose={() => setShowCall(false)} onCalled={load} />}
    </SaasW3crmShell>
  );
}
