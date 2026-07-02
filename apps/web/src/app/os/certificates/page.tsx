"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Badge } from "@/core/ui/Badge";

type CertStatus = "pending" | "issued" | "failed";

type Cert = {
  id: string;
  packId: string;
  packRunId: string;
  status: CertStatus;
  qaScore: number | null;
  legalPassed: boolean | null;
  seedId: string | null;
  agentProvider: string;
  contentHash: string | null;
  certUrl: string | null;
  issuedAt: string | null;
};

type Summary = { total: number; issued: number; failed: number; avgQaScore: number; lastIssuedAt: string | null };

const STATUS_TONE: Record<CertStatus, "success" | "destructive" | "neutral"> = {
  issued: "success",
  failed: "destructive",
  pending: "neutral",
};

export default function OsCertificatesPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [certs, setCerts] = useState<Cert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function flash(msg: string) { setNotice(msg); setTimeout(() => setNotice(null), 5000); }

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/os/certificates");
      if (!res.ok) { setError(`Error ${res.status} al cargar certificados`); return; }
      const d = (await res.json()) as { summary: Summary; certificates: Cert[] };
      setSummary(d.summary);
      setCerts(d.certificates ?? []);
    } catch {
      setError("Error de red al cargar certificados");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function reissue(cert: Cert) {
    setBusy(cert.id);
    try {
      const res = await fetch("/api/os/certificates/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packRunId: cert.packRunId, force: true }),
      });
      flash(res.ok ? "Certificado re-emitido" : "Error al re-emitir");
      if (res.ok) void load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <ProtectedLayout module="os">
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold">Delivery Certificates</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Certificado verificable por pack run (QA · legal · seed · agentes · hash).{" "}
            <Link href="/os/qa" className="text-primary hover:underline">QA</Link>
            {" · "}<Link href="/os/gate" className="text-primary hover:underline">Gate</Link>
            {" · "}<Link href="/saas/compliance" className="text-primary hover:underline">Compliance Vault</Link>
          </p>
        </div>

        {notice && <div className="rounded-lg border border-border bg-muted/40 px-4 py-2 text-sm">{notice}</div>}
        {error && <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</div>}

        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Emitidos</p><p className="text-2xl font-bold mt-1 text-green-500">{summary.issued}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">QA medio</p><p className="text-2xl font-bold mt-1">{summary.avgQaScore}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Total</p><p className="text-2xl font-bold mt-1">{summary.total}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Último emitido</p><p className="text-sm font-bold mt-1">{summary.lastIssuedAt ? new Date(summary.lastIssuedAt).toLocaleDateString() : "—"}</p></div>
          </div>
        )}

        {loading ? (
          <p className="text-muted-foreground text-sm py-12 text-center">Cargando…</p>
        ) : certs.length === 0 ? (
          <div className="rounded-xl border border-border p-10 text-center">
            <p className="text-muted-foreground text-sm">Sin certificados aún. Se emiten automáticamente al completar un pack run.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="min-w-full text-sm">
              <thead><tr className="border-b border-border text-muted-foreground text-xs uppercase">
                <th className="px-4 py-3 text-left">Pack</th><th className="px-4 py-3 text-left">Run</th>
                <th className="px-4 py-3 text-right">QA</th><th className="px-4 py-3 text-center">Legal</th>
                <th className="px-4 py-3 text-left">Seed</th><th className="px-4 py-3 text-left">Proveedor</th>
                <th className="px-4 py-3 text-left">Hash</th><th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr></thead>
              <tbody>
                {certs.map((c) => (
                  <tr key={c.id} className="border-b border-border/50">
                    <td className="px-4 py-3 text-xs">{c.packId}</td>
                    <td className="px-4 py-3 text-xs font-mono">{c.packRunId.slice(0, 8)}…</td>
                    <td className="px-4 py-3 text-right">{c.qaScore !== null ? <span className={c.qaScore >= 85 ? "text-green-500" : "text-yellow-500"}>{c.qaScore}</span> : "—"}</td>
                    <td className="px-4 py-3 text-center">{c.legalPassed === true ? "✅" : c.legalPassed === false ? "❌" : "—"}</td>
                    <td className="px-4 py-3 text-xs">{c.seedId ?? "—"}</td>
                    <td className="px-4 py-3 text-xs">{c.agentProvider}</td>
                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{c.contentHash ? c.contentHash.slice(0, 8) + "…" : "—"}</td>
                    <td className="px-4 py-3"><Badge tone={STATUS_TONE[c.status]}>{c.status}</Badge></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex gap-2 justify-end">
                        {c.certUrl && c.status === "issued" && (
                          <button onClick={() => setPreview(c.certUrl)} className="text-primary text-xs hover:underline">Ver</button>
                        )}
                        <button disabled={busy !== null} onClick={() => void reissue(c)} className="text-muted-foreground text-xs hover:underline disabled:opacity-50">Re-emitir</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {preview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setPreview(null)}>
            <div className="w-full max-w-2xl h-[80vh] rounded-xl overflow-hidden border border-border bg-background" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                <span className="text-sm font-medium">Certificado</span>
                <button onClick={() => setPreview(null)} className="text-muted-foreground hover:text-foreground text-lg leading-none">×</button>
              </div>
              <iframe src={preview} className="w-full h-[calc(80vh-41px)]" title="Certificado de entrega" />
            </div>
          </div>
        )}
      </div>
    </ProtectedLayout>
  );
}
