"use client";

import { useCallback, useState } from "react";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { apolloApi, type ApolloLead } from "@/features/apollo/api";

const CLIENT_ID = "ws-client-1";

export default function SaasLeadsPage() {
  const [sector, setSector] = useState("saas");
  const [title, setTitle] = useState("CMO");
  const [city, setCity] = useState("Madrid");
  const [companySize, setCompanySize] = useState("");
  const [leads, setLeads] = useState<ApolloLead[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const search = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    try {
      const res = await apolloApi.search({
        sector,
        title: title || undefined,
        city: city || undefined,
        company_size: companySize || undefined,
      });
      setLeads(res.items ?? []);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Error en búsqueda");
    } finally {
      setBusy(false);
    }
  }, [sector, title, city, companySize]);

  const syncSelected = async () => {
    const batch = leads.filter((l) => selected.has(l.apollo_id || l.name));
    if (!batch.length) return;
    setBusy(true);
    try {
      const res = await apolloApi.syncCrm(batch);
      setMessage(`${res.synced} contactos añadidos al CRM`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Error al sincronizar");
    } finally {
      setBusy(false);
    }
  };

  const syncAll = async () => {
    setBusy(true);
    try {
      const res = await apolloApi.syncCrm(leads);
      setMessage(`${res.synced} leads importados`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  };

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Apollo Leads</h1>
        <p className="text-sm text-slate-500">Búsqueda, scoring IA y sincronización con CRM (F62)</p>
      </div>

      <div className="mb-6 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-4">
        <label className="text-sm">
          Sector
          <input className="mt-1 w-full rounded-lg border px-2 py-1.5" value={sector} onChange={(e) => setSector(e.target.value)} />
        </label>
        <label className="text-sm">
          Cargo
          <input className="mt-1 w-full rounded-lg border px-2 py-1.5" value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="text-sm">
          Ciudad
          <input className="mt-1 w-full rounded-lg border px-2 py-1.5" value={city} onChange={(e) => setCity(e.target.value)} />
        </label>
        <label className="text-sm">
          Tamaño empresa
          <input
            className="mt-1 w-full rounded-lg border px-2 py-1.5"
            value={companySize}
            onChange={(e) => setCompanySize(e.target.value)}
            placeholder="51-200"
          />
        </label>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          className="rounded-lg bg-[#0066FF] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          disabled={busy}
          onClick={() => void search()}
          type="button"
        >
          Buscar leads
        </button>
        <button
          className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50"
          disabled={busy || !leads.length}
          onClick={syncAll}
          type="button"
        >
          Añadir todos al CRM
        </button>
        <button
          className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50"
          disabled={busy || selected.size === 0}
          onClick={syncSelected}
          type="button"
        >
          Añadir selección ({selected.size})
        </button>
      </div>
      {message ? <p className="mb-4 text-sm text-green-700">{message}</p> : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-3 py-2" />
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Cargo</th>
              <th className="px-3 py-2">Empresa</th>
              <th className="px-3 py-2">Score IA</th>
              <th className="px-3 py-2">Email</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-slate-400" colSpan={6}>
                  Sin resultados — lanza una búsqueda
                </td>
              </tr>
            ) : (
              leads.map((lead) => {
                const key = lead.apollo_id || lead.name;
                return (
                  <tr className="border-t" key={key}>
                    <td className="px-3 py-2">
                      <input checked={selected.has(key)} onChange={() => toggle(key)} type="checkbox" />
                    </td>
                    <td className="px-3 py-2 font-medium">{lead.name}</td>
                    <td className="px-3 py-2">{lead.title}</td>
                    <td className="px-3 py-2">{lead.company}</td>
                    <td className="px-3 py-2">
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[#0066FF]">{lead.ai_score ?? "—"}</span>
                    </td>
                    <td className="px-3 py-2 text-slate-500">{lead.email ?? "—"}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </DashboardLayout>
  );
};
