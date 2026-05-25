"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { DashboardPageTransition } from "@/features/dashboard/components/DashboardTabs";
import { Button } from "@/core/ui/button";
import { landingApi, osWebApi } from "@/features/builders/api";
import { BlockRenderer } from "@/features/builders/components/BlockRenderer";
import { StatusBadge } from "@/features/builders/components/DashboardUi";
import type { LandingBlock, WebProject } from "@/features/builders/types";

type PerfState = {
  traffic_light: "green" | "yellow" | "red" | "unknown";
  metrics: {
    performance_score?: number;
    lcp_ms?: number;
    cls?: number;
    fid_ms?: number;
    measured_at?: string;
  } | null;
};

export default function WebsiteEditorPage() {
  const params = useParams<{ project_id: string }>();
  const id = params?.project_id ?? "";
  const [project, setProject] = useState<WebProject | null>(null);
  const [previewBlocks, setPreviewBlocks] = useState<LandingBlock[]>([]);
  const [perf, setPerf] = useState<PerfState | null>(null);

  useEffect(() => {
    if (!id) return;
    osWebApi.get(id).then(setProject).catch(() => setProject(null));
    osWebApi.performance(id).then(setPerf).catch(() => setPerf(null));
  }, [id]);

  async function loadPreview(lpId?: string) {
    if (!lpId) return;
    const page = await landingApi.get(lpId);
    setPreviewBlocks(page.blocks ?? []);
  }

  return (
    <ProtectedLayout module="os">
      <DashboardPageTransition>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link className="text-sm text-muted-foreground" href="/dashboard/websites">
              ← Webs
            </Link>
            <h1 className="text-2xl font-bold">{project?.name ?? "Editor"}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              {project ? <StatusBadge status={project.status} /> : null}
              {perf ? <PerformanceBadge light={perf.traffic_light} score={perf.metrics?.performance_score} /> : null}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={!project || project.status === "generating"}
              onClick={() =>
                osWebApi.measurePerformance(id).then((r) =>
                  setPerf({
                    traffic_light: r.traffic_light,
                    metrics: (r.metrics as PerfState["metrics"]) ?? null,
                  }),
                )
              }
              size="sm"
              variant="outline"
            >
              Medir performance
            </Button>
            <Button
              disabled={project?.status !== "ready"}
              onClick={() => osWebApi.publish(id).then(() => osWebApi.get(id).then(setProject))}
            >
              Publicar todo
            </Button>
          </div>
        </div>

        {perf?.metrics ? (
          <div className="rounded-lg border bg-card p-4 text-sm">
            <p className="font-medium">Core Web Vitals</p>
            <div className="mt-2 grid gap-2 sm:grid-cols-4">
              <Metric label="Score" value={perf.metrics.performance_score != null ? String(perf.metrics.performance_score) : "—"} />
              <Metric label="LCP (ms)" value={perf.metrics.lcp_ms != null ? Math.round(perf.metrics.lcp_ms).toString() : "—"} />
              <Metric label="CLS" value={perf.metrics.cls != null ? perf.metrics.cls.toFixed(3) : "—"} />
              <Metric label="FID (ms)" value={perf.metrics.fid_ms != null ? Math.round(perf.metrics.fid_ms).toString() : "—"} />
            </div>
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-2">
            <h2 className="font-semibold">Páginas</h2>
            {(project?.pages ?? []).map((page) => (
              <div className="flex items-center justify-between rounded-lg border p-3" key={page.id}>
                <div>
                  <p className="font-medium">{page.page_type}</p>
                  <p className="text-xs text-muted-foreground">/{page.page_slug}</p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => loadPreview(page.landing_page_id)} size="sm" variant="outline">
                    Preview
                  </Button>
                  <Button
                    onClick={() =>
                      osWebApi.updatePage(id, page.id, { regenerate: true }).then(() => osWebApi.get(id).then(setProject))
                    }
                    size="sm"
                  >
                    Regenerar IA
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <div className="rounded-xl border bg-muted/20 p-4">
            <h2 className="mb-4 font-semibold">Vista previa</h2>
            <BlockRenderer blocks={previewBlocks} />
          </div>
        </div>
      </DashboardPageTransition>
    </ProtectedLayout>
  );
}

function PerformanceBadge({ light, score }: { light: PerfState["traffic_light"]; score?: number }) {
  const colors = {
    green: "bg-emerald-500",
    yellow: "bg-amber-400",
    red: "bg-red-500",
    unknown: "bg-slate-400",
  };
  return (
    <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium">
      <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${colors[light]}`} />
      Performance {score != null ? score : "—"}
    </span>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
