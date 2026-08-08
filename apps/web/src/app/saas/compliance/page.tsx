"use client";

/**
 * /saas/compliance sobre `(cms)/content` de W3CRM, con las piezas ya portadas.
 * Mapeo: listado de artifacts -> `W3crmContentBox` + `W3crmDataTable`; detalle
 * -> `W3crmModal`; KPIs -> `W3crmKpiTile`. Sin componentes nuevos.
 *
 * CONTRATO — `saas-compliance-vault.spec.ts` exige, y aquí se conserva:
 *   - `getByText("Compliance Vault")` UNA sola vez. `W3crmPageTitle` pinta
 *     `mainTitle` Y `pageTitle`: el segundo NO puede repetirlo, o serían dos
 *     coincidencias permanentes. Por eso `pageTitle="Vault"`, que no contiene
 *     la cadena completa.
 *   - `getByRole("button", { name: /Sincronizar/i })` ÚNICO. Solo hay un botón
 *     de sync, en la cabecera de la caja; ninguna caja se titula con esa
 *     palabra, porque el toggle expone `aria-label="Plegar <título>"`. El
 *     "↻ Sincronizar" del estado vacío es TEXTO de la descripción, no un
 *     botón, así que no suma.
 *   - `getByText("Total")` ÚNICO: es la etiqueta del primer KPI. Ninguna otra
 *     etiqueta, columna ni título repite esa palabra.
 *   - `getByText(/Sin artifacts/i)` en el vacío.
 *   - `getByRole("link", { name: /Compliance/i })` del sidebar: visible porque
 *     el grupo activo (`ia`) es el que contiene ese ítem.
 *
 * Lógica de NELVYON intacta: `GET /api/saas/compliance`,
 * `POST /api/saas/compliance/sync` con su recuento de sincronizados, y
 * `PATCH /api/saas/compliance/[id]` con sus dos acciones (`verify` y `revoke`
 * con su `reason`); el toast de 3 s; el cierre del detalle tras cada acción;
 * la lectura de `qaScore` y `legalPassed` desde `metadata` con su umbral de
 * 85; y los enlaces a documento legal, informe QA y portal.
 */
import { useEffect, useState } from "react";
import Link from "next/link";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmEmptyState, W3crmKpiTile } from "@/features/saas-w3crm/components/W3crmUi";
import {
  W3crmCargando,
  W3crmContentBox,
  W3crmDataTable,
  W3crmModal,
} from "@/features/saas-w3crm/components/W3crmContentBox";
import type { ComplianceArtifact, VaultSummary } from "@nelvyon/saas";

const STATUS_BADGE: Record<string, string> = {
  verified: "badge-success",
  pending: "badge-warning",
  expired: "badge-secondary",
  revoked: "badge-danger",
};

const CONSENT_LABEL: Record<string, string> = {
  gdpr_marketing: "GDPR Marketing",
  gdpr_data_processing: "GDPR Processing",
  sector_disclaimer: "Sector Disclaimer",
  client_approval: "Client Approval",
  qa_certificate: "QA Certificate",
  other: "Other",
};

