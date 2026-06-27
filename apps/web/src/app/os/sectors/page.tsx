"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Badge } from "@/core/ui/Badge";
import { Button } from "@/core/ui/button";

type ReadinessCheck = { key: string; label: string; done: boolean; points: number };

type Sector = {
  sectorId: string;
  label: string;
  sensitivity: "low" | "medium" | "high";
  regulated: boolean;
  seedCount: number;
  envatoCount: number;
  readinessScore: number;
  checklist: ReadinessCheck[];
};

type Summary = { totalSectors: number; productionReady: number; avgScore: number; regulatedCount: number };

function scoreColor(score: number): string {
  if (score >= 80) return "#22c55e";
  if (score >= 50) return "#f59e0b";
  return "#ef4444";
}

function ScoreRing({ score }: { score: number }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const color = scoreColor(score);
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" className="shrink-0">
      <circle cx="28" cy="28" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
      <circle
        cx="28" cy="28" r={r} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset} transform="rotate(-90 28 28)"
      />
      <text x="28" y="32" textAnchor="middle" fontSize="14" fontWeight="bold" fill="currentColor">{score}</text>
    </svg>
  );
}

export default function OsSectorsPage() {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function flash(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(null), 4000);
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/os/sectors");
      if (res.ok) {
        const d = (await res.json()) as { summary: Summary; sectors: Sector[] };
        setSummary(d.summary);
        setSectors(d.sectors ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function refresh() {
    setBusy(true);
    try {
      const res = await fetch("/api/os/sectors/refresh", { method: "POST" });
      if (res.ok) {
        const d = (await res.json()) as { refreshed: number };
        flash(`${d.refreshed} sectores recalculados`);
        void load();
      } else {
        flash("No se pudo recalcular");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <ProtectedLayout module="os">
      <div className="space-y-6 p-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Sector Readiness</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Madurez de producción por vertical (20 sectores) — seeds, Envato, agentes, portal y QA.
            </p>
          </div>
          <Button variant="outline" disabled={busy} onClick={() => void refresh()}>
            {busy ? "Recalculando…" : "Recalcular readiness"}
          </Button>
        </div>

        {notice && <div className="rounded-lg border border-border bg-muted/40 px-4 py-2 text-sm">{notice}</div>}

        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Sectores</p><p className="text-2xl font-bold mt-1">{summary.totalSectors}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Production-ready</p><p className="text-2xl font-bold mt-1">{summary.productionReady}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Score medio</p><p className="text-2xl font-bold mt-1">{summary.avgScore}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Regulados</p><p className="text-2xl font-bold mt-1">{summary.regulatedCount}</p></div>
          </div>
        )}

        {loading ? (
          <p className="text-muted-foreground text-sm py-12 text-center">Cargando sectores…</p>
        ) : sectors.length === 0 ? (
          <div className="rounded-xl border border-border p-10 text-center space-y-2">
            <p className="font-semibold">Registry vacío</p>
            <p className="text-muted-foreground text-sm">Pulsa <strong>Recalcular readiness</strong> para sincronizar los 20 sectores.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sectors.map((s) => (
              <div key={s.sectorId} className="rounded-xl border border-border p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <ScoreRing score={s.readinessScore} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm leading-tight">{s.label}</p>
                    <p className="text-xs text-muted-foreground">{s.sectorId}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      <Badge tone={s.sensitivity === "high" ? "destructive" : s.sensitivity === "medium" ? "warning" : "neutral"}>{s.sensitivity}</Badge>
                      {s.regulated && <Badge tone="warning">regulado</Badge>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{s.seedCount} seed · {s.envatoCount} envato</span>
                  <button onClick={() => setExpanded(expanded === s.sectorId ? null : s.sectorId)} className="text-primary hover:underline">
                    {expanded === s.sectorId ? "Ocultar" : "Checklist"}
                  </button>
                </div>

                {expanded === s.sectorId && (
                  <div className="space-y-1.5 border-t border-border pt-2">
                    {s.checklist.map((c) => (
                      <div key={c.key} className="flex items-center justify-between text-xs">
                        <span className={c.done ? "text-foreground" : "text-muted-foreground line-through"}>
                          {c.done ? "✅" : "⬜"} {c.label}
                        </span>
                        <span className="text-muted-foreground">+{c.points}</span>
                      </div>
                    ))}
                    <Link href={`/os/seeds?sector=${encodeURIComponent(s.sectorId)}`} className="inline-block text-primary text-xs hover:underline mt-1">
                      Ver seeds del sector →
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}
