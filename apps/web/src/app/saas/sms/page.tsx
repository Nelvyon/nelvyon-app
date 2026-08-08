"use client";

/**
 * /saas/sms sobre `(cms)/content` de W3CRM, con las piezas ya portadas.
 * Mapeo: log de mensajes -> `W3crmContentBox` + `W3crmDataTable`; el envio ->
 * `W3crmModal`; metricas -> `W3crmKpiTile`. Sin componentes nuevos.
 *
 * Inventario: sin `data-testid` y sin spec dedicado — lo cubre
 * `saas-nav-full-coverage`. Sin textos-contrato.
 *
 * Logica de NELVYON intacta: `GET /api/saas/sms?limit=50` (con
 * `sms_configured`, `from_number` y `messages`) y el `POST` de envio, que
 * considera fallo tanto un HTTP no-ok como un `ok: false` en el cuerpo; el
 * limite de 160 caracteres que bloquea el envio; los dos banners de estado de
 * Twilio; el bloqueo del alta cuando no esta configurado; la pantalla de
 * confirmacion dentro del modal y la recarga del log al enviar.
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

interface SmsLogEntry {
  id: string;
  to: string;
  body: string;
  twilioSid: string | null;
  status: "sent" | "failed" | "queued";
  createdAt: string;
}

const MAX_SMS = 160;

const STATUS_LABEL: Record<string, string> = {
  sent: "Enviado",
  queued: "En cola",
  failed: "Fallido",
};
const STATUS_BADGE: Record<string, string> = {
  sent: "badge-success",
  queued: "badge-primary",
  failed: "badge-danger",
};

/** Un estado fuera de catalogo pintaba `undefined`. */
function estadoLabel(s: string): string {
  return STATUS_LABEL[s] ?? (s ? String(s) : "—");
}
function estadoBadge(s: string): string {
  return STATUS_BADGE[s] ?? "badge-secondary";
}
function fechaHora(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("es-ES");
}

function SendSmsModal({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const [to, setTo] = useState("");
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!to.trim() || !msg.trim()) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: to.trim(), message: msg.trim() }),
      });
      const j = (await res.json().catch(() => ({}))) as { error?: string; ok?: boolean };
      if (!res.ok || j.ok === false) throw new Error(j.error ?? "Error al enviar");
      setDone(true);
      onSent();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setSending(false);
    }
  }

  return (
    <W3crmModal titulo="Enviar SMS" onClose={onClose} error={error}>
      {done ? (
        <div className="text-center py-4">
          <h5 className="mb-3">SMS enviado</h5>
          <button type="button" className="btn btn-primary" onClick={onClose}>Cerrar</button>
        </div>
      ) : (
        <form onSubmit={(e) => void send(e)}>
          <div className="form-group mb-3">
            <label htmlFor="sms-to" className="text-black font-w600">
              Número de destino <span className="required">*</span>
            </label>
            <input id="sms-to" className="form-control" type="tel" placeholder="+34 600 000 000"
              value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div className="form-group mb-3">
            <label htmlFor="sms-body" className="d-flex justify-content-between text-black font-w600">
              <span>Mensaje <span className="required">*</span></span>
              <span className={msg.length > MAX_SMS ? "text-danger" : "text-muted"}>
                {msg.length}/{MAX_SMS}
              </span>
            </label>
            <textarea id="sms-body" className="form-control" rows={4} placeholder="Escribe tu mensaje aquí…"
              value={msg} onChange={(e) => setMsg(e.target.value)} />
          </div>
          <div className="text-end">
            <button type="button" className="btn btn-primary light me-2" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={sending || msg.length > MAX_SMS}>
              {sending ? "Enviando…" : "Enviar SMS"}
            </button>
          </div>
        </form>
      )}
    </W3crmModal>
  );
}

export default function SaasSmsPage() {
  const [messages, setMessages] = useState<SmsLogEntry[]>([]);
  const [fromNumber, setFromNumber] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSend, setShowSend] = useState(false);
  const [configured, setConfigured] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/sms?limit=50");
      const data = (await res.json().catch(() => ({}))) as {
        sms_configured?: boolean;
        from_number?: string | null;
        messages?: SmsLogEntry[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? `Error ${res.status} al cargar SMS`);
      }
      setConfigured(data.sms_configured ?? false);
      setFromNumber(data.from_number ?? null);
      setMessages(Array.isArray(data.messages) ? data.messages : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar SMS");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const totalSent = messages.filter((m) => m.status === "sent").length;
  const totalFailed = messages.filter((m) => m.status === "failed").length;

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="SMS Marketing" parentTitle="Comunicación" pageTitle="SMS" />
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

          {configured === false && (
            <div className="col-xl-12">
              <div className="alert alert-warning" role="alert">
                <strong>Twilio no configurado.</strong> Añade <code>TWILIO_ACCOUNT_SID</code>,{" "}
                <code>TWILIO_AUTH_TOKEN</code> y <code>TWILIO_FROM_NUMBER</code> en Railway para activar SMS.
              </div>
            </div>
          )}
          {configured === true && (
            <div className="col-xl-12">
              <div className="alert alert-success" role="status">
                SMS activo vía Twilio{fromNumber ? <> · desde <code>{fromNumber}</code></> : null}
              </div>
            </div>
          )}

          <div className="col-xl-4 col-sm-6"><W3crmKpiTile label="Enviados" value={totalSent} accent /></div>
          <div className="col-xl-4 col-sm-6"><W3crmKpiTile label="Fallidos" value={totalFailed} /></div>
          <div className="col-xl-4 col-sm-6"><W3crmKpiTile label="Total" value={messages.length} /></div>

          <div className="col-xl-12">
            <p className="fs-14 text-muted">Envía mensajes directos a tus contactos vía Twilio</p>

            <W3crmContentBox
              titulo="Mensajes enviados"
              icono="fa-solid fa-comment-sms"
              acciones={
                <button type="button" className="btn btn-primary btn-sm me-2" disabled={configured === false}
                  onClick={() => setShowSend(true)}>
                  + Enviar SMS
                </button>
              }
            >
              {loading ? (
                <W3crmCargando texto="Cargando mensajes…" />
              ) : messages.length === 0 ? (
                <W3crmEmptyState
                  title="Sin SMS enviados"
                  description="Envía tu primer mensaje para llegar directamente al móvil de tus contactos."
                />
              ) : (
                <W3crmDataTable
                  filas={messages}
                  etiqueta="mensajes"
                  wrapperId="sms_wrapper"
                  porPagina={10}
                  columnas={[
                    { titulo: "Destino" },
                    { titulo: "Mensaje" },
                    { titulo: "Fecha" },
                    { titulo: "Estado", alFinal: true },
                  ]}
                  render={(m) => (
                    <tr key={m.id}>
                      <td><span className="fw-bold">{m.to || "—"}</span></td>
                      <td className="text-muted">{m.body || "—"}</td>
                      <td>{fechaHora(m.createdAt)}</td>
                      <td className="text-end">
                        <span className={`badge ${estadoBadge(m.status)}`}>{estadoLabel(m.status)}</span>
                      </td>
                    </tr>
                  )}
                />
              )}
            </W3crmContentBox>
          </div>
        </div>
      </div>

      {showSend && <SendSmsModal onClose={() => setShowSend(false)} onSent={load} />}
    </SaasW3crmShell>
  );
}
