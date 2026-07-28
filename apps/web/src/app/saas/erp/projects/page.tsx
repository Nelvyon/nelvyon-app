"use client";

import { useCallback, useEffect, useState } from "react";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

type Project = { id: string; name: string; status: string; createdAt: string; tasks: unknown[] };
type Timesheet = {
  id: string;
  projectId: string;
  hours: number;
  date: string;
  status: string;
  rateInternalCents: number;
};

export default function ErpProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [hours, setHours] = useState("1");
  const [projectId, setProjectId] = useState("");
  const [mode, setMode] = useState<"project" | "timesheet">("project");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/erp/projects-fs");
      const data = (await res.json()) as {
        projects?: Project[];
        timesheets?: Timesheet[];
        note?: string;
        error?: string;
      };
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setProjects(data.projects ?? []);
      setTimesheets(data.timesheets ?? []);
      setNote(data.note ?? "");
      setProjectId((prev) => prev || data.projects?.[0]?.id || "");
    } catch (e) {
      setError(e instanceof Error ? e.message : "load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body =
        mode === "project"
          ? { action: "create_project", name }
          : {
              action: "create_timesheet",
              projectId,
              hours: Number(hours),
              date: new Date().toISOString().slice(0, 10),
              rateInternalCents: 0,
            };
      const res = await fetch("/api/saas/erp/projects-fs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? `HTTP ${res.status}`);
        return;
      }
      setName("");
      await load();
    } finally {
      setSaving(false);
    }
  }

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="erp-projects" />}>
      <div className="mx-auto max-w-5xl space-y-6 p-6">
        <header>
          <h1 className="text-2xl font-semibold text-white">Proyectos & field service</h1>
          <p className="mt-1 text-sm text-[#94a3b8]">
            Persistido vía API (Postgres con DATABASE_URL) · firma bloqueada · margen NON-GL · {note || "ops only"}
          </p>
        </header>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("project")}
            className={`rounded-lg px-3 py-1.5 text-xs ${mode === "project" ? "bg-[#0084ff] text-white" : "bg-white/5 text-[#94a3b8]"}`}
          >
            Nuevo proyecto
          </button>
          <button
            type="button"
            onClick={() => setMode("timesheet")}
            className={`rounded-lg px-3 py-1.5 text-xs ${mode === "timesheet" ? "bg-[#0084ff] text-white" : "bg-white/5 text-[#94a3b8]"}`}
          >
            Timesheet
          </button>
        </div>

        <form
          onSubmit={onSubmit}
          className="grid gap-3 rounded-xl border border-white/10 bg-white/5 p-4 sm:grid-cols-3"
        >
          {mode === "project" ? (
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nombre proyecto *"
              className="rounded-lg border border-white/10 bg-[#020817] px-3 py-2 text-sm text-white sm:col-span-2"
              required
            />
          ) : (
            <>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="rounded-lg border border-white/10 bg-[#020817] px-3 py-2 text-sm text-white"
                required
              >
                <option value="">Proyecto…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <input
                value={hours}
                onChange={(e) => setHours(e.target.value)}
                type="number"
                min={0.25}
                step="0.25"
                placeholder="Horas"
                className="rounded-lg border border-white/10 bg-[#020817] px-3 py-2 text-sm text-white"
                required
              />
            </>
          )}
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[#0084ff] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {saving ? "Guardando…" : mode === "project" ? "Crear proyecto" : "Añadir timesheet"}
          </button>
        </form>

        <section className="space-y-2">
          <h2 className="text-sm font-medium text-[#94a3b8]">Proyectos</h2>
          {loading ? (
            <p className="text-sm text-[#64748b]">Cargando…</p>
          ) : projects.length === 0 ? (
            <p className="text-sm text-[#64748b]">Sin proyectos.</p>
          ) : (
            <ul className="divide-y divide-white/5 rounded-xl border border-white/10">
              {projects.map((p) => (
                <li key={p.id} className="flex justify-between px-4 py-3 text-sm text-white">
                  <span>{p.name}</span>
                  <span className="text-[#94a3b8]">{p.status}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-medium text-[#94a3b8]">Timesheets</h2>
          {timesheets.length === 0 ? (
            <p className="text-sm text-[#64748b]">Sin timesheets.</p>
          ) : (
            <ul className="divide-y divide-white/5 rounded-xl border border-white/10">
              {timesheets.map((t) => (
                <li key={t.id} className="flex justify-between px-4 py-3 text-sm text-white">
                  <span>
                    {t.hours}h · {t.date}
                  </span>
                  <span className="text-[#94a3b8]">{t.status}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </SaasShellLayout>
  );
}
