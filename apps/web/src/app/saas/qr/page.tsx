"use client";

/**
 * /saas/qr sobre `(cms)/content` de W3CRM, con las piezas ya portadas
 * (`W3crmContentBox`, `W3crmDataTable`, `W3crmModal`, `W3crmKpiTile`).
 *
 * Logica de NELVYON intacta: `GET /api/saas/surveys?type=qr`, el `POST` con
 * `resourceType: "qr"`, el tipo `QrCode`, el catalogo `QR_COLORS`, `QRCanvas`
 * (QR real via api.qrserver.com) y `load` con su manejo de error.
 */
import { useCallback, useEffect, useState } from "react";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmEmptyState, W3crmKpiTile } from "@/features/saas-w3crm/components/W3crmUi";
import { W3crmCargando, W3crmContentBox, W3crmDataTable, W3crmModal } from "@/features/saas-w3crm/components/W3crmContentBox";

interface QrCode {
  id: string;
  name: string;
  destinationUrl: string;
  color: string;
  bgColor: string;
  scans: number;
  lastScannedAt: string | null;
  createdAt: string;
}

const QR_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#3b82f6", "#ec4899", "#000000"];

function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function QRCanvas({ url, color, size = 180 }: { url: string; color: string; size?: number }) {
  // QR real via QR Server (no un patron falso). Color en hex sin '#'.
  const fg = (color || "#000000").replace("#", "");
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&color=${fg}&bgcolor=ffffff&margin=8`;
  // `<img>` directo: el QR lo genera un servicio externo y `next/image` no
  // aporta nada aqui (no hay optimizacion posible sobre un PNG remoto ya
  // dimensionado). Era asi antes de la migracion.
  return <img src={src} alt={`Código QR para ${url}`} width={size} height={size} className="rounded border bg-white" />;
}

function CreateQRModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [color, setColor] = useState("#6366f1");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const preview = url.startsWith("http") ? url : url ? `https://${url}` : "https://nelvyon.com";

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !url.trim()) { setError("Nombre y URL son obligatorios"); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch("/api/saas/surveys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceType: "qr", name: name.trim(), destinationUrl: preview, color }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Error al crear QR");
      }
      onSaved(); onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally { setSaving(false); }
  }

  return (
    <W3crmModal titulo="Nuevo código QR" onClose={onClose} error={error} testId="modal-qr">
      <form onSubmit={save}>
        <div className="row">
          <div className="col-lg-8">
            <div className="form-group mb-3">
              <label htmlFor="qr-nombre" className="text-black font-w600">Nombre <span className="required">*</span></label>
              <input id="qr-nombre" type="text" className="form-control" placeholder="Ej: Menú Restaurante"
                value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="form-group mb-3">
              <label htmlFor="qr-url" className="text-black font-w600">URL de destino <span className="required">*</span></label>
              <input id="qr-url" type="text" className="form-control" placeholder="https://tu-web.com/pagina"
                value={url} onChange={(e) => setUrl(e.target.value)} />
            </div>
            <div className="form-group mb-3">
              <label className="text-black font-w600 d-block">Color</label>
              {QR_COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setColor(c)}
                  aria-label={`Color ${c}`} aria-pressed={color === c}
                  className={`btn btn-sm me-1 ${color === c ? "border border-dark" : ""}`}
                  style={{ backgroundColor: c, width: 28, height: 28 }} />
              ))}
            </div>
          </div>
          <div className="col-lg-4 text-center">
            <p className="fs-12 text-muted mb-2">Vista previa</p>
            <QRCanvas url={preview} color={color} size={140} />
          </div>
          <div className="col-lg-12">
            <div className="text-end">
              <button type="button" className="btn btn-danger light me-2" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={saving || !name || !url}>
                {saving ? "Creando…" : "Crear QR"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </W3crmModal>
  );
}

export default function SaasQrPage() {
  const [qrs, setQrs] = useState<QrCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/saas/surveys?type=qr");
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(d.error ?? `HTTP ${res.status}`);
      }
      const d = (await res.json().catch(() => ({}))) as { qrCodes?: QrCode[] };
      setQrs(Array.isArray(d.qrCodes) ? d.qrCodes : []);
    } catch (e) {
      setQrs([]);
      setLoadError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Códigos QR" parentTitle="Gestión" pageTitle="Códigos QR" />
      <div className="container-fluid">
        <div className="row">
          {loadError && (
            <div className="col-xl-12">
              <div className="alert alert-danger alert-dismissible fade show" role="alert">
                {loadError}
                <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => setLoadError(null)} />
              </div>
            </div>
          )}
          <div className="col-xl-4 col-sm-6"><W3crmKpiTile label="QRs creados" value={qrs.length} accent /></div>
          <div className="col-xl-4 col-sm-6"><W3crmKpiTile label="Escaneos totales" value={qrs.reduce((s, q) => s + num(q.scans), 0).toLocaleString("es-ES")} /></div>
          <div className="col-xl-4 col-sm-6"><W3crmKpiTile label="Con actividad" value={qrs.filter((q) => num(q.scans) > 0).length} /></div>

          <div className="col-xl-12">
            <div className="mb-3">
              <ul className="d-flex align-items-center flex-wrap">
                <li>
                  <button type="button" className="btn btn-primary" onClick={() => setShowModal(true)}>+ Nuevo QR</button>
                </li>
              </ul>
            </div>

            <W3crmContentBox titulo="Códigos QR" icono="fa-solid fa-qrcode">
              {loading ? (
                <W3crmCargando texto="Cargando códigos QR…" />
              ) : qrs.length === 0 ? (
                <W3crmEmptyState title="Sin códigos QR" description="Crea tu primer QR para empezar a rastrear escaneos." />
              ) : (
                <W3crmDataTable
                  filas={qrs}
                  etiqueta="códigos"
                  columnas={[{ titulo: "QR" }, { titulo: "Nombre" }, { titulo: "Destino" }, { titulo: "Escaneos" }, { titulo: "Último escaneo", alFinal: true }]}
                  render={(qr) => (
                    <tr key={qr.id}>
                      <td><QRCanvas url={qr.destinationUrl} color={qr.color} size={64} /></td>
                      <td><span className="fw-bold">{qr.name || "—"}</span></td>
                      <td><span className="text-muted fs-12">{qr.destinationUrl || "—"}</span></td>
                      <td>{num(qr.scans).toLocaleString("es-ES")}</td>
                      <td className="text-end">
                        {qr.lastScannedAt && !Number.isNaN(new Date(qr.lastScannedAt).getTime())
                          ? new Date(qr.lastScannedAt).toLocaleDateString("es-ES")
                          : "—"}
                      </td>
                    </tr>
                  )}
                />
              )}
            </W3crmContentBox>
          </div>
        </div>
      </div>

      {showModal && <CreateQRModal onClose={() => setShowModal(false)} onSaved={load} />}
    </SaasW3crmShell>
  );
}
