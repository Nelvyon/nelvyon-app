"use client";

import { ExternalLink, Globe, Plus } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { DashboardListShell, DashboardPageTransition, SkeletonList, SkeletonTable, EliteModal } from "@/features/dashboard/components/DashboardTabs";

import { Button } from "@/core/ui/button";
import { osWebApi } from "@/features/builders/api";
import { StatusBadge } from "@/features/builders/components/DashboardUi";
import type { WebProject } from "@/features/builders/types";

export default function WebsitesDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<WebProject[]>([]);
  const [modal, setModal] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [form, setForm] = useState({
    business_name: "",
    sector: "",
    description: "",
    language: "es",
    primary_goal: "leads",
    pages: ["home", "about", "services", "contact"],
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
    const res = await osWebApi.list();
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

  useEffect(() => {
    if (!generating) return;
    const t = setInterval(async () => {
      const p = await osWebApi.get(generating);
      if (p.status === "ready" || p.status === "error") {
        setGenerating(null);
        load();
      }
    }, 3000);
    return () => clearInterval(t);
  }, [generating, load]);

  async function createAndGenerate() {
    const project = await osWebApi.create(form);
    await osWebApi.generate(project.id);
    setGenerating(project.id);
    setModal(false);
    load();
  }

  return (
    <ProtectedLayout module="os">
      <DashboardPageTransition>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Webs</h1>
            <p className="text-sm text-muted-foreground">Sitios multipágina generados con NELVYON OS</p>
          </div>
          <Button onClick={() => setModal(true)}>
            <Plus className="mr-2 h-4 w-4" /> Crear nueva web
          </Button>
        </div>

        {generating ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900">
            Generando tu web con IA… (actualizando cada 3s)
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-blue-200">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-blue-600" />
            </div>
          </div>
        ) : null}

        <DashboardListShell
          empty={!loading && items.length === 0}
          emptyActionLabel="Crear nueva web"
          emptyDescription="Crea tu primera web multipágina generada con IA."
          emptyTitle="Aún no tienes webs"
          loading={loading}
          onEmptyAction={() => setModal(true)}
          skeleton={<SkeletonList />}
        >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((p) => (
            <article className="rounded-xl border bg-card p-5 shadow-card" key={p.id}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold">{p.name}</h2>
                </div>
                <StatusBadge status={p.status} />
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{p.subdomain}</p>
              {p.site_url ? (
                <a className="mt-1 flex items-center gap-1 text-xs text-link" href={p.site_url} rel="noreferrer" target="_blank">
                  {p.site_url} <ExternalLink className="h-3 w-3" />
                </a>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link href={`/dashboard/websites/${p.id}`}>Editar</Link>
                </Button>
                {p.status === "ready" ? (
                  <Button onClick={() => osWebApi.publish(p.id).then(load)} size="sm">
                    Publicar
                  </Button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
        </DashboardListShell>
      </DashboardPageTransition>

      <EliteModal onClose={() => setModal(false)} open={modal} title="Nueva web" wide>
        <div className="grid gap-3">
          <input className="rounded-lg border px-3 py-2" onChange={(e) => setForm({ ...form, business_name: e.target.value })} placeholder="Nombre del negocio" />
          <input className="rounded-lg border px-3 py-2" onChange={(e) => setForm({ ...form, sector: e.target.value })} placeholder="Sector" />
          <textarea className="rounded-lg border px-3 py-2" onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descripción" rows={3} />
          <select className="rounded-lg border px-3 py-2" onChange={(e) => setForm({ ...form, primary_goal: e.target.value })} value={form.primary_goal}>
            <option value="leads">Leads</option>
            <option value="ventas">Ventas</option>
            <option value="branding">Branding</option>
            <option value="info">Info</option>
          </select>
          <Button onClick={createAndGenerate}>Crear y generar con IA</Button>
        </div>
      </EliteModal>
    </ProtectedLayout>
  );
}
