"use client";

import { useEffect, useMemo, useState } from "react";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Badge } from "@/core/ui/Badge";
import { Button } from "@/core/ui/button";

type SeedItem = {
  id: string;
  sector: string;
  source: "envato" | "synthetic";
  headline: string;
  metaTitle: string | null;
  ctaLabel: string | null;
  previewUrl: string | null;
  downloadStatus: "metadata_only" | "downloaded" | "failed";
};

type SectorStat = {
  sector: string;
  total: number;
  downloaded: number;
  metadataOnly: number;
  failed: number;
};

const STATUS_TONE: Record<SeedItem["downloadStatus"], "neutral" | "success" | "warning" | "destructive"> = {
  downloaded: "success",
  metadata_only: "neutral",
  failed: "destructive",
};

export default function OsSeedLibraryPage() {
  const [items, setItems] = useState<SeedItem[]>([]);
  const [stats, setStats] = useState<SectorStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [sector, setSector] = useState("all");
  const [notice, setNotice] = useState<string | null>(null);

  function flash(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(null), 4000);
  }

  async function load(sectorFilter = sector) {
    setLoading(true);
    try {
      const qs = sectorFilter !== "all" ? `?sector=${encodeURIComponent(sectorFilter)}&limit=200` : "?limit=200";
      const res = await fetch(`/api/os/seeds${qs}`);
      if (res.ok) {
        const d = (await res.json()) as { stats: SectorStat[]; items: SeedItem[] };
        setStats(d.stats ?? []);
        setItems(d.items ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load("all");   }, []);

  async function sync(mode: "metadata" | "download-lite") {
    setBusy(true);
    try {
      const res = await fetch("/api/os/seeds/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const d = (await res.json().catch(() => ({}))) as { synced?: number; error?: string };
      if (res.ok) {
        flash(`Sincronizados ${d.synced ?? 0} seeds`);
        void load();
      } else {
        flash(d.error ?? "No se pudo sincronizar");
      }
    } finally {
      setBusy(false);
    }
  }

  const totals = useMemo(() => {
    return stats.reduce(
      (acc, s) => ({
        total: acc.total + s.total,
        downloaded: acc.downloaded + s.downloaded,
        sectors: acc.sectors + 1,
      }),
      { total: 0, downloaded: 0, sectors: 0 },
    );
  }, [stats]);

  const sectorOptions = useMemo(() => stats.map((s) => s.sector), [stats]);

  return (
    <ProtectedLayout module="os">
      <div className="space-y-6 p-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Seed Library</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Catálogo Envato de 500 seeds para landings sectoriales (10 sectores × 50).
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" disabled={busy} onClick={() => void sync("metadata")}>
              {busy ? "Sincronizando…" : "Sync metadata"}
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => void sync("download-lite")}>
              Download lite
            </Button>
          </div>
        </div>

        {notice && (
          <div className="rounded-lg border border-border bg-muted/40 px-4 py-2 text-sm">{notice}</div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-border p-4">
            <p className="text-xs uppercase text-muted-foreground">Catálogo</p>
            <p className="text-2xl font-bold mt-1">{totals.total}</p>
          </div>
          <div className="rounded-xl border border-border p-4">
            <p className="text-xs uppercase text-muted-foreground">Descargados</p>
            <p className="text-2xl font-bold mt-1">{totals.downloaded}</p>
          </div>
          <div className="rounded-xl border border-border p-4">
            <p className="text-xs uppercase text-muted-foreground">Sectores</p>
            <p className="text-2xl font-bold mt-1">{totals.sectors}</p>
          </div>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-3">
          <label className="text-sm text-muted-foreground">Sector</label>
          <select
            value={sector}
            onChange={(e) => { setSector(e.target.value); void load(e.target.value); }}
            className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm"
          >
            <option value="all">Todos</option>
            {sectorOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Grid */}
        {loading ? (
          <p className="text-muted-foreground text-sm py-12 text-center">Cargando catálogo…</p>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-border p-10 text-center space-y-2">
            <p className="font-semibold">Registry vacío</p>
            <p className="text-muted-foreground text-sm">
              Pulsa <strong>Sync metadata</strong> para cargar los 500 seeds del catálogo commiteado.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <div key={item.id} className="rounded-xl border border-border overflow-hidden">
                {item.previewUrl ? (
                   
                  <img src={item.previewUrl} alt={item.headline} className="h-32 w-full object-cover" />
                ) : (
                  <div className="h-32 w-full bg-muted/40 flex items-center justify-center text-muted-foreground text-3xl">🌱</div>
                )}
                <div className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-tight">{item.headline}</p>
                    <Badge tone={item.source === "envato" ? "success" : "neutral"}>{item.source}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">{item.sector}</span>
                    <Badge tone={STATUS_TONE[item.downloadStatus]}>{item.downloadStatus}</Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}
