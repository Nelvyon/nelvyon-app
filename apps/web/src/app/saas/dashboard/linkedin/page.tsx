"use client";

import { useCallback, useEffect, useState } from "react";

import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { linkedinApi } from "@/features/linkedin-outreach/api";

const CLIENT_ID = "ws-client-1";

export default function SaasLinkedInPage() {
  const [prospects, setProspects] = useState<Array<Record<string, unknown>>>([]);
  const [stats, setStats] = useState<Record<string, unknown>>({});
  const [inbox, setInbox] = useState<Array<Record<string, unknown>>>([]);
  const [preview, setPreview] = useState<Record<string, unknown> | null>(null);
  const [name, setName] = useState("Ana López");
  const [company, setCompany] = useState("TechScale SL");
  const [sector, setSector] = useState("saas");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [p, s, i] = await Promise.all([
      linkedinApi.prospects(CLIENT_ID),
      linkedinApi.stats(CLIENT_ID),
      linkedinApi.inbox(CLIENT_ID),
    ]);
    setProspects(p.prospects ?? []);
    setStats(s);
    setInbox(i.items ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runPreview = async () => {
    setBusy(true);
    try {
      const res = await linkedinApi.connect({
        client_id: CLIENT_ID,
        prospect_name: name,
        company,
        sector,
        preview_only: true,
      });
      setPreview((res.preview as Record<string, unknown>) ?? res);
    } finally {
      setBusy(false);
    }
  };

  const startSequence = async () => {
    setBusy(true);
    try {
      await linkedinApi.startSequence("prospect-1", {
        client_id: CLIENT_ID,
        prospect_name: name,
        company,
        sector,
      });
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">LinkedIn Outreach</h1>
        <p className="text-sm text-slate-500">Secuencias IA con preview y métricas (F62)</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
          <label className="block text-sm">
            Prospecto
            <input className="mt-1 w-full rounded-lg border px-2 py-1.5" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="block text-sm">
            Empresa
            <input className="mt-1 w-full rounded-lg border px-2 py-1.5" value={company} onChange={(e) => setCompany(e.target.value)} />
          </label>
          <div className="flex gap-2">
            <button className="rounded-lg border px-3 py-2 text-sm" disabled={busy} onClick={runPreview} type="button">
              Preview mensaje
            </button>
            <button
              className="rounded-lg bg-[#0066FF] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              disabled={busy}
              onClick={startSequence}
              type="button"
            >
              Iniciar secuencia IA
            </button>
          </div>
          {preview ? (
            <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              <p className="font-medium">Conexión</p>
              <p className="mt-1">{String(preview.connection_request ?? "")}</p>
              <p className="mt-3 font-medium">Follow-up 1</p>
              <p className="mt-1">{String(preview.follow_up_1 ?? "")}</p>
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ["Aceptación", `${stats.acceptance_rate_percent ?? 0}%`],
                ["Respuesta", `${stats.response_rate_percent ?? 0}%`],
                ["Reuniones", stats.meetings_booked ?? 0],
              ] as [string, string | number][]
            ).map(([l, v]) => (
              <div className="rounded-xl border bg-white p-3 shadow-sm" key={String(l)}>
                <p className="text-xs text-slate-500">{l}</p>
                <p className="text-lg font-semibold">{String(v)}</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold">Prospectos</h3>
            <ul className="mt-2 max-h-40 overflow-y-auto text-sm">
              {prospects.map((p) => (
                <li className="border-b py-1" key={String(p.id)}>
                  {String(p.prospect_name)} — <span className="text-slate-500">{String(p.status)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border bg-white p-4 shadow-sm">
            <h3 className="text-sm font-semibold">Inbox</h3>
            <ul className="mt-2 text-sm text-slate-600">
              {inbox.map((m) => (
                <li className="border-b py-2" key={String(m.id)}>
                  <strong>{String(m.from_name)}:</strong> {String(m.message)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};
