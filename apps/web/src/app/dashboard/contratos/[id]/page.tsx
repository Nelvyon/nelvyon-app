"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { dashboardContractsApi } from "@/features/dashboard/api";
import { SimpleModal, StatusBadge } from "@/features/builders/components/DashboardUi";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function ContratoDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id ?? 0);
  const [contract, setContract] = useState<Record<string, unknown> | null>(null);
  const [saving, setSaving] = useState(false);
  const [sendModal, setSendModal] = useState(false);
  const [signerEmail, setSignerEmail] = useState("");
  const [form, setForm] = useState({
    title: "",
    client_name: "",
    content: "",
    status: "draft",
  });

  const load = useCallback(async () => {
    if (!id) return;
    const data = await dashboardContractsApi.get(id);
    setContract(data);
    setForm({
      title: String(data.title ?? ""),
      client_name: String(data.client_name ?? ""),
      content: String(data.content ?? ""),
      status: String(data.status ?? "draft"),
    });
  }, [id]);

  useEffect(() => {
    load().catch(() => setContract(null));
  }, [load]);

  async function save() {
    setSaving(true);
    try {
      await dashboardContractsApi.update(id, form);
      await load();
    } finally {
      setSaving(false);
    }
  }

  async function sendSignature() {
    await dashboardContractsApi.sendForSignature(id, signerEmail);
    setSendModal(false);
    setSignerEmail("");
    load();
  }

  async function downloadPdf() {
    const blob = await dashboardContractsApi.downloadPdf(id);
    downloadBlob(blob, `${form.title || "contrato"}-${id}.pdf`);
  }

  return (
    <ProtectedLayout module="os">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link className="text-sm text-muted-foreground" href="/dashboard/contratos">
              ← Contratos
            </Link>
            <h1 className="text-2xl font-bold">{form.title || "Contrato"}</h1>
            {contract ? <StatusBadge status={form.status} /> : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setSendModal(true)} variant="outline">
              Enviar firma
            </Button>
            <Button onClick={downloadPdf} variant="outline">
              Descargar PDF
            </Button>
            <Button disabled={saving} onClick={save}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-3">
            <input
              className="w-full rounded-lg border px-3 py-2"
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Título"
              value={form.title}
            />
            <input
              className="w-full rounded-lg border px-3 py-2"
              onChange={(e) => setForm({ ...form, client_name: e.target.value })}
              placeholder="Cliente"
              value={form.client_name}
            />
            <select
              className="w-full rounded-lg border px-3 py-2"
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              value={form.status}
            >
              <option value="draft">Borrador</option>
              <option value="sent">Enviado</option>
              <option value="signed">Firmado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>
          <textarea
            className="min-h-[320px] w-full rounded-lg border px-3 py-2 font-mono text-sm"
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            placeholder="Contenido del contrato"
            value={form.content}
          />
        </div>
      </div>

      <SimpleModal onClose={() => setSendModal(false)} open={sendModal} title="Enviar para firma">
        <div className="grid gap-3">
          <input
            className="rounded-lg border px-3 py-2"
            onChange={(e) => setSignerEmail(e.target.value)}
            placeholder="Email del firmante"
            type="email"
            value={signerEmail}
          />
          <Button disabled={!signerEmail} onClick={sendSignature}>
            Enviar
          </Button>
        </div>
      </SimpleModal>
    </ProtectedLayout>
  );
}
