"use client";

import { useEffect, useState } from "react";

type ContractStatus = "draft" | "sent" | "signed" | "voided";

type ContractInput = {
  clientName: string;
  clientEmail: string;
  serviceType: string;
  price: number;
  currency: string;
  duration: string;
  terms?: string[];
  startDate: string;
};

type Contract = {
  id: string;
  clientName: string;
  clientEmail: string;
  serviceType: string;
  price: number;
  currency: string;
  contractText: string;
  status: ContractStatus;
  createdAt: string;
};

function statusClass(status: ContractStatus): string {
  if (status === "signed") return "bg-emerald-700";
  if (status === "sent") return "bg-yellow-700";
  if (status === "voided") return "bg-red-700";
  return "bg-zinc-700";
}

export default function ContractsDashboard() {
  const [form, setForm] = useState<ContractInput>({
    clientName: "",
    clientEmail: "",
    serviceType: "",
    price: 0,
    currency: "EUR",
    duration: "12 months",
    startDate: "",
    terms: [],
  });
  const [termInput, setTermInput] = useState("");
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [selected, setSelected] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  async function loadContracts(): Promise<void> {
    const res = await fetch("/api/saas/contracts");
    if (!res.ok) throw new Error("load_failed");
    const data = (await res.json()) as { contracts: Contract[] };
    setContracts(data.contracts ?? []);
    if (!selected && (data.contracts?.length ?? 0) > 0) setSelected(data.contracts[0]);
  }

  useEffect(() => {
    loadContracts().catch(() => setStatus("No se pudieron cargar contratos"));
  }, []);

  function addTerm(): void {
    const t = termInput.trim();
    if (!t) return;
    setForm((prev) => ({ ...prev, terms: [...(prev.terms ?? []), t] }));
    setTermInput("");
  }

  async function createContract(): Promise<void> {
    if (!form.clientName || !form.clientEmail || !form.serviceType) {
      setStatus("Faltan campos requeridos");
      return;
    }
    setLoading(true);
    setStatus("");
    try {
      const res = await fetch("/api/saas/contracts/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("create_failed");
      const data = (await res.json()) as { contract: Contract };
      await loadContracts();
      setSelected(data.contract);
      setStatus("Contrato generado");
    } catch {
      setStatus("No se pudo generar contrato");
    } finally {
      setLoading(false);
    }
  }

  async function sendToSign(contractId: string): Promise<void> {
    setStatus("");
    try {
      const res = await fetch("/api/saas/contracts/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractId }),
      });
      if (!res.ok) throw new Error("send_failed");
      await loadContracts();
      setStatus("Contrato enviado a firma");
    } catch {
      setStatus("No se pudo enviar a firma");
    }
  }

  return (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-100">
      <h2 className="text-lg font-semibold">Contratos Digitales</h2>
      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <input className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" placeholder="Client name" value={form.clientName} onChange={(e) => setForm((p) => ({ ...p, clientName: e.target.value }))} />
        <input className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" placeholder="Client email" value={form.clientEmail} onChange={(e) => setForm((p) => ({ ...p, clientEmail: e.target.value }))} />
        <input className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" placeholder="Service type" value={form.serviceType} onChange={(e) => setForm((p) => ({ ...p, serviceType: e.target.value }))} />
        <input className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" placeholder="Duration" value={form.duration} onChange={(e) => setForm((p) => ({ ...p, duration: e.target.value }))} />
        <input className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" type="number" placeholder="Price" value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: Number(e.target.value) }))} />
        <input className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" placeholder="Currency" value={form.currency} onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))} />
        <input className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm md:col-span-2" type="date" value={form.startDate} onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))} />
        <div className="md:col-span-2">
          <div className="flex gap-2">
            <input className="flex-1 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm" placeholder="Term" value={termInput} onChange={(e) => setTermInput(e.target.value)} />
            <button className="rounded bg-zinc-800 px-3 py-2 text-sm hover:bg-zinc-700" type="button" onClick={addTerm}>
              Añadir
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {(form.terms ?? []).map((t, i) => (
              <span className="rounded bg-zinc-800 px-2 py-1 text-xs" key={`${t}-${i}`}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      <button className="mt-3 rounded bg-indigo-700 px-4 py-2 text-sm hover:bg-indigo-600 disabled:opacity-60" disabled={loading} onClick={createContract} type="button">
        Generar Contrato
      </button>

      <div className="mt-5 grid gap-4 lg:grid-cols-[260px_1fr]">
        <aside className="rounded border border-zinc-800 bg-zinc-900 p-3">
          <h3 className="mb-2 text-sm font-semibold">Contratos</h3>
          <div className="space-y-1">
            {contracts.map((c) => (
              <button
                className={`block w-full rounded px-2 py-2 text-left text-xs ${selected?.id === c.id ? "bg-indigo-700 text-white" : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"}`}
                key={c.id}
                onClick={() => setSelected(c)}
                type="button"
              >
                <p className="font-medium">{c.clientName}</p>
                <p className="opacity-80">{new Date(c.createdAt).toLocaleDateString()}</p>
              </button>
            ))}
          </div>
        </aside>

        <div className="space-y-3">
          {selected ? (
            <article className="rounded border border-zinc-800 bg-zinc-900 p-3">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                  {selected.clientName} - {selected.serviceType}
                </h3>
                <span className={`rounded px-2 py-0.5 text-xs ${statusClass(selected.status)}`}>{selected.status}</span>
              </div>
              <div className="max-h-64 overflow-auto rounded border border-zinc-800 bg-zinc-950 p-3 text-xs whitespace-pre-wrap text-zinc-300">{selected.contractText}</div>
              <div className="mt-3 flex gap-2">
                <button
                  className="rounded bg-yellow-700 px-3 py-1 text-xs hover:bg-yellow-600 disabled:opacity-60"
                  disabled={selected.status !== "draft"}
                  onClick={() => void sendToSign(selected.id)}
                  type="button"
                >
                  Enviar a firma
                </button>
              </div>
            </article>
          ) : (
            <div className="rounded border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-400">Selecciona un contrato para ver vista previa.</div>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {contracts.map((c) => (
          <span className={`rounded px-2 py-1 text-xs ${statusClass(c.status)}`} key={`badge-${c.id}`}>
            {c.clientName}: {c.status}
          </span>
        ))}
      </div>

      {status ? <p className="mt-3 text-sm text-zinc-300">{status}</p> : null}
    </section>
  );
}
