"use client";

import { FileText, Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { dashboardContractsApi } from "@/features/dashboard/api";
import { SimpleModal, StatusBadge } from "@/features/builders/components/DashboardUi";

interface ContractRow {
  id: number;
  title?: string;
  client_name?: string;
  status?: string;
  contract_type?: string;
}

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

export default function ContratosDashboardPage() {
  const [items, setItems] = useState<ContractRow[]>([]);
  const [modal, setModal] = useState(false);
  const [sendModal, setSendModal] = useState<ContractRow | null>(null);
  const [signerEmail, setSignerEmail] = useState("");
  const [form, setForm] = useState({
    title: "",
    client_name: "",
    contract_type: "servicios",
    content: "",
  });

  const load = useCallback(async () => {
    const res = await dashboardContractsApi.list();
    setItems((res.items as unknown as ContractRow[]) ?? []);
  }, []);

  useEffect(() => {
    load().catch(() => setItems([]));
  }, [load]);

  async function create() {
    await dashboardContractsApi.create({ ...form, status: "draft" });
    setModal(false);
    setForm({ title: "", client_name: "", contract_type: "servicios", content: "" });
    load();
  }

  async function sendSignature() {
    if (!sendModal) return;
    await dashboardContractsApi.sendForSignature(sendModal.id, signerEmail);
    setSendModal(null);
    setSignerEmail("");
    load();
  }

  async function downloadPdf(id: number, title?: string) {
    const blob = await dashboardContractsApi.downloadPdf(id);
    downloadBlob(blob, `${title ?? "contrato"}-${id}.pdf`);
  }

  return (
    <ProtectedLayout module="os">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Contratos</h1>
            <p className="text-sm text-muted-foreground">Gestión y firma digital de contratos</p>
          </div>
          <Button onClick={() => setModal(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nuevo contrato
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((c) => (
            <article className="rounded-xl border bg-card p-5 shadow-card" key={c.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold">{c.title ?? `Contrato #${c.id}`}</h2>
                </div>
                <StatusBadge status={c.status ?? "draft"} />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{c.client_name ?? "—"}</p>
              <p className="text-xs text-muted-foreground">{c.contract_type ?? "general"}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/dashboard/contratos/${c.id}`}>Editar</Link>
                </Button>
                <Button onClick={() => setSendModal(c)} size="sm">
                  Enviar firma
                </Button>
                <Button onClick={() => downloadPdf(c.id, c.title)} size="sm" variant="outline">
                  PDF
                </Button>
              </div>
            </article>
          ))}
        </div>
      </div>

      <SimpleModal onClose={() => setModal(false)} open={modal} title="Nuevo contrato" wide>
        <div className="grid gap-3">
          <input
            className="rounded-lg border px-3 py-2"
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Título del contrato"
            value={form.title}
          />
          <input
            className="rounded-lg border px-3 py-2"
            onChange={(e) => setForm({ ...form, client_name: e.target.value })}
            placeholder="Nombre del cliente"
            value={form.client_name}
          />
          <select
            className="rounded-lg border px-3 py-2"
            onChange={(e) => setForm({ ...form, contract_type: e.target.value })}
            value={form.contract_type}
          >
            <option value="servicios">Servicios</option>
            <option value="consultoria">Consultoría</option>
            <option value="nda">NDA</option>
            <option value="laboral">Laboral</option>
          </select>
          <textarea
            className="rounded-lg border px-3 py-2"
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            placeholder="Contenido del contrato"
            rows={6}
            value={form.content}
          />
          <Button onClick={create}>Crear contrato</Button>
        </div>
      </SimpleModal>

      <SimpleModal onClose={() => setSendModal(null)} open={Boolean(sendModal)} title="Enviar para firma">
        <div className="grid gap-3">
          <p className="text-sm text-muted-foreground">
            Enviar <strong>{sendModal?.title ?? "contrato"}</strong> al firmante por email.
          </p>
          <input
            className="rounded-lg border px-3 py-2"
            onChange={(e) => setSignerEmail(e.target.value)}
            placeholder="Email del firmante"
            type="email"
            value={signerEmail}
          />
          <Button disabled={!signerEmail} onClick={sendSignature}>
            Enviar solicitud de firma
          </Button>
        </div>
      </SimpleModal>
    </ProtectedLayout>
  );
}