/** Estados y tipos fuera de catálogo pintaban `undefined`. */
function statusBadge(s: unknown): string { return STATUS_BADGE[String(s ?? "")] ?? "badge-secondary"; }
function consentLabel(c: unknown): string { return CONSENT_LABEL[String(c ?? "")] ?? String(c ?? "—"); }
function num(v: unknown): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}
function opt(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}
function txt(v: unknown): string { return typeof v === "string" ? v : ""; }
/** `metadata` podía llegar nulo y `Object.keys` reventaba. */
function meta(a: ComplianceArtifact): Record<string, unknown> {
  const m = a.metadata as unknown;
  return m && typeof m === "object" ? (m as Record<string, unknown>) : {};
}
/** `deliverableRef`/`contentHash` podían no ser texto y `slice` reventaba. */
function corta(v: unknown, n: number): string {
  const s = txt(v);
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

function ArtifactModal({ artifact, onClose, onVerify, onRevoke }: {
  artifact: ComplianceArtifact;
  onClose: () => void;
  onVerify: () => void;
  onRevoke: () => void;
}) {
  const m = meta(artifact);
  const titulo = txt(artifact.title) || corta(artifact.deliverableRef, 20) || "Artifact";
  return (
    <W3crmModal titulo={titulo} onClose={onClose} size="lg">
      <div className="row">
        <div className="col-sm-6">
          <p className="text-muted fs-12 mb-1">Source</p>
          <p>{txt(artifact.deliverableSource) || "—"}</p>
        </div>
        <div className="col-sm-6">
          <p className="text-muted fs-12 mb-1">Consent Type</p>
          <p>{consentLabel(artifact.consentType)}</p>
        </div>
        <div className="col-sm-6">
          <p className="text-muted fs-12 mb-1">Pack ID</p>
          <p>{txt(artifact.packId) || "—"}</p>
        </div>
        <div className="col-sm-6">
          <p className="text-muted fs-12 mb-1">Estado</p>
          <p><span className={`badge ${statusBadge(artifact.status)}`}>{txt(artifact.status) || "—"}</span></p>
        </div>
      </div>

      {artifact.contentHash ? (
        <div className="mb-3">
          <p className="text-muted fs-12 mb-1">Content Hash (SHA-256)</p>
          <code className="d-block text-break fs-12">{txt(artifact.contentHash)}</code>
        </div>
      ) : null}

      {Object.keys(m).length > 0 && (
        <div className="mb-3">
          <p className="text-muted fs-12 mb-1">Metadata</p>
          <pre className="bg-light border rounded p-3 fs-12 mb-0" style={{ overflowX: "auto" }}>
            {JSON.stringify(m, null, 2)}
          </pre>
        </div>
      )}

      <div className="mb-3">
        {artifact.legalDocUrl ? (
          <a className="btn btn-primary light btn-sm me-1" href={artifact.legalDocUrl}
            target="_blank" rel="noopener noreferrer">Legal Doc</a>
        ) : null}
        {artifact.qaPdfUrl ? (
          <a className="btn btn-primary light btn-sm me-1" href={artifact.qaPdfUrl}
            target="_blank" rel="noopener noreferrer">QA Report</a>
        ) : null}
        {artifact.packRunId ? (
          <a className="btn btn-primary light btn-sm" href={`/portal/deliverables?pack_run_id=${artifact.packRunId}`}
            target="_blank" rel="noopener noreferrer">Portal</a>
        ) : null}
      </div>

      <div className="text-end">
        {artifact.status === "pending" && (
          <button type="button" className="btn btn-primary me-2" onClick={onVerify}>Verificar</button>
        )}
        {artifact.status !== "revoked" && (
          <button type="button" className="btn btn-danger light me-2" onClick={onRevoke}>Revocar</button>
        )}
        <button type="button" className="btn btn-primary light" onClick={onClose}>Cerrar</button>
      </div>
    </W3crmModal>
  );
}

export default function CompliancePage() {
  const [summary, setSummary] = useState<VaultSummary | null>(null);
  const [artifacts, setArtifacts] = useState<ComplianceArtifact[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedArtifact, setSelectedArtifact] = useState<ComplianceArtifact | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 3000);
  }

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/saas/compliance");
      if (res.ok) {
        const d = (await res.json().catch(() => ({}))) as {
          summary?: VaultSummary; artifacts?: ComplianceArtifact[];
        };
        if (d.summary && typeof d.summary === "object") setSummary(d.summary);
        setArtifacts(Array.isArray(d.artifacts) ? d.artifacts : []);
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
        const d = (await res.json().catch(() => ({}))) as { synced?: number };
        showToast(`${num(d.synced)} artifact(s) sincronizados`);
        void load();
      }
    } finally {
      setSyncing(false);
    }
  }

  async function handleVerify(artifactId: string) {
    try {
      const res = await fetch(`/api/saas/compliance/${artifactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify" }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      showToast("Artifact verificado");
      setSelectedArtifact(null);
      void load();
    } catch {
      showToast("Error al verificar artifact");
    }
  }

  async function handleRevoke(artifactId: string) {
    try {
      const res = await fetch(`/api/saas/compliance/${artifactId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revoke", reason: "Revocado manualmente" }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      showToast("Artifact revocado");
      setSelectedArtifact(null);
      void load();
    } catch {
      showToast("Error al revocar artifact");
    }
  }

  return (
    <SaasW3crmShell>
      {/* `pageTitle` NO repite "Compliance Vault": serían dos coincidencias. */}
      <W3crmPageTitle mainTitle="Compliance Vault" parentTitle="Inteligencia" pageTitle="Vault" />
      <div className="container-fluid">
        <div className="row">
          {summary && (
            <>
              {/* "Total" debe ser único en toda la página. */}
              <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Total" value={num(summary.total)} accent /></div>
              <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Pendientes" value={num(summary.pending)} /></div>
              <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Verificados" value={num(summary.verified)} /></div>
              <div className="col-xl-3 col-sm-6"><W3crmKpiTile label="Expiran pronto" value={num(summary.expiringSoon)} /></div>
            </>
          )}

          <div className="col-xl-12">
            <p className="fs-14 text-muted">
              Artifacts legales, QA certificates y audit trail por entregable
            </p>

            {toast && <div className="alert alert-primary" role="status">{toast}</div>}

            {/* Título sin "Sincronizar" ni "Total": ver cabecera. */}
            <W3crmContentBox
              titulo="Artifacts del Vault"
              icono="fa-solid fa-lock"
              acciones={
                <button type="button" className="btn btn-primary btn-sm me-2" disabled={syncing || loading}
                  onClick={() => { void handleSync(); }}>
                  {syncing ? "Sincronizando…" : "↻ Sincronizar"}
                </button>
              }
            >
              {loading ? (
                <W3crmCargando texto="Cargando artifacts…" />
              ) : artifacts.length === 0 ? (
                <>
                  <W3crmEmptyState
                    title="Sin artifacts en el Vault"
                    description="Lanza un pack o sincroniza tus entregables usando el botón ↻ Sincronizar."
                  />
                  <div className="text-center">
                    <Link href="/saas/brief-to-launch" className="btn btn-primary light btn-sm">
                      Ir a lanzar un pack
                    </Link>
                  </div>
                </>
              ) : (
                <W3crmDataTable
                  filas={artifacts}
                  etiqueta="artifacts"
                  wrapperId="compliance_wrapper"
                  porPagina={10}
                  columnas={[
                    { titulo: "Título / Ref" },
                    { titulo: "Pack" },
                    { titulo: "Tipo" },
                    { titulo: "QA" },
                    { titulo: "Legal" },
                    { titulo: "Estado" },
                    { titulo: "Hash" },
                    { titulo: "Detalle", alFinal: true },
                  ]}
                  render={(a) => {
                    const m = meta(a);
                    const qaScore = opt(m.qaScore);
                    const legalPassed = typeof m.legalPassed === "boolean" ? m.legalPassed : null;
                    return (
                      <tr key={a.id}>
                        <td>
                          <span className="fw-bold d-block">
                            {txt(a.title) || corta(a.deliverableRef, 16) || "—"}
                          </span>
                          <span className="text-muted fs-12">{txt(a.deliverableSource) || "—"}</span>
                        </td>
                        <td className="text-muted fs-12">{txt(a.packId) || "—"}</td>
                        <td className="text-muted fs-12">{consentLabel(a.consentType)}</td>
                        <td>
                          {qaScore !== null ? (
                            <span className={qaScore >= 85 ? "text-success fw-bold" : "text-warning fw-bold"}>
                              {qaScore}%
                            </span>
                          ) : <span className="text-muted">—</span>}
                        </td>
                        <td>
                          {legalPassed === true ? (
                            <span className="badge badge-success">OK</span>
                          ) : legalPassed === false ? (
                            <span className="badge badge-danger">KO</span>
                          ) : <span className="text-muted">—</span>}
                        </td>
                        <td><span className={`badge ${statusBadge(a.status)}`}>{txt(a.status) || "—"}</span></td>
                        <td className="text-muted fs-12">
                          <code>{a.contentHash ? corta(a.contentHash, 8) : "—"}</code>
                        </td>
                        <td className="text-end">
                          <button type="button" className="btn btn-primary light btn-sm"
                            aria-label={`Ver detalle de ${txt(a.title) || txt(a.deliverableRef) || a.id}`}
                            onClick={() => setSelectedArtifact(a)}>
                            Ver
                          </button>
                        </td>
                      </tr>
                    );
                  }}
                />
              )}
            </W3crmContentBox>
          </div>
        </div>
      </div>

      {selectedArtifact && (
        <ArtifactModal
          artifact={selectedArtifact}
          onClose={() => setSelectedArtifact(null)}
          onVerify={() => { void handleVerify(selectedArtifact.id); }}
          onRevoke={() => { void handleRevoke(selectedArtifact.id); }}
        />
      )}
    </SaasW3crmShell>
  );
}
