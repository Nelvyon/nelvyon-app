"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { DashboardListShell, DashboardPageTransition, SkeletonList, SkeletonTable, EliteModal } from "@/features/dashboard/components/DashboardTabs";

import { Button } from "@/core/ui/button";
import { landingApi } from "@/features/builders/api";
import { StatusBadge } from "@/features/builders/components/DashboardUi";
import type { LandingPage } from "@/features/builders/types";

export default function LandingPagesDashboard() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<LandingPage[]>([]);
  const [modal, setModal] = useState(false);
  const [templates, setTemplates] = useState<{ id: string; name: string; thumbnail_url?: string }[]>([]);
  const [name, setName] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
    const res = await landingApi.list();
    setItems(res.items ?? []);
    } catch {
      /* preserved */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().catch(() => setItems([]));
    landingApi.templates().then((r) => setTemplates(r.templates ?? [])).catch(() => setTemplates([]));
  }, [load]);

  async function createBlank() {
    await landingApi.create({ name: name || "Nueva landing", blocks: [], post_type: "text" });
    setModal(false);
    load();
  }

  async function createFromTemplate(tid: string) {
    await landingApi.fromTemplate(tid, name || undefined);
    setModal(false);
    load();
  }

  return (
    <ProtectedLayout module="os">
      <DashboardPageTransition>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Landing Pages</h1>
            <p className="text-sm text-muted-foreground">Constructor visual con A/B testing</p>
          </div>
          <Button onClick={() => setModal(true)}>Nueva landing</Button>
        </div>

        <DashboardListShell
          empty={!loading && items.length === 0}
          emptyActionLabel="Nueva landing"
          emptyDescription="Crea landings con el editor visual o desde plantilla."
          emptyTitle="Sin landing pages"
          loading={loading}
          onEmptyAction={() => setModal(true)}
          skeleton={<SkeletonList />}
        >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((p) => (
            <article className="rounded-xl border p-4" key={p.id}>
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">{p.name}</h2>
                <StatusBadge status={p.status} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{p.slug ? `/p/${p.slug}` : "Sin slug"}</p>
              <Button asChild className="mt-4" size="sm" variant="outline">
                <Link href={`/dashboard/landing-pages/${p.id}/editor`}>Editor</Link>
              </Button>
            </article>
          ))}
        </div>
        </DashboardListShell>
      </DashboardPageTransition>

      <EliteModal onClose={() => setModal(false)} open={modal} title="Nueva landing" wide>
        <input className="mb-4 w-full rounded-lg border px-3 py-2" onChange={(e) => setName(e.target.value)} placeholder="Nombre" />
        <Button className="mb-6 w-full" onClick={createBlank} variant="outline">
          En blanco
        </Button>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {templates.map((t) => (
            <button className="rounded-lg border p-3 text-left hover:bg-muted" key={t.id} onClick={() => createFromTemplate(t.id)} type="button">
              <div className="mb-2 aspect-video rounded bg-muted" />
              <p className="text-sm font-medium">{t.name}</p>
            </button>
          ))}
        </div>
      </EliteModal>
    </ProtectedLayout>
  );
}
