"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { Badge } from "@/core/ui/Badge";
import { Button } from "@/core/ui/button";

type Item = {
  id: string;
  packRunId: string | null;
  qaScore: number;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
};

type Summary = { pending: number; approved: number; rejected: number; avgPendingScore: number };

export default function OsQaReviewPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/os/qa-review?status=pending");
      if (res.ok) {
        const d = (await res.json()) as { summary: Summary; items: Item[] };
        setSummary(d.summary);
        setItems(d.items ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function review(id: string, status: "approved" | "rejected") {
    setBusy(id);
    try {
      await fetch("/api/os/qa-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "review", id, status }),
      });
      void load();
    } finally {
      setBusy(null);
    }
  }

  return (
    <ProtectedLayout module="os">
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-bold">QA Review Queue</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Pack runs con QA &lt; 85 — revisión humana antes de portal.{" "}
            <Link href="/os/certificates" className="text-primary hover:underline">Certificados</Link>
          </p>
        </div>

        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Pending</p><p className="text-2xl font-bold mt-1 text-yellow-500">{summary.pending}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Approved</p><p className="text-2xl font-bold mt-1 text-green-500">{summary.approved}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Rejected</p><p className="text-2xl font-bold mt-1 text-red-500">{summary.rejected}</p></div>
            <div className="rounded-xl border border-border p-4"><p className="text-xs uppercase text-muted-foreground">Avg pending QA</p><p className="text-2xl font-bold mt-1">{summary.avgPendingScore}</p></div>
          </div>
        )}

        {loading ? (
          <p className="text-muted-foreground text-sm py-12 text-center">Cargando…</p>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-border p-10 text-center">
            <p className="text-muted-foreground text-sm">Cola vacía — todos los packs pasaron auto-approve (QA ≥ 85).</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="min-w-full text-sm">
              <thead><tr className="border-b border-border text-muted-foreground text-xs uppercase">
                <th className="px-4 py-3 text-left">Pack Run</th>
                <th className="px-4 py-3 text-right">QA</th>
                <th className="px-4 py-3 text-left">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr></thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-border/50">
                    <td className="px-4 py-3 font-mono text-xs">{item.packRunId?.slice(0, 12) ?? "—"}</td>
                    <td className="px-4 py-3 text-right"><span className={item.qaScore < 70 ? "text-red-500" : "text-yellow-500"}>{item.qaScore}</span></td>
                    <td className="px-4 py-3"><Badge tone="warning">{item.status}</Badge></td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {item.packRunId && (
                        <a href={`/api/os/certificates/${item.packRunId}/pdf`} className="text-primary text-xs hover:underline" target="_blank" rel="noreferrer">PDF</a>
                      )}
                      <button disabled={busy !== null} className="text-green-500 text-xs hover:underline disabled:opacity-50" onClick={() => void review(item.id, "approved")}>Aprobar</button>
                      <button disabled={busy !== null} className="text-red-500 text-xs hover:underline disabled:opacity-50" onClick={() => void review(item.id, "rejected")}>Rechazar</button>
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
