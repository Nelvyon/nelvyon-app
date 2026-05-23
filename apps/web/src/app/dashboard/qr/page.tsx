"use client";

import Image from "next/image";
import { Download, Plus, QrCode } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { DashboardListShell, DashboardPageTransition, SkeletonList, SkeletonTable, EliteModal } from "@/features/dashboard/components/DashboardTabs";

import { Button } from "@/core/ui/button";
import { toastSuccess } from "@/core/ui/toastFeedback";
import { dashboardQrApi } from "@/features/dashboard/api";

type Row = Record<string, unknown>;

function str(v: unknown, fb = "—"): string {
  if (v == null || v === "") return fb;
  return String(v);
}

const QR_TYPES = ["url", "texto", "email", "telefono", "whatsapp", "instagram", "wifi", "vcard", "menu"];

export default function QrDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Row[]>([]);
  const [preview, setPreview] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [stats, setStats] = useState<Record<string, unknown>>({});
  const [dynamicModal, setDynamicModal] = useState(false);
  const [editModal, setEditModal] = useState<Row | null>(null);
  const [form, setForm] = useState({
    content: "https://nelvyon.com",
    qr_type: "url",
    name: "",
    color_fondo: "#ffffff",
    color_qr: "#000000",
    size: 300,
  });
  const [dynamicForm, setDynamicForm] = useState({ name: "", destination_url: "https://nelvyon.com" });
  const [editUrl, setEditUrl] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
    const res = await dashboardQrApi.list();
    setItems(res.items ?? []);
    } catch {
      /* preserved */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => setItems([]));
  }, [load]);

  async function generatePreview() {
    const res = await dashboardQrApi.generate({
      content: form.content,
      qr_type: form.qr_type,
      name: form.name,
      config: {
        color_fondo: form.color_fondo,
        color_qr: form.color_qr,
        size: form.size,
      },
    });
    setPreview(str(res.image_base64));
  }

  async function createDynamic() {
    await dashboardQrApi.createDynamic(dynamicForm);
    setDynamicModal(false);
    toastSuccess("QR dinámico creado");
    load();
  }

  async function saveEdit() {
    if (!editModal?.id) return;
    await dashboardQrApi.updateDynamic(str(editModal.id), editUrl);
    setEditModal(null);
    toastSuccess("Destino actualizado");
    load();
  }

  async function loadStats(id: string) {
    setSelectedId(id);
    const s = await dashboardQrApi.stats(id);
    setStats(s);
  }

  function downloadPng() {
    if (!preview) return;
    const a = document.createElement("a");
    a.href = preview.startsWith("data:") ? preview : `data:image/png;base64,${preview}`;
    a.download = "qr-code.png";
    a.click();
  }

  return (
    <ProtectedLayout module="os">
      <DashboardPageTransition>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <QrCode className="h-7 w-7 text-primary" aria-hidden />
              QR Code Generator
            </h1>
            <p className="text-sm text-muted-foreground">QR estáticos y dinámicos con tracking</p>
          </div>
          <Button onClick={() => setDynamicModal(true)}>
            <Plus className="mr-2 h-4 w-4" /> QR dinámico
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3 rounded-lg border p-4">
            <h2 className="font-semibold">Generador</h2>
            <select
              className="w-full rounded border px-3 py-2 text-sm"
              value={form.qr_type}
              onChange={(e) => setForm({ ...form, qr_type: e.target.value })}
            >
              {QR_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              className="w-full rounded border px-3 py-2 text-sm"
              placeholder="Contenido / URL"
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
            />
            <div className="flex gap-3">
              <label className="text-xs">
                Fondo
                <input type="color" value={form.color_fondo} onChange={(e) => setForm({ ...form, color_fondo: e.target.value })} />
              </label>
              <label className="text-xs">
                QR
                <input type="color" value={form.color_qr} onChange={(e) => setForm({ ...form, color_qr: e.target.value })} />
              </label>
            </div>
            <Button onClick={generatePreview}>Generar preview</Button>
            {preview ? (
              <div className="flex flex-col items-center gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview.startsWith("data:") ? preview : `data:image/png;base64,${preview}`} alt="QR preview" className="h-40 w-40" />
                <Button size="sm" variant="outline" onClick={downloadPng}>
                  <Download className="mr-1 h-4 w-4" /> Descargar PNG
                </Button>
              </div>
            ) : null}
          </div>

          <DashboardListShell
          empty={!loading && items.length === 0}
          emptyDescription="Genera QR estáticos o dinámicos."
          emptyTitle="Sin códigos QR"
          emptyActionLabel="QR dinámico"
          onEmptyAction={() => setDynamicModal(true)}
          loading={loading}
          skeleton={<SkeletonList />}
        >
        <div className="rounded-lg border p-4">
            <h2 className="mb-3 font-semibold">QRs dinámicos</h2>
            {items.filter((i) => i.is_dynamic).length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin QRs dinámicos aún.</p>
            ) : (
              <div className="space-y-2">
                {items
                  .filter((i) => i.is_dynamic)
                  .map((q) => (
                    <div key={str(q.id)} className="rounded border p-3 text-sm">
                      <p className="font-medium">{str(q.name)}</p>
                      <p className="text-muted-foreground truncate">{str(q.destination_url)}</p>
                      <p className="text-xs">{str(q.scan_count, "0")} escaneos · /qr/{str(q.short_code)}</p>
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => loadStats(str(q.id))}>
                          Stats
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditModal(q);
                            setEditUrl(str(q.destination_url));
                          }}
                        >
                          Editar destino
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            )}
            {selectedId && stats.scan_count !== undefined ? (
              <div className="mt-4 rounded bg-muted/50 p-3 text-sm">
                <p className="font-medium">Estadísticas — {str(stats.scan_count, "0")} escaneos</p>
                <ul className="mt-2 space-y-1 text-xs">
                  {((stats.scans_by_day as Row[]) ?? []).slice(0, 7).map((d) => (
                    <li key={str(d.day)}>
                      {str(d.day)}: {str(d.scans, "0")}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </DashboardListShell>
        </div>
      </DashboardPageTransition>

      <EliteModal open={dynamicModal} onClose={() => setDynamicModal(false)} title="Nuevo QR dinámico">
          <div className="space-y-3">
            <input className="w-full rounded border px-3 py-2 text-sm" placeholder="Nombre" value={dynamicForm.name} onChange={(e) => setDynamicForm({ ...dynamicForm, name: e.target.value })} />
            <input className="w-full rounded border px-3 py-2 text-sm" placeholder="URL destino" value={dynamicForm.destination_url} onChange={(e) => setDynamicForm({ ...dynamicForm, destination_url: e.target.value })} />
            <Button onClick={createDynamic}>Crear</Button>
          </div>
        </EliteModal>

        <EliteModal open={Boolean(editModal)} onClose={() => setEditModal(null)} title="Editar destino">
          <div className="space-y-3">
            <input className="w-full rounded border px-3 py-2 text-sm" value={editUrl} onChange={(e) => setEditUrl(e.target.value)} />
            <Button onClick={saveEdit}>Guardar</Button>
          </div>
      </EliteModal>
    </ProtectedLayout>
  );
}
