"use client";

import { useCallback, useEffect, useState } from "react";

const accent = "#06b6d4";

type CrmContact = {
  id: string;
  userId: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  industry: string | null;
  stage: string;
  score: number;
  tags: string[] | null;
  notes: string | null;
  metadata: { last_agent_id?: string } | null;
  createdAt: string;
  updatedAt: string;
};

type CrmActivity = {
  id: string;
  contactId: string;
  type: string;
  summary: string | null;
  agentId: string | null;
  createdAt: string;
};

const STAGES = ["lead", "prospect", "proposal", "won", "lost"] as const;

function readLastAgent(c: CrmContact): string {
  const m = c.metadata;
  if (m && typeof m === "object" && "last_agent_id" in m && typeof (m as { last_agent_id?: string }).last_agent_id === "string") {
    return (m as { last_agent_id: string }).last_agent_id;
  }
  return "—";
}

export default function CrmDashboard() {
  const [contacts, setContacts] = useState<CrmContact[]>([]);
  const [selected, setSelected] = useState<CrmContact | null>(null);
  const [activities, setActivities] = useState<CrmActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [actLoading, setActLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formCompany, setFormCompany] = useState("");
  const [formIndustry, setFormIndustry] = useState("");

  const loadContacts = useCallback(async () => {
    const res = await fetch("/api/os/crm/contacts");
    if (!res.ok) throw new Error("load");
    const data = (await res.json()) as { contacts: CrmContact[] };
    setContacts(data.contacts ?? []);
  }, []);

  useEffect(() => {
    loadContacts().catch(() => setStatus("No se pudieron cargar contactos"));
  }, [loadContacts]);

  const loadActivities = useCallback(async (contactId: string) => {
    setActLoading(true);
    try {
      const res = await fetch(`/api/os/crm/contacts/${encodeURIComponent(contactId)}/activities`);
      if (!res.ok) throw new Error("act");
      const data = (await res.json()) as { activities: CrmActivity[] };
      setActivities(data.activities ?? []);
    } catch {
      setActivities([]);
    } finally {
      setActLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selected?.id) void loadActivities(selected.id);
    else setActivities([]);
  }, [selected, loadActivities]);

  async function changeStage(contactId: string, stage: string): Promise<void> {
    try {
      const res = await fetch(`/api/os/crm/contacts/${encodeURIComponent(contactId)}/stage`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      if (!res.ok) throw new Error("stage");
      await loadContacts();
      setSelected((prev) => (prev?.id === contactId ? { ...prev, stage } : prev));
      setStatus("Etapa actualizada");
    } catch {
      setStatus("No se pudo cambiar la etapa");
    }
  }

  async function createContact(): Promise<void> {
    if (!formName.trim()) {
      setStatus("Nombre obligatorio");
      return;
    }
    setLoading(true);
    setStatus("");
    try {
      const res = await fetch("/api/os/crm/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          email: formEmail.trim() || null,
          company: formCompany.trim() || null,
          industry: formIndustry.trim() || null,
        }),
      });
      if (!res.ok) throw new Error("create");
      setModalOpen(false);
      setFormName("");
      setFormEmail("");
      setFormCompany("");
      setFormIndustry("");
      await loadContacts();
      setStatus("Contacto creado");
    } catch {
      setStatus("No se pudo crear el contacto");
    } finally {
      setLoading(false);
    }
  }

  function copyAgentPayload(contactId: string): void {
    const payload = JSON.stringify({ contactId }, null, 2);
    void navigator.clipboard.writeText(payload).then(
      () => setStatus("Payload copiado: pégalo en el input del agente OS"),
      () => setStatus("No se pudo copiar al portapapeles"),
    );
  }

  const byStage = (s: string) => contacts.filter((c) => c.stage === s);

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <section className="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-100">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold" style={{ color: accent }}>
            CRM
          </h2>
          <button
            type="button"
            className="rounded px-3 py-1.5 text-sm font-semibold text-zinc-950"
            style={{ backgroundColor: accent }}
            onClick={() => setModalOpen(true)}
          >
            Nuevo contacto
          </button>
        </div>
        {status ? <p className="mt-2 text-sm text-zinc-400">{status}</p> : null}

        <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
          {STAGES.map((stage) => (
            <div key={stage} className="min-w-[200px] flex-1 rounded-lg border border-zinc-800 bg-zinc-900/50 p-2">
              <h3 className="mb-2 border-b border-zinc-800 pb-1 text-xs font-semibold uppercase tracking-wide text-zinc-400">{stage}</h3>
              <ul className="space-y-2">
                {byStage(stage).map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(c)}
                      className={`w-full rounded-lg border p-2 text-left text-sm transition ${
                        selected?.id === c.id ? "border-cyan-500/60 bg-zinc-800" : "border-zinc-700 bg-zinc-900 hover:border-zinc-600"
                      }`}
                      style={selected?.id === c.id ? { borderColor: `${accent}99` } : undefined}
                    >
                      <div className="font-medium text-zinc-100">{c.name}</div>
                      {c.company ? <div className="text-xs text-zinc-500">{c.company}</div> : null}
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-500">
                        <span>Score {c.score}</span>
                        <span className="truncate">Último agente: {readLastAgent(c)}</span>
                      </div>
                      <select
                        className="mt-2 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs"
                        value={c.stage}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => void changeStage(c.id, e.target.value)}
                      >
                        {STAGES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <aside className="w-full shrink-0 rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-zinc-100 lg:w-[340px]">
        {selected ? (
          <>
            <h3 className="text-base font-semibold" style={{ color: accent }}>
              {selected.name}
            </h3>
            <p className="text-sm text-zinc-500">{selected.company ?? "Sin empresa"}</p>
            <p className="mt-1 text-xs text-zinc-500">Score: {selected.score}</p>
            <button
              type="button"
              className="mt-3 w-full rounded py-2 text-sm font-semibold text-zinc-950"
              style={{ backgroundColor: accent }}
              onClick={() => copyAgentPayload(selected.id)}
            >
              Ejecutar agente
            </button>
            <p className="mt-1 text-xs text-zinc-500">Copia el JSON con contactId y úsalo en el payload del agente.</p>

            <h4 className="mt-6 text-sm font-semibold text-zinc-300">Actividad</h4>
            {actLoading ? <p className="text-sm text-zinc-500">Cargando…</p> : null}
            <ul className="mt-2 max-h-[360px] space-y-2 overflow-y-auto text-sm">
              {activities.map((a) => (
                <li key={a.id} className="rounded border border-zinc-800 bg-zinc-900/40 p-2">
                  <div className="text-xs font-medium uppercase text-zinc-500">{a.type}</div>
                  {a.agentId ? <div className="text-xs text-cyan-500/90">{a.agentId}</div> : null}
                  <div className="mt-1 line-clamp-4 whitespace-pre-wrap text-zinc-300">{a.summary ?? "—"}</div>
                  <div className="mt-1 text-[10px] text-zinc-600">{new Date(a.createdAt).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm text-zinc-500">Selecciona un contacto para ver el historial.</p>
        )}
      </aside>

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" role="dialog" aria-modal>
          <div className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-4 shadow-xl">
            <h3 className="text-lg font-semibold" style={{ color: accent }}>
              Nuevo contacto
            </h3>
            <div className="mt-3 grid gap-2">
              <input
                className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                placeholder="Nombre *"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
              <input
                className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                placeholder="Email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
              />
              <input
                className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                placeholder="Empresa"
                value={formCompany}
                onChange={(e) => setFormCompany(e.target.value)}
              />
              <input
                className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm"
                placeholder="Industria"
                value={formIndustry}
                onChange={(e) => setFormIndustry(e.target.value)}
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" className="rounded px-3 py-2 text-sm text-zinc-400" onClick={() => setModalOpen(false)}>
                Cancelar
              </button>
              <button
                type="button"
                disabled={loading}
                className="rounded px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-50"
                style={{ backgroundColor: accent }}
                onClick={() => void createContact()}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
