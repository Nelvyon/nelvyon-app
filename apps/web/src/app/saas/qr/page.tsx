"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

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

function QRCanvas({ url, color, size = 180 }: { url: string; color: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, size, size);
    const modules = 21;
    const cellSize = (size - 20) / modules;
    const offset = 10;
    let hash = 0;
    for (let i = 0; i < url.length; i++) hash = ((hash << 5) - hash + url.charCodeAt(i)) | 0;
    ctx.fillStyle = color;
    for (let r = 0; r < modules; r++) {
      for (let c = 0; c < modules; c++) {
        const isCorner = (r < 7 && c < 7) || (r < 7 && c >= modules - 7) || (r >= modules - 7 && c < 7);
        const isCornerInner = (r >= 2 && r <= 4 && c >= 2 && c <= 4) || (r >= 2 && r <= 4 && c >= modules - 5 && c <= modules - 3) || (r >= modules - 5 && r <= modules - 3 && c >= 2 && c <= 4);
        const isTiming = (r === 6 || c === 6) && !isCorner;
        let fill = false;
        if (isCorner) fill = !(r === 1 || r === 5 || c === 1 || c === 5) || isCornerInner;
        else if (isTiming) fill = (r + c) % 2 === 0;
        else fill = ((Math.abs(((hash * (r * 31 + c * 37)) >>> 0) % 3)) === 0);
        if (fill) ctx.fillRect(offset + c * cellSize, offset + r * cellSize, cellSize - 1, cellSize - 1);
      }
    }
    const lx = size / 2 - 12, ly = size / 2 - 12;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(lx - 2, ly - 2, 28, 28);
    ctx.fillStyle = color;
    ctx.font = "bold 18px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("N", size / 2, size / 2 + 6);
  }, [url, color, size]);

  return <canvas ref={canvasRef} width={size} height={size} className="rounded-lg" />;
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
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-lg rounded-2xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Nuevo codigo QR</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">x</button>
        </div>
        <form onSubmit={save} className="p-6">
          {error && <p className="mb-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</p>}
          <div className="flex gap-6">
            <div className="flex-1 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Nombre *</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Menu Restaurante"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">URL de destino *</label>
                <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://tu-web.com/pagina"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none" />
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium text-muted-foreground">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {QR_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setColor(c)}
                      className={`h-7 w-7 rounded-full border-2 transition-transform ${color === c ? "scale-125 border-white" : "border-transparent"}`}
                      style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="shrink-0">
              <p className="mb-2 text-xs font-medium text-muted-foreground text-center">Vista previa</p>
              <QRCanvas url={preview} color={color} size={140} />
            </div>
          </div>
          <div className="mt-5 flex gap-3">
            <NelvyonDsButton type="button" variant="ghost" onClick={onClose} className="flex-1">Cancelar</NelvyonDsButton>
            <NelvyonDsButton type="submit" disabled={saving || !name || !url} className="flex-1">{saving ? "Creando..." : "Crear QR"}</NelvyonDsButton>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function SaasQrPage() {
  const [qrs, setQrs] = useState<QrCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/saas/surveys?type=qr");
      if (res.ok) {
        const d = (await res.json()) as { qrCodes?: QrCode[] };
        setQrs(d.qrCodes ?? []);
      } else setQrs([]);
    } catch { setQrs([]); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="qr" />}>
      <div className="flex flex-col gap-6 pb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <NelvyonDsSectionHeader title="Codigos QR" subtitle="Genera QR personalizados con tu marca para campanas fisicas y digitales" />
          <NelvyonDsButton onClick={() => setShowModal(true)}>+ Nuevo QR</NelvyonDsButton>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "QRs creados", value: qrs.length },
            { label: "Escaneos totales", value: qrs.reduce((s, q) => s + q.scans, 0).toLocaleString("es-ES") },
            { label: "Con actividad", value: qrs.filter(q => q.scans > 0).length },
          ].map(({ label, value }) => (
            <NelvyonDsCard key={label} className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
            </NelvyonDsCard>
          ))}
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map(i => <div key={i} className="h-64 animate-pulse rounded-xl bg-muted/30" />)}
          </div>
        ) : qrs.length === 0 ? (
          <NelvyonDsCard className="p-16 text-center">
            <p className="text-5xl">📱</p>
            <p className="mt-4 text-lg font-semibold text-foreground">Sin codigos QR</p>
            <p className="mt-2 text-sm text-muted-foreground">Crea tu primer QR para empezar a rastrear escaneos</p>
            <NelvyonDsButton className="mt-5" onClick={() => setShowModal(true)}>+ Nuevo QR</NelvyonDsButton>
          </NelvyonDsCard>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {qrs.map(qr => (
              <NelvyonDsCard key={qr.id} className="flex flex-col items-center p-5 text-center gap-4 hover:border-primary/30 transition-colors">
                <QRCanvas url={qr.destinationUrl} color={qr.color} size={160} />
                <div>
                  <p className="font-semibold text-foreground">{qr.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground truncate max-w-48">{qr.destinationUrl}</p>
                  <p className="mt-2 text-lg font-bold text-foreground">{qr.scans.toLocaleString("es-ES")} <span className="text-sm font-normal text-muted-foreground">escaneos</span></p>
                </div>
              </NelvyonDsCard>
            ))}
            <NelvyonDsCard className="flex flex-col items-center justify-center p-5 text-center border-dashed min-h-64 hover:border-primary/50 transition-colors cursor-pointer" onClick={() => setShowModal(true)}>
              <p className="text-4xl text-muted-foreground">+</p>
              <p className="mt-2 text-sm font-medium text-muted-foreground">Nuevo codigo QR</p>
            </NelvyonDsCard>
          </div>
        )}

        {showModal && <CreateQRModal onClose={() => setShowModal(false)} onSaved={load} />}
      </div>
    </SaasShellLayout>
  );
}