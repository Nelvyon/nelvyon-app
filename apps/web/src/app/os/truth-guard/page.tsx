"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Badge } from "@/core/ui/Badge";
import { Button } from "@/core/ui/button";

type TruthStatus = "pending" | "passed" | "warning" | "blocked";
type TruthChannel = "landing" | "email" | "ads";

type Audit = {
  id: string;
  channel: TruthChannel;
  status: TruthStatus;
  violations: string[];
  packRunId: string | null;
  campaniaId: string | null;
  contentPreview: string | null;
  auditedAt: string;
};

type Summary = {
  total: number;
  blocked: number;
  passed: number;
  warning: number;
  byChannel: Record<TruthChannel, number>;
  topViolations: Array<{ violation: string; count: number }>;
};

const STATUS_TONE: Record<TruthStatus, "success" | "destructive" | "warning" | "neutral"> = {
  passed: "success",
  blocked: "destructive",
  warning: "warning",
  pending: "neutral",
};

export default function OsTruthGuardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [channel, setChannel] = useState<TruthChannel>("landing");
  const [text, setText] = useState("");
  const [subject, setSubject] = useState("");
  const [headline, setHeadline] = useState("");
  const [description, setDescription] = useState("");
  const [scanResult, setScanResult] = useState<Audit | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/os/truth-guard");
      if (!res.ok) { setError(`Error ${res.status} al cargar truth guard`); return; }
      const d = (await res.json()) as { summary: Summary; audits: Audit[] };
      setSummary(d.summary);
      setAudits(d.audits ?? []);
    } catch {
      setError("No se pudo cargar truth guard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function runScan() {
    setBusy(true);
    setScanResult(null);
    try {
      const res = await fetch("/api/os/truth-guard/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel, text, subject, headline, description }),
      });
      const d = (await res.json()) as { result: Audit };
      if (!res.ok) { setError("Error al evaluar copy"); return; }
      setScanResult({ ...d.result, auditedAt: new Date().toISOString() });
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <ProtectedLayout module="os">
      <div className="mx-auto max-w-6xl space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold">Truth Guard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Reglas pre-publish unificadas para landing, email y ads — sin LLM.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            <Link href="/os/shield" className="text-primary hover:underline">Shield</Link>
            {" · "}<Link href="/os/qa" className="text-primary hover:underline">QA</Link>
            {" · "}<Link href="/os/certificates" className="text-primary hover:underline">Certificados</Link>
            {" · "}<Link href="/saas/campanias" className="text-primary hover:underline">Campañas</Link>
          </p>
        </div>

        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              ["Total", summary.total],
              ["Blocked", summary.blocked],
              ["Passed", summary.passed],
              ["Warning", summary.warning],
              ["Landing", summary.byChannel?.landing ?? 0],
            ].map(([label, val]) => (
              <div key={String(label)} className="rounded-xl border border-border bg-card/50 p-4">
                <p className="text-xs text-muted-foreground uppercase">{label}</p>
                <p className="text-2xl font-semibold mt-1">{val}</p>
              </div>
            ))}
          </div>
        )}

        <div className="rounded-xl border border-border bg-card/50 p-4 space-y-3">
          <h2 className="font-medium">Probar copy</h2>
          <div className="flex flex-wrap gap-2">
            {(["landing", "email", "ads"] as TruthChannel[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setChannel(c)}
                className={`px-3 py-1 rounded-lg text-sm border ${channel === c ? "border-primary bg-primary/10" : "border-border"}`}
              >
                {c}
              </button>
            ))}
          </div>
          {channel === "email" && (
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          )}
          {channel === "ads" && (
            <div className="flex flex-wrap gap-2">
              <input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Headline" className="flex-1 min-w-[200px] rounded-lg border border-border bg-background px-3 py-2 text-sm" />
              <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description" className="flex-1 min-w-[200px] rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            </div>
          )}
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Copy / body" rows={4} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <Button disabled={busy || !text.trim()} onClick={() => void runScan()}>{busy ? "Evaluando…" : "Evaluar"}</Button>
          {scanResult && (
            <div className="text-sm space-y-1">
              <Badge tone={STATUS_TONE[scanResult.status]}>{scanResult.status}</Badge>
              {scanResult.violations?.length > 0 && (
                <p className="text-destructive text-xs">{scanResult.violations.join(" · ")}</p>
              )}
            </div>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando audits…</p>
        ) : audits.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin audits aún — evalúa copy o ejecuta un pack/campaña.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs uppercase">
                  <th className="px-3 py-3 text-left">Canal</th>
                  <th className="px-3 py-3 text-left">Estado</th>
                  <th className="px-3 py-3 text-right">Violaciones</th>
                  <th className="px-3 py-3 text-left">Ref</th>
                  <th className="px-3 py-3 text-left">Preview</th>
                  <th className="px-3 py-3 text-left">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {audits.map((a) => (
                  <tr key={a.id} className="border-b border-border/50">
                    <td className="px-3 py-2">{a.channel}</td>
                    <td className="px-3 py-2"><Badge tone={STATUS_TONE[a.status]}>{a.status}</Badge></td>
                    <td className="px-3 py-2 text-right">{a.violations?.length ?? 0}</td>
                    <td className="px-3 py-2 text-xs font-mono">
                      {a.packRunId ? `${a.packRunId.slice(0, 8)}…` : a.campaniaId ? `camp ${a.campaniaId.slice(0, 8)}…` : "—"}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground max-w-xs truncate">{a.contentPreview ?? "—"}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(a.auditedAt).toLocaleString()}</td>
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
