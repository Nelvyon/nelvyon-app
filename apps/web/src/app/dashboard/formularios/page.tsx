"use client";

import { ClipboardList, Plus, Rocket, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { DashboardListShell, DashboardPageTransition, SkeletonList, SkeletonTable, EliteModal } from "@/features/dashboard/components/DashboardTabs";

import { Button } from "@/core/ui/button";
import { cn } from "@/core/ui/utils";
import { toastSuccess } from "@/core/ui/toastFeedback";
import { dashboardFormsApi } from "@/features/dashboard/api";

type Tab = "builder" | "responses" | "stats";
type Field = { id: string; type: string; label: string; placeholder: string; required: boolean; options: string[] };
type Row = Record<string, unknown>;

const FIELD_TYPES = ["text", "email", "phone", "select", "radio", "checkbox", "rating", "date"];

function str(v: unknown, fb = "—"): string {
  if (v == null || v === "") return fb;
  return String(v);
}

function newField(type: string): Field {
  return {
    id: `f_${Date.now()}`,
    type,
    label: `Campo ${type}`,
    placeholder: "",
    required: false,
    options: [],
  };
}

export default function FormulariosPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Row | null>(null);
  const [tab, setTab] = useState<Tab>("builder");
  const [modal, setModal] = useState(false);
  const [title, setTitle] = useState("");
  const [fields, setFields] = useState<Field[]>([]);
  const [settings, setSettings] = useState({
    success_message: "¡Gracias!",
    redirect_url: "",
    notify_email: "",
    save_to_crm: false,
  });
  const [responses, setResponses] = useState<Row[]>([]);
  const [formStats, setFormStats] = useState<Record<string, unknown>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
    const res = await dashboardFormsApi.list();
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

  async function createForm() {
    const created = await dashboardFormsApi.create({ title, fields, settings });
    setModal(false);
    setTitle("");
    setFields([]);
    setSelected(created);
    toastSuccess("Formulario creado");
    load();
  }

  async function saveForm() {
    if (!selected?.id) return;
    await dashboardFormsApi.update(str(selected.id), { fields, settings, title: str(selected.title) });
    toastSuccess("Guardado");
    load();
  }

  async function publishForm() {
    if (!selected?.id) return;
    const res = await dashboardFormsApi.publish(str(selected.id));
    toastSuccess(`Publicado: ${str(res.public_url)}`);
    load();
  }

  async function loadDetail(id: string) {
    const f = await dashboardFormsApi.get(id);
    setSelected(f);
    setFields((f.fields as Field[]) ?? []);
    setSettings({ ...settings, ...(f.settings as typeof settings) });
    const [r, s] = await Promise.all([dashboardFormsApi.responses(id), dashboardFormsApi.stats(id)]);
    setResponses(r.items ?? []);
    setFormStats(s);
  }

  async function removeForm(id: string) {
    if (!confirm("¿Eliminar formulario?")) return;
    await dashboardFormsApi.delete(id);
    if (selected?.id === id) setSelected(null);
    load();
  }

  const embedSlug = str(selected?.slug);

  return (
    <ProtectedLayout module="os">
      <DashboardPageTransition>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <ClipboardList className="h-7 w-7 text-primary" aria-hidden />
              Formularios y encuestas
            </h1>
            <p className="text-sm text-muted-foreground">Constructor visual, embed y respuestas</p>
          </div>
          <Button onClick={() => setModal(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nuevo formulario
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <DashboardListShell
          empty={!loading && items.length === 0}
          emptyDescription="Crea tu primer formulario o encuesta."
          emptyTitle="Sin formularios"
          emptyActionLabel="Nuevo formulario"
          onEmptyAction={() => setModal(true)}
          loading={loading}
          skeleton={<SkeletonList />}
        >
        <div className="space-y-2 rounded-lg border p-3 lg:col-span-1">
            {items.map((f) => (
              <button
                key={str(f.id)}
                type="button"
                className={cn(
                  "w-full rounded border p-3 text-left text-sm hover:bg-muted/50",
                  selected?.id === f.id && "border-primary bg-primary/5",
                )}
                onClick={() => loadDetail(str(f.id))}
              >
                <p className="font-medium">{str(f.title)}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {str(f.status)} · {str(f.submissions_count, "0")} envíos · {str(f.conversion_rate, "0")}%
                </p>
              </button>
            ))}
          </div>
        </DashboardListShell>

          {selected ? (
            <div className="space-y-4 lg:col-span-2">
              <div className="flex flex-wrap gap-2 border-b pb-2">
                {(["builder", "responses", "stats"] as Tab[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    className={cn(
                      "rounded px-3 py-1 text-sm capitalize",
                      tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground",
                    )}
                    onClick={() => setTab(t)}
                  >
                    {t === "builder" ? "Constructor" : t === "responses" ? "Respuestas" : "Stats"}
                  </button>
                ))}
                <Button size="sm" className="ml-auto" onClick={publishForm}>
                  <Rocket className="mr-1 h-3 w-3" /> Publicar
                </Button>
                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => removeForm(str(selected.id))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {tab === "builder" && (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {FIELD_TYPES.map((t) => (
                      <Button key={t} size="sm" variant="outline" onClick={() => setFields([...fields, newField(t)])}>
                        + {t}
                      </Button>
                    ))}
                  </div>
                  {fields.map((field, i) => (
                    <div key={field.id} className="rounded border p-3 space-y-2">
                      <input className="w-full rounded border px-2 py-1 text-sm" value={field.label} onChange={(e) => { const n = [...fields]; n[i] = { ...field, label: e.target.value }; setFields(n); }} />
                      <input className="w-full rounded border px-2 py-1 text-sm" placeholder="Placeholder" value={field.placeholder} onChange={(e) => { const n = [...fields]; n[i] = { ...field, placeholder: e.target.value }; setFields(n); }} />
                      <label className="flex items-center gap-2 text-xs">
                        <input type="checkbox" checked={field.required} onChange={(e) => { const n = [...fields]; n[i] = { ...field, required: e.target.checked }; setFields(n); }} />
                        Obligatorio
                      </label>
                    </div>
                  ))}
                  <div className="rounded border p-3 space-y-2 text-sm">
                    <p className="font-medium">Configuración</p>
                    <input className="w-full rounded border px-2 py-1" placeholder="Mensaje éxito" value={settings.success_message} onChange={(e) => setSettings({ ...settings, success_message: e.target.value })} />
                    <input className="w-full rounded border px-2 py-1" placeholder="Redirect URL" value={settings.redirect_url} onChange={(e) => setSettings({ ...settings, redirect_url: e.target.value })} />
                    <input className="w-full rounded border px-2 py-1" placeholder="Email notificación" value={settings.notify_email} onChange={(e) => setSettings({ ...settings, notify_email: e.target.value })} />
                    <label className="flex items-center gap-2">
                      <input type="checkbox" checked={settings.save_to_crm} onChange={(e) => setSettings({ ...settings, save_to_crm: e.target.checked })} />
                      Guardar en CRM
                    </label>
                  </div>
                  <Button onClick={saveForm}>Guardar formulario</Button>
                  {embedSlug ? (
                    <pre className="rounded bg-muted p-2 text-xs">{`<iframe src="/form/${embedSlug}" width="100%" height="600"></iframe>`}</pre>
                  ) : null}
                </div>
              )}

              {tab === "responses" && (
                <div className="overflow-x-auto rounded border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-3 py-2 text-left">Fecha</th>
                        <th className="px-3 py-2 text-left">Respuestas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {responses.map((r) => (
                        <tr key={str(r.id)} className="border-t">
                          <td className="px-3 py-2">{str(r.submitted_at).slice(0, 16)}</td>
                          <td className="px-3 py-2 text-xs">{JSON.stringify(r.responses)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {tab === "stats" && (
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded border p-4"><p className="text-xs text-muted-foreground">Vistas</p><p className="text-xl font-bold">{str(formStats.views, "0")}</p></div>
                  <div className="rounded border p-4"><p className="text-xs text-muted-foreground">Envíos</p><p className="text-xl font-bold">{str(formStats.submissions, "0")}</p></div>
                  <div className="rounded border p-4"><p className="text-xs text-muted-foreground">Conversión</p><p className="text-xl font-bold">{str(formStats.conversion_rate, "0")}%</p></div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground lg:col-span-2">Selecciona o crea un formulario.</p>
          )}
        </div>
      </DashboardPageTransition>

      <EliteModal open={modal} onClose={() => setModal(false)} title="Nuevo formulario">
        <div className="space-y-3">
          <input className="w-full rounded border px-3 py-2 text-sm" placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Button onClick={createForm} disabled={!title.trim()}>Crear</Button>
        </div>
      </EliteModal>
    </ProtectedLayout>
  );
}
