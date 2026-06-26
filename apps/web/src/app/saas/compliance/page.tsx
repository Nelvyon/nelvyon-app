"use client";

import { useEffect, useState } from "react";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";
import { NelvyonDsBadge } from "@/design-system/components";
import type { ComplianceArtifact, VaultSummary, ComplianceStatus, ConsentType } from "@nelvyon/saas";

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_TONE: Record<ComplianceStatus, "success" | "warning" | "neutral" | "danger"> = {
  verified: "success",
  pending: "warning",
  expired: "neutral",
  revoked: "danger",
};

const CONSENT_LABEL: Record<ConsentType, string> = {
  gdpr_marketing: "GDPR Marketing",
  gdpr_data_processing: "GDPR Processing",
  sector_disclaimer: "Sector Disclaimer",
  client_approval: "Client Approval",
  qa_certificate: "QA Certificate",
  other: "Other",
};

// ── KPI card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-5 py-4">
      <p className="text-white/40 text-xs uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-white mt-1">{value}</p>
    </div>
  );
}

// ── Detail modal ──────────────────────────────────────────────────────────────

function ArtifactModal({
  artifact,
  onClose,
  onVerify,
  onRevoke,
}: {
  artifact: ComplianceArtifact;
  onClose: () => void;
  onVerify: () => void;
  onRevoke: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="rounded-xl border border-white/10 bg-[#0d1929] w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 className="text-white font-semibold text-sm truncate">{artifact.title ?? artifact.deliverableRef.slice(0, 20)}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white text-lg leading-none">×</button>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-white/40 mb-0.5">Source</p>
              <p className="text-white/80">{artifact.deliverableSource}</p>
            </div>
            <div>
              <p className="text-white/40 mb-0.5">Consent Type</p>
              <p className="text-white/80">{CONSENT_LABEL[artifact.consentType]}</p>
            </div>
            <div>
              <p className="text-white/40 mb-0.5">Pack ID</p>
              <p className="text-white/80">{artifact.packId ?? "—"}</p>
            </div>
            <div>
              <p className="text-white/40 mb-0.5">Status</p>
              <NelvyonDsBadge tone={STATUS_TONE[artifact.status]}>{artifact.status}</NelvyonDsBadge>
            </div>
          </div>

          {artifact.contentHash && (
            <div>
              <p className="text-white/40 text-xs mb-1">Content Hash (SHA-256)</p>
              <p className="text-white/60 text-xs font-mono break-all">{artifact.contentHash}</p>
            </div>
          )}

          {Object.keys(artifact.metadata).length > 0 && (
            <div>
              <p className="text-white/40 text-xs mb-1">Metadata</p>
              <pre className="rounded-lg bg-black/40 p-3 text-xs text-white/60 overflow-x-auto">
                {JSON.stringify(artifact.metadata, null, 2)}
              </pre>
            </div>
          )}

          <div className="flex flex-wrap gap-3 text-xs">
            {artifact.legalDocUrl && (
              <a href={artifact.legalDocUrl} target="_blank" rel="noopener noreferrer"
                className="text-[#0084ff] hover:underline">
                📄 Legal Doc
              </a>
            )}
            {artifact.qaPdfUrl && (
              <a href={artifact.qaPdfUrl} target="_blank" rel="noopener noreferrer"
                className="text-[#0084ff] hover:underline">
                📊 QA Report
              </a>
            )}
            {artifact.packRunId && (
              <a href={`/portal/deliverables?pack_run_id=${artifact.packRunId}`}
                target="_blank" rel="noopener noreferrer"
                className="text-[#0084ff] hover:underline">
                🌐 Portal
              </a>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-white/10">
          {artifact.status === "pending" && (
            <button onClick={onVerify}
              className="rounded-lg bg-green-600/80 px-3 py-1.5 text-xs text-white hover:bg-green-600">
              ✅ Verificar
            </button>
          )}
          {artifact.status !== "revoked" && (
            <button onClick={onRevoke}
              className="rounded-lg bg-red-600/20 px-3 py-1.5 text-xs text-red-400 hover:bg-red-600/40">
              Revocar
            </button>
          )}
          <button onClick={onClose}
            className="rounded-lg bg-white/10 px-3 py-1.5 text-xs text-white hover:bg-white/20">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function CompliancePage() {
  const [summary, setSummary] = useState<VaultSummary | null>(null);
  const [artifacts, setArtifacts] = useState<ComplianceArtifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedArtifact, setSelectedArtifact] = useState<ComplianceArtifact | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/saas/compliance");
      if (res.ok) {
        const d = (await res.json()) as { summary: VaultSummary; artifacts: ComplianceArtifact[] };
        setSummary(d.summary);
        setArtifacts(d.artifacts ?? []);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function handleSync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/saas/compliance/sync", { method: "POST" });
      if (res.ok) {
        const d = (await res.json()) as { synced: number };
        showToast(`${d.synced} artifact(s) sincronizados`);
        void load();
      }
    } finally {
      setSyncing(false);
    }
  }

  async function handleVerify(artifactId: string) {
    const res = await fetch(`/api/saas/compliance/${artifactId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "verify" }),
    });
    if (res.ok) {
      showToast("Artifact verificado");
      setSelectedArtifact(null);
      void load();
    }
  }

  async function handleRevoke(artifactId: string) {
    const res = await fetch(`/api/saas/compliance/${artifactId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "revoke", reason: "Revocado manualmente" }),
    });
    if (res.ok) {
      showToast("Artifact revocado");
      setSelectedArtifact(null);
      void load();
    }
  }

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="compliance" />}>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Compliance Vault</h1>
            <p className="text-white/50 text-sm mt-1">
              Artifacts legales, QA certificates y audit trail por entregable
            </p>
          </div>
          <button
            disabled={syncing || loading}
            onClick={() => { void handleSync(); }}
            className="rounded-xl bg-[#0084ff] px-4 py-2 text-sm text-white font-medium disabled:opacity-50 hover:bg-[#0070dd] transition-colors"
          >
            {syncing ? "Sincronizando…" : "↻ Sincronizar"}
          </button>
        </div>

        {/* KPI strip */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KpiCard label="Total" value={summary.total} />
            <KpiCard label="Pendientes" value={summary.pending} />
            <KpiCard label="Verificados" value={summary.verified} />
            <KpiCard label="Expiran pronto" value={summary.expiringSoon} />
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="text-white/40 text-sm py-12 text-center">Cargando artifacts…</div>
        ) : artifacts.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-14 text-center space-y-3">
            <div className="text-4xl">🔒</div>
            <p className="text-white font-semibold">Sin artifacts en el Vault</p>
            <p className="text-white/40 text-sm max-w-md mx-auto">
              Lanza un pack desde{" "}
              <a href="/saas/brief-to-launch" className="text-[#0084ff] hover:underline">Lanzar Pack</a>
              {" "}o sincroniza tus entregables usando el botón{" "}
              <strong className="text-white/60">↻ Sincronizar</strong>.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-white/40 text-xs uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Título / Ref</th>
                  <th className="px-4 py-3 text-left">Pack</th>
                  <th className="px-4 py-3 text-left">Tipo</th>
                  <th className="px-4 py-3 text-right">QA</th>
                  <th className="px-4 py-3 text-center">Legal</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-left">Hash</th>
                  <th className="px-4 py-3 text-left">Docs</th>
                </tr>
              </thead>
              <tbody>
                {artifacts.map((a) => {
                  const qaScore = (a.metadata as { qaScore?: number }).qaScore ?? null;
                  const legalPassed = (a.metadata as { legalPassed?: boolean }).legalPassed ?? null;
                  return (
                    <tr
                      key={a.id}
                      className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                      onClick={() => setSelectedArtifact(a)}
                    >
                      <td className="px-4 py-3">
                        <p className="text-white text-xs font-medium truncate max-w-[160px]">
                          {a.title ?? a.deliverableRef.slice(0, 16) + "…"}
                        </p>
                        <p className="text-white/30 text-[10px]">{a.deliverableSource}</p>
                      </td>
                      <td className="px-4 py-3 text-white/50 text-xs">{a.packId ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-white/60">{CONSENT_LABEL[a.consentType]}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {qaScore !== null ? (
                          <span className={`text-xs font-semibold ${qaScore >= 85 ? "text-green-400" : "text-yellow-400"}`}>
                            {qaScore}%
                          </span>
                        ) : <span className="text-white/20">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {legalPassed === true ? "✅" : legalPassed === false ? "❌" : <span className="text-white/20">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <NelvyonDsBadge tone={STATUS_TONE[a.status]}>{a.status}</NelvyonDsBadge>
                      </td>
                      <td className="px-4 py-3 text-white/30 text-xs font-mono">
                        {a.contentHash ? a.contentHash.slice(0, 8) + "…" : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          {a.legalDocUrl && (
                            <a href={a.legalDocUrl} target="_blank" rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[#0084ff] text-xs hover:underline">📄</a>
                          )}
                          {a.qaPdfUrl && (
                            <a href={a.qaPdfUrl} target="_blank" rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[#0084ff] text-xs hover:underline">📊</a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-[#0084ff] px-4 py-2 text-white text-sm shadow-lg">
            {toast}
          </div>
        )}

        {/* Detail modal */}
        {selectedArtifact && (
          <ArtifactModal
            artifact={selectedArtifact}
            onClose={() => setSelectedArtifact(null)}
            onVerify={() => { void handleVerify(selectedArtifact.id); }}
            onRevoke={() => { void handleRevoke(selectedArtifact.id); }}
          />
        )}
      </div>
    </SaasShellLayout>
  );
}
