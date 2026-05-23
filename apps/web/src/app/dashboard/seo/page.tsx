"use client";

import { useState } from "react";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Button } from "@/core/ui/button";
import { dashboardSeoApi } from "@/features/dashboard/api";
import { DashboardTabs } from "@/features/dashboard/components/DashboardTabs";

const TABS = [
  { id: "keywords", label: "Keywords" },
  { id: "positions", label: "Posiciones" },
  { id: "audit", label: "Auditoría" },
  { id: "content", label: "Contenido" },
];

export default function SeoDashboardPage() {
  const [tab, setTab] = useState("keywords");
  const [keyword, setKeyword] = useState("");
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  async function runQuery() {
    setLoading(true);
    setResult(null);
    try {
      if (tab === "keywords") {
        const data = await dashboardSeoApi.keywordOverview(keyword);
        setResult(data as Record<string, unknown>);
      } else if (tab === "positions" || tab === "audit") {
        const data = await dashboardSeoApi.domainOverview(domain);
        setResult(data as Record<string, unknown>);
      } else {
        const data = await dashboardSeoApi.keywordIdeas(keyword);
        setResult(data as Record<string, unknown>);
      }
    } catch {
      setResult({ error: "No se pudo obtener datos SEO" });
    } finally {
      setLoading(false);
    }
  }

  const needsKeyword = tab === "keywords" || tab === "content";
  const needsDomain = tab === "positions" || tab === "audit";

  return (
    <ProtectedLayout module="os">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">SEO</h1>
          <p className="text-sm text-muted-foreground">Keywords, posiciones, auditoría y contenido</p>
        </div>

        <DashboardTabs active={tab} onChange={setTab} tabs={TABS} />

        <div className="flex flex-wrap items-end gap-3">
          {needsKeyword ? (
            <div className="flex-1 min-w-[200px]">
              <label className="mb-1 block text-xs text-muted-foreground">Keyword</label>
              <input
                className="w-full rounded-lg border px-3 py-2"
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="ej. marketing digital"
                value={keyword}
              />
            </div>
          ) : null}
          {needsDomain ? (
            <div className="flex-1 min-w-[200px]">
              <label className="mb-1 block text-xs text-muted-foreground">Dominio</label>
              <input
                className="w-full rounded-lg border px-3 py-2"
                onChange={(e) => setDomain(e.target.value)}
                placeholder="ej. ejemplo.com"
                value={domain}
              />
            </div>
          ) : null}
          <Button
            disabled={loading || (needsKeyword && !keyword) || (needsDomain && !domain)}
            onClick={runQuery}
          >
            {loading ? "Consultando…" : "Analizar"}
          </Button>
        </div>

        {result ? (
          <div className="rounded-xl border bg-card p-4">
            <h2 className="mb-3 font-semibold capitalize">{tab}</h2>
            <pre className="max-h-[480px] overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            {tab === "keywords" && "Introduce una keyword para ver volumen, dificultad y CPC."}
            {tab === "positions" && "Introduce un dominio para ver posiciones orgánicas y competidores."}
            {tab === "audit" && "Auditoría de dominio: autoridad, tráfico y backlinks."}
            {tab === "content" && "Ideas de contenido basadas en keywords relacionadas."}
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}
