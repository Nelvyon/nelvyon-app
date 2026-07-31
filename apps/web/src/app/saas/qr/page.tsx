"use client";

import { useCallback, useEffect, useState } from "react";
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
  // Real scannable QR via QR Server (no fake hash pattern). Color as hex without '#'.
  const fg = color.replace("#", "");
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(url)}&color=${fg}&bgcolor=ffffff&margin=8`;
  return (
    <img
      src={src}
      alt={`Código QR para ${url}`}
      width={size}
      height={size}
      className="rounded-lg border border-border bg-white"
    />
  );
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
          {error && <p className="mb-4 rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive" role="alert">{error}</p>}
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
      const d = (await res.json()) as { qrCodes?: QrCode[] };
      setQrs(d.qrCodes ?? []);
    } catch (e) {
      setQrs([]);
      setLoadError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="qr" />}>
      <div className="flex flex-col gap-6 pb-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <NelvyonDsSectionHeader title="Codigos QR" subtitle="Genera QR personalizados con tu marca para campanas fisicas y digitales" />
          <NelvyonDsButton onClick={() => setShowModal(true)}>+ Nuevo QR</NelvyonDsButton>
        </div>

        {loadError && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive" role="alert">
            {loadError}
          </p>
        )}

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