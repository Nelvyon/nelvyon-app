"use client";

import { useCallback, useEffect, useState } from "react";
import {
  NelvyonDsBadge,
  NelvyonDsButton,
  NelvyonDsCard,
  NelvyonDsSectionHeader,
} from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";
import { KpiTile } from "@/features/saas-shell/components/SaasDashboardWidgets";

type Project = { id: string; name: string; status: string; createdAt: string; tasks: unknown[] };
type Timesheet = {
  id: string;
  projectId: string;
  hours: number;
  date: string;
  status: string;
  rateInternalCents: number;
};

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none";

export default function ErpProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
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
      setOk(mode === "project" ? "Proyecto creado" : "Timesheet añadido");
      window.setTimeout(() => setOk(null), 3000);
      await load();
    } finally {
      setSaving(false);
    }
  }

  const totalHours = timesheets.reduce((s, t) => s + t.hours, 0);

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="erp-projects" />}>
      <div className="flex flex-col gap-6 pb-8">
        <NelvyonDsSectionHeader
          title="Proyectos & field service"
          subtitle={note || "Persistido vía API · firma bloqueada · margen NON-GL"}
        />

        {error && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        {ok && (
          <p className="rounded-lg border border-primary/30 bg-primary/10 px-4 py-2 text-sm text-primary" role="status">
            {ok}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <KpiTile icon="📁" label="Proyectos" value={projects.length} />
          <KpiTile icon="⏱️" label="Timesheets" value={timesheets.length} accent />
          <KpiTile icon="⌛" label="Horas" value={totalHours} />
        </div>

        <div className="flex gap-2" role="tablist" aria-label="Modo alta">
          <button
            type="button"
            role="tab"
            aria-selected={mode === "project"}
            onClick={() => setMode("project")}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
              mode === "project"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground"
            }`}
          >
            Nuevo proyecto
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "timesheet"}
            onClick={() => setMode("timesheet")}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
              mode === "timesheet"
                ? "border-primary bg-primary/10 text-primary"
                : "border-border text-muted-foreground"
            }`}
          >
            Timesheet
          </button>
        </div>

        <NelvyonDsCard className="p-4">
          <form onSubmit={(e) => void onSubmit(e)} className="grid gap-3 sm:grid-cols-3">
            {mode === "project" ? (
              <input
                className={`${inputCls} sm:col-span-2`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre proyecto *"
                required
              />
            ) : (
              <>
                <select className={inputCls} value={projectId} onChange={(e) => setProjectId(e.target.value)} required>
                  <option value="">Proyecto…</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <input
                  className={inputCls}
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  type="number"
                  min={0.25}
                  step={0.25}
                  placeholder="Horas"
                  required
                />
              </>
            )}
            <NelvyonDsButton type="submit" disabled={saving} variant="primary">
              {saving ? "Guardando…" : mode === "project" ? "Crear proyecto" : "Añadir timesheet"}
            </NelvyonDsButton>
          </form>
        </NelvyonDsCard>

        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Proyectos</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground" role="status">Cargando…</p>
          ) : projects.length === 0 ? (
            <NelvyonDsCard className="p-8 text-center text-sm text-muted-foreground">Sin proyectos.</NelvyonDsCard>
          ) : (
            <div className="flex flex-col gap-2">
              {projects.map((p) => (
                <NelvyonDsCard key={p.id} className="flex justify-between gap-3 p-4">
                  <span className="text-sm text-foreground">{p.name}</span>
                  <NelvyonDsBadge tone="neutral">{p.status}</NelvyonDsBadge>
                </NelvyonDsCard>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Timesheets</h2>
          {timesheets.length === 0 ? (
            <NelvyonDsCard className="p-8 text-center text-sm text-muted-foreground">Sin timesheets.</NelvyonDsCard>
          ) : (
            <div className="flex flex-col gap-2">
              {timesheets.map((t) => (
                <NelvyonDsCard key={t.id} className="flex justify-between gap-3 p-4">
                  <span className="text-sm text-foreground">
                    {t.hours}h · {t.date}
                  </span>
                  <NelvyonDsBadge tone="primary">{t.status}</NelvyonDsBadge>
                </NelvyonDsCard>
              ))}
            </div>
          )}
        </section>
      </div>
    </SaasShellLayout>
  );
}
