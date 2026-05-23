"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { DashboardListShell, DashboardPageTransition, SkeletonList, SkeletonTable } from "@/features/dashboard/components/DashboardTabs";

import { Button } from "@/core/ui/button";
import { landingApi } from "@/features/builders/api";
import { BlockRenderer } from "@/features/builders/components/BlockRenderer";
import type { LandingBlock, LandingPage } from "@/features/builders/types";

const BLOCK_TYPES = ["hero", "text", "cta", "form", "testimonials", "pricing", "faq", "social_proof"] as const;

export default function LandingEditorPage() {
  const [loading, setLoading] = useState(true);
  const params = useParams<{ page_id: string }>();
  const id = params?.page_id ?? "";
  const [page, setPage] = useState<LandingPage | null>(null);
  const [blocks, setBlocks] = useState<LandingBlock[]>([]);
  const [selected, setSelected] = useState(0);
  const [analytics, setAnalytics] = useState<Record<string, unknown> | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);

  useEffect(() => {
    if (!id) return;
    landingApi.get(id).then((p) => {
      setPage(p);
      setBlocks(p.blocks ?? []);
    });
  }, [id]);

  async function save() {
    await landingApi.update(id, { blocks });
    landingApi.get(id).then(setPage);
  }

  async function publish() {
    await landingApi.publish(id);
    landingApi.get(id).then(setPage);
  }

  function addBlock(type: string) {
    setBlocks([
      ...blocks,
      {
        id: `blk_${Date.now()}`,
        type: type as LandingBlock["type"],
        props: { headline: "Nuevo bloque", content: "Edita en el panel derecho" },
        responsive: { hideOnMobile: false, orderMobile: blocks.length },
      },
    ]);
  }

  function updateProp(key: string, value: string) {
    const next = [...blocks];
    next[selected] = { ...next[selected], props: { ...next[selected].props, [key]: value } };
    setBlocks(next);
  }

  function moveBlock(dir: -1 | 1) {
    const idx = selected + dir;
    if (idx < 0 || idx >= blocks.length) return;
    const next = [...blocks];
    [next[selected], next[idx]] = [next[idx], next[selected]];
    setBlocks(next);
    setSelected(idx);
  }

  const sel = blocks[selected];

  return (
    <ProtectedLayout module="os">
      <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Link className="text-sm text-muted-foreground" href="/dashboard/landing-pages">← Landing Pages</Link>
          <h1 className="text-xl font-bold">{page?.name}</h1>
          <div className="ml-auto flex gap-2">
            <Button onClick={() => { landingApi.variant(id, "Variante B").then(() => landingApi.get(id).then(setPage)); }} variant="outline">
              A/B Test
            </Button>
            <Button onClick={async () => { setShowAnalytics(true); setAnalytics(await landingApi.analytics(id)); }} variant="outline">
              Analytics
            </Button>
            <Button onClick={save} variant="outline">Guardar</Button>
            <Button onClick={publish}>Publicar</Button>
          </div>
        </div>

        {showAnalytics && analytics ? (
          <div className="rounded-lg border bg-muted/30 p-4 text-sm">
            Visitas: {analytics.visits as number} · Conversiones: {analytics.conversions as number} · Tasa: {analytics.conversion_rate as number}%
            <Button className="ml-4" onClick={() => setShowAnalytics(false)} size="sm" variant="ghost">Cerrar</Button>
          </div>
        ) : null}

        <div className="grid min-h-0 flex-1 grid-cols-12 gap-4">
          <aside className="col-span-3 overflow-y-auto rounded-lg border p-3">
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Bloques</p>
            {blocks.map((b, i) => (
              <button
                className={`mb-1 w-full rounded px-2 py-1.5 text-left text-sm ${i === selected ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                key={b.id}
                onClick={() => setSelected(i)}
                type="button"
              >
                {b.type}
              </button>
            ))}
            <div className="mt-4 flex gap-1">
              <Button onClick={() => moveBlock(-1)} size="sm" variant="outline">↑</Button>
              <Button onClick={() => moveBlock(1)} size="sm" variant="outline">↓</Button>
            </div>
            <p className="mb-2 mt-4 text-xs font-semibold uppercase text-muted-foreground">Añadir</p>
            <motion.div className="flex flex-wrap gap-1">
              {BLOCK_TYPES.map((t) => (
                <Button key={t} onClick={() => addBlock(t)} size="sm" variant="outline">{t}</Button>
              ))}
            </motion.div>
          </aside>

          <main className="col-span-6 overflow-y-auto rounded-lg border bg-background p-4">
            <BlockRenderer blocks={blocks} />
          </main>

          <aside className="col-span-3 overflow-y-auto rounded-lg border p-3">
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Propiedades</p>
            {sel ? (
              <div className="space-y-2">
                {Object.entries(sel.props).slice(0, 8).map(([k, v]) => (
                  <label className="block text-xs" key={k}>
                    {k}
                    <input
                      className="mt-1 w-full rounded border px-2 py-1 text-sm"
                      onChange={(e) => updateProp(k, e.target.value)}
                      value={typeof v === "string" ? v : JSON.stringify(v)}
                    />
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Selecciona un bloque</p>
            )}
          </aside>
        </div>
      </div>
    </ProtectedLayout>
  );
}
