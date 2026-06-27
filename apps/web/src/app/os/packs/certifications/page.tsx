"use client";

import { useEffect, useState } from "react";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Badge } from "@/core/ui/Badge";
import { Button } from "@/core/ui/button";

type Cert = {
  packId: string;
  status: "pending" | "running" | "passed" | "failed";
  qaScore: number | null;
  legalPassed: boolean | null;
  stepsCompleted: number;
  stepsTotal: number;
  deliverablesCount: number;
  failureReason: string | null;
  runDurationMs: number | null;
  certifiedAt: string | null;
  lastRunId: string | null;
};

type Summary = { passed: number; failed: number; pending: number; running: number; total: number };

const STATUS_TONE: Record<Cert["status"], "success" | "destructive" | "warning" | "neutral"> = {
  passed: "success",
  failed: "destructive",
  running: "warning",
  pending: "neutral",
};

const PACK_LABELS: Record<string, string> = {
  "local-business-growth": "Crecimiento Local",
  "ecommerce-growth": "Crecimiento Ecommerce",
  "saas-b2b-growth": "Crecimiento SaaS B2B",
  "social-calendar-pack": "Calendario Social (beta)",
  "content-strategy-pack": "Estrategia Contenidos (beta)",
  "cro-audit-pack": "Auditoría CRO (beta)",
  "analytics-setup-pack": "Setup Analytics (beta)",
  "brand-voice-pack": "Voz de Marca (beta)",
};

export default function PackCertificationsPage() {
  const [items, setItems] = useState<Cert[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function flash(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(null), 5000);
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/os/packs/certifications");
      if (res.ok) {
        const d = (await res.json()) as { summary: Summary; items: Cert[] };
        setSummary(d.summary);
        setItems(d.items ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function certify(packId?: string) {
    setBusy(packId ?? "all");
    try {
      const res = await fetch("/api/os/packs/certifications/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(packId ? { packId } : {}),
      });
      if (res.ok) {
        flash(packId ? `${PACK_LABELS[packId] ?? packId} re-certificado` : "Certificación completa ejecutada");
        void load();
      } else {
        flash("La certificación falló");
      }
    } finally {
      setBusy(null);
    }
  }

  async function promote(packId: string) {
    setBusy(packId);
    try {
      const res = await fetch("/api/os/packs/certifications/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });
      const d = (await res.json().catch(() => ({}))) as { error?: string };
      flash(res.ok ? `${PACK_LABELS[packId] ?? packId} promovido a available` : d.error ?? "No se pudo promover");
      if (res.ok) void load();
    } finally {
      setBusy(null);
    }
  }

  const betaPending = items.filter((i) => i.packId.match(/social-calendar|content-strategy|cro-audit|analytics-setup|brand-voice/) && i.status !== "passed").length;

  return (
    <ProtectedLayout module="os">
      <div className="space-y-6 p-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold">Pack Certifications</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Certificación E2E de los 8 pack runners — QA ≥ 85 + legal para pasar.
            </p>
          </div>
          <Button disabled={busy !== null} onClick={() => void certify()}>
            {busy === "all" ? "Certificando…" : "Certificar todo"}
          </Button>
        </div>

        {notice && <div className="rounded-lg border border-border bg-muted/40 px-4 py-2 text-sm">{notice}</div>}

        {betaPending > 0 && (
          <div className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-2 text-sm text-yellow-700 dark:text-yellow-300">
            {betaPending} pack(s) beta pendientes de certificación.
          </div>
        )}

        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Passed</p><p className="text-2xl font-bold mt-1 text-green-500">{summary.passed}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Failed</p><p className="text-2xl font-bold mt-1 text-red-500">{summary.failed}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Pending</p><p className="text-2xl font-bold mt-1">{summary.pending}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Total</p><p className="text-2xl font-bold mt-1">{summary.total}</p></div>
          </div>
        )}

        {loading ? (
          <p className="text-muted-foreground text-sm py-12 text-center">Cargando certificaciones…</p>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-border p-10 text-center space-y-2">
            <p className="font-semibold">Sin certificaciones</p>
            <p className="text-muted-foreground text-sm">Pulsa <strong>Certificar todo</strong> para ejecutar los 8 runners.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs uppercase">
                  <th className="px-4 py-3 text-left">Pack</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-right">QA</th>
                  <th className="px-4 py-3 text-center">Legal</th>
                  <th className="px-4 py-3 text-right">Steps</th>
                  <th className="px-4 py-3 text-right">Entregables</th>
                  <th className="px-4 py-3 text-right">Duración</th>
                  <th className="px-4 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.packId} className="border-b border-border/50">
                    <td className="px-4 py-3">
                      <p className="font-medium">{PACK_LABELS[c.packId] ?? c.packId}</p>
                      {c.failureReason && <p className="text-red-500 text-xs">{c.failureReason}</p>}
                    </td>
                    <td className="px-4 py-3"><Badge tone={STATUS_TONE[c.status]}>{c.status}</Badge></td>
                    <td className="px-4 py-3 text-right">{c.qaScore !== null ? <span className={c.qaScore >= 85 ? "text-green-500" : "text-yellow-500"}>{c.qaScore}</span> : "—"}</td>
                    <td className="px-4 py-3 text-center">{c.legalPassed === true ? "✅" : c.legalPassed === false ? "❌" : "—"}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{c.stepsCompleted}/{c.stepsTotal}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{c.deliverablesCount}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">{c.runDurationMs ? `${(c.runDurationMs / 1000).toFixed(1)}s` : "—"}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        <button disabled={busy !== null} onClick={() => void certify(c.packId)} className="text-primary text-xs hover:underline disabled:opacity-50">Re-certificar</button>
                        {c.status === "passed" && (
                          <button disabled={busy !== null} onClick={() => void promote(c.packId)} className="text-green-500 text-xs hover:underline disabled:opacity-50">Promover</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}
