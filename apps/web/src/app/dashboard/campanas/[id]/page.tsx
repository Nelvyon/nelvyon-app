"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { BlockRenderer } from "@/features/builders/components/BlockRenderer";
import type { LandingBlock } from "@/features/builders/types";
import { dashboardCampaignsApi, parseCampaignBlocks } from "@/features/dashboard/api";
import { StatusBadge } from "@/features/builders/components/DashboardUi";

const BLOCK_TYPES = ["hero", "text", "cta", "image"] as const;

function str(v: unknown, fallback = ""): string {
  if (v == null) return fallback;
  return String(v);
}

export default function CampanaEditorPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params?.id);
  const [campaign, setCampaign] = useState<Record<string, unknown> | null>(null);
  const [blocks, setBlocks] = useState<LandingBlock[]>([]);
  const [selected, setSelected] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!Number.isFinite(id) || id <= 0) return;
    dashboardCampaignsApi.get(id).then((c) => {
      setCampaign(c);
      setBlocks(parseCampaignBlocks(c.content));
    });
  }, [id]);

  async function save() {
    if (!Number.isFinite(id)) return;
    setSaving(true);
    try {
      await dashboardCampaignsApi.update(id, { content: JSON.stringify(blocks) });
      const c = await dashboardCampaignsApi.get(id);
      setCampaign(c);
    } finally {
      setSaving(false);
    }
  }

  function addBlock(type: string) {
    setBlocks([
      ...blocks,
      {
        id: `blk_${Date.now()}`,
        type: type as LandingBlock["type"],
        props: { headline: "Nuevo bloque", content: "Edita el contenido" },
      },
    ]);
  }

  function updateProp(key: string, value: string) {
    const next = [...blocks];
    if (!next[selected]) return;
    next[selected] = { ...next[selected], props: { ...next[selected].props, [key]: value } };
    setBlocks(next);
  }

  const sel = blocks[selected];

  if (!Number.isFinite(id) || id <= 0) {
    return (
      <ProtectedLayout module="campaigns">
        <p className="text-sm text-destructive">ID de campaña inválido</p>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout module="campaigns">
      <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Link className="text-sm text-muted-foreground" href="/dashboard/campanas">
            ← Campañas
          </Link>
          <h1 className="text-xl font-bold">{str(campaign?.name, "Campaña")}</h1>
          {campaign?.status ? <StatusBadge status={str(campaign.status)} /> : null}
          <div className="ml-auto flex gap-2">
            <Button disabled={saving} onClick={save}>
              {saving ? "Guardando…" : "Guardar"}
            </Button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-12 gap-4">
          <aside className="col-span-3 overflow-y-auto rounded-lg border p-3">
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Bloques email</p>
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
            <p className="mb-2 mt-4 text-xs font-semibold uppercase text-muted-foreground">Añadir</p>
            <div className="flex flex-wrap gap-1">
              {BLOCK_TYPES.map((t) => (
                <Button key={t} onClick={() => addBlock(t)} size="sm" variant="outline">
                  {t}
                </Button>
              ))}
            </div>
          </aside>

          <div className="col-span-5 overflow-y-auto rounded-lg border bg-muted/20 p-4">
            <p className="mb-3 text-xs font-semibold uppercase text-muted-foreground">Vista previa</p>
            {blocks.length > 0 ? (
              <BlockRenderer blocks={blocks} />
            ) : (
              <p className="text-sm text-muted-foreground">Añade bloques para componer el email</p>
            )}
          </div>

          <aside className="col-span-4 overflow-y-auto rounded-lg border p-3">
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">Propiedades</p>
            {sel ? (
              <div className="grid gap-2">
                {["headline", "content", "ctaText", "ctaUrl", "textColor"].map((key) =>
                  key in sel.props || ["headline", "content"].includes(key) ? (
                    <div key={key}>
                      <label className="text-xs text-muted-foreground">{key}</label>
                      <input
                        className="mt-1 w-full rounded border px-2 py-1 text-sm"
                        onChange={(e) => updateProp(key, e.target.value)}
                        value={str(sel.props[key])}
                      />
                    </div>
                  ) : null,
                )}
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
