"use client";

/**
 * /saas/certificados sobre `(cms)/content` de W3CRM, con las piezas ya
 * portadas. Mapeo: emitidos y pendientes -> `W3crmContentBox` +
 * `W3crmDataTable`; iniciales del alumno -> `W3crmAvatar`; contadores ->
 * `W3crmKpiTile`. Sin componentes nuevos.
 *
 * Inventario: sin `data-testid` y sin spec de UI dedicado. `launch.spec.ts:37`
 * solo comprueba que `/api/saas/certificados` responde; ningún spec hace
 * aserciones de texto ni de rol sobre esta pantalla.
 *
 * Lógica de NELVYON intacta: `GET /api/saas/certificados` con su mapeo de
 * `issuedAt` a `completedAt` y el `issued: true` implícito de todo lo que
 * devuelve la lista; la emisión secuencial —un `POST { enrollment_id }` por
 * pendiente, contando fallos para distinguir éxito total de parcial—; el salto
 * automático a la pestaña de emitidos solo cuando no hubo fallos; y el
 * recuento de cursos distintos con certificado.
 */
import { useCallback, useEffect, useState } from "react";

import { SaasW3crmShell } from "@/features/saas-w3crm/components/SaasW3crmShell";
import { W3crmPageTitle } from "@/features/saas-w3crm/components/W3crmPageTitle";
import { W3crmAvatar, W3crmEmptyState, W3crmKpiTile } from "@/features/saas-w3crm/components/W3crmUi";
import { W3crmCargando, W3crmContentBox, W3crmDataTable } from "@/features/saas-w3crm/components/W3crmContentBox";

interface Certificate {
  id: string;
  recipientName: string;
  recipientEmail: string;
  courseName: string;
  completedAt: string;
  verificationCode: string;
  issued: boolean;
  certificateUrl: string | null;
}

interface PendingCert {
  enrollmentId: string;
  recipientName: string;
  recipientEmail: string;
  courseName: string;
  completedAt: string | null;
}

/** Una fecha corrupta pintaba "Invalid Date". */
function fecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-ES");
}
function txt(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export default function SaasCertificadosPage() {
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [pending, setPending] = useState<PendingCert[]>([]);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [tab, setTab] = useState<"certs" | "pending">("certs");
  const [error, setError] = useState<string | null>(null);
  const [issueNotice, setIssueNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/saas/certificados");
      if (!res.ok) throw new Error(`Error al cargar certificados (${res.status})`);
      const d = (await res.json().catch(() => ({}))) as {
        certificates?: Array<{
          id: string;
          recipientName: string;
          recipientEmail: string;
          courseName: string;
          issuedAt: string;
          verificationCode: string;
          certificateUrl: string | null;
        }>;
        pending?: PendingCert[];
      };
      // Colecciones no-array reventaban el `.map`.
      const lista = Array.isArray(d.certificates) ? d.certificates : [];
      setCerts(
        lista.map((c) => ({
          id: c.id,
          recipientName: c.recipientName,
          recipientEmail: c.recipientEmail,
          courseName: c.courseName,
          completedAt: c.issuedAt,
          verificationCode: c.verificationCode,
          issued: true,
          certificateUrl: c.certificateUrl,
        })),
      );
      setPending(Array.isArray(d.pending) ? d.pending : []);
    } catch (err) {
      setCerts([]);
      setPending([]);
      setError(err instanceof Error ? err.message : "Error al cargar certificados");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function issuePending() {
    if (pending.length === 0) return;
    setIssuing(true);
    setIssueNotice(null);
    setError(null);
    let failures = 0;
    try {
      for (const p of pending) {
        const res = await fetch("/api/saas/certificados", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enrollment_id: p.enrollmentId }),
        });
        if (!res.ok) failures += 1;
      }
      await load();
      if (failures > 0) {
        setIssueNotice(`Emitidos parcialmente: ${failures} de ${pending.length} fallaron.`);
      } else {
        setIssueNotice("Certificados pendientes emitidos.");
        setTab("certs");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al emitir certificados");
    } finally {
      setIssuing(false);
    }
  }

  const cursosConCertificado = new Set(certs.map((c) => txt(c.courseName)).filter(Boolean)).size;

  return (
    <SaasW3crmShell>
      <W3crmPageTitle mainTitle="Certificados" parentTitle="Gestión" pageTitle="Certificados" />
      <div className="container-fluid">
        <div className="row">
          <div className="col-xl-4 col-sm-6"><W3crmKpiTile label="Certificados emitidos" value={certs.length} accent /></div>
          <div className="col-xl-4 col-sm-6"><W3crmKpiTile label="Pendientes de emitir" value={pending.length} /></div>
          <div className="col-xl-4 col-sm-6"><W3crmKpiTile label="Cursos con certificado" value={cursosConCertificado} /></div>

          <div className="col-xl-12">
            <p className="fs-14 text-muted">Certificados de finalización emitidos desde el LMS</p>

            {error ? (
              <div className="alert alert-danger alert-dismissible fade show" role="alert">
                {error}
                <button type="button" className="btn-close" aria-label="Cerrar" onClick={() => setError(null)} />
              </div>
            ) : null}
            {issueNotice ? (
              <div className="alert alert-primary" role="status">{issueNotice}</div>
            ) : null}

            <ul className="nav nav-tabs mb-3">
              {(["certs", "pending"] as const).map((t) => (
                <li className="nav-item" key={t}>
                  <button type="button" className={`nav-link ${tab === t ? "active" : ""}`}
                    aria-pressed={tab === t} onClick={() => setTab(t)}>
                    {t === "certs" ? `Emitidos (${certs.length})` : `Pendientes (${pending.length})`}
                  </button>
                </li>
              ))}
            </ul>

            {tab === "certs" && (
              <W3crmContentBox titulo="Certificados emitidos" icono="fa-solid fa-award">
                {loading ? (
                  <W3crmCargando texto="Cargando certificados…" />
                ) : certs.length === 0 ? (
                  <W3crmEmptyState
                    title="Sin certificados emitidos"
                    description="Completa matriculaciones en LMS y emite certificados desde la pestaña Pendientes."
                  />
                ) : (
                  <W3crmDataTable
                    filas={certs}
                    etiqueta="certificados"
                    wrapperId="cert_emitidos_wrapper"
                    porPagina={10}
                    columnas={[
                      { titulo: "Alumno" },
                      { titulo: "Curso" },
                      { titulo: "Emitido" },
                      { titulo: "Verificación" },
                      { titulo: "Documento", alFinal: true },
                    ]}
                    render={(cert) => (
                      <tr key={cert.id}>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            {/* `recipientName[0]` reventaba con nombre nulo. */}
                            <W3crmAvatar seed={cert.id} label={txt(cert.recipientName)} />
                            <span>
                              <span className="fw-bold d-block">{txt(cert.recipientName) || "—"}</span>
                              <span className="text-muted fs-12">{txt(cert.recipientEmail) || "—"}</span>
                            </span>
                          </div>
                        </td>
                        <td>{txt(cert.courseName) || "—"}</td>
                        <td>{fecha(cert.completedAt)}</td>
                        <td><code className="fs-12">{txt(cert.verificationCode) || "—"}</code></td>
                        <td className="text-end">
                          {cert.certificateUrl ? (
                            <a className="btn btn-primary light btn-sm" href={cert.certificateUrl}
                              target="_blank" rel="noreferrer">
                              Ver / PDF
                            </a>
                          ) : (
                            <span className="badge badge-success">Emitido</span>
                          )}
                        </td>
                      </tr>
                    )}
                  />
                )}
              </W3crmContentBox>
            )}

            {tab === "pending" && (
              <W3crmContentBox
                titulo="Pendientes de emitir"
                icono="fa-solid fa-hourglass-half"
                acciones={
                  pending.length > 0 ? (
                    <button type="button" className="btn btn-primary btn-sm me-2" disabled={issuing}
                      onClick={() => void issuePending()}>
                      {issuing ? "Emitiendo…" : `Emitir ${pending.length} pendientes`}
                    </button>
                  ) : undefined
                }
              >
                {loading ? (
                  <W3crmCargando texto="Cargando pendientes…" />
                ) : pending.length === 0 ? (
                  <W3crmEmptyState
                    title="No hay pendientes"
                    description="Todas las matriculaciones completadas tienen certificado emitido."
                  />
                ) : (
                  <W3crmDataTable
                    filas={pending}
                    etiqueta="pendientes"
                    wrapperId="cert_pendientes_wrapper"
                    porPagina={10}
                    columnas={[{ titulo: "Alumno" }, { titulo: "Curso" }, { titulo: "Estado", alFinal: true }]}
                    render={(p) => (
                      <tr key={p.enrollmentId}>
                        <td>
                          <span className="fw-bold d-block">{txt(p.recipientName) || "—"}</span>
                          <span className="text-muted fs-12">{txt(p.recipientEmail) || "—"}</span>
                        </td>
                        <td>{txt(p.courseName) || "—"}</td>
                        <td className="text-end"><span className="badge badge-warning">Pendiente</span></td>
                      </tr>
                    )}
                  />
                )}
              </W3crmContentBox>
            )}
          </div>
        </div>
      </div>
    </SaasW3crmShell>
  );
}
