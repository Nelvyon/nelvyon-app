"use client";

import { useCallback, useEffect, useState } from "react";
import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

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

export default function SaasCertificadosPage() {
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [pending, setPending] = useState<PendingCert[]>([]);
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState(false);
  const [tab, setTab] = useState<"certs" | "pending">("certs");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/saas/certificados");
      if (!res.ok) throw new Error("Error al cargar certificados");
      const d = (await res.json()) as {
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
      setCerts(
        (d.certificates ?? []).map((c) => ({
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
      setPending(d.pending ?? []);
    } catch {
      setCerts([]);
      setPending([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function issuePending() {
    if (pending.length === 0) return;
    setIssuing(true);
    try {
      for (const p of pending) {
        await fetch("/api/saas/certificados", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enrollment_id: p.enrollmentId }),
        });
      }
      await load();
      setTab("certs");
    } finally {
      setIssuing(false);
    }
  }

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="lms" />}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <NelvyonDsSectionHeader
          title="Certificados"
          subtitle="Certificados de finalización emitidos desde el LMS"
        />
        {pending.length > 0 && (
          <NelvyonDsButton onClick={() => void issuePending()} disabled={issuing}>
            {issuing ? "Emitiendo…" : `↗ Emitir ${pending.length} pendientes`}
          </NelvyonDsButton>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Certificados emitidos", value: certs.length },
          { label: "Pendientes de emitir", value: pending.length },
          { label: "Cursos con certificado", value: new Set(certs.map((c) => c.courseName)).size },
        ].map(({ label, value }) => (
          <NelvyonDsCard key={label} className="p-4">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
          </NelvyonDsCard>
        ))}
      </div>

      <div className="flex gap-2">
        {(["certs", "pending"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${tab === t ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:text-foreground"}`}
          >
            {t === "certs" ? `Emitidos (${certs.length})` : `Pendientes (${pending.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <NelvyonDsCard className="p-8 text-center text-sm text-muted-foreground">Cargando…</NelvyonDsCard>
      ) : tab === "certs" ? (
        certs.length === 0 ? (
          <NelvyonDsCard className="p-16 text-center">
            <p className="text-4xl">🎓</p>
            <p className="mt-4 text-lg font-semibold text-foreground">Sin certificados emitidos</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Completa matriculaciones en LMS y emite certificados desde la pestaña Pendientes.
            </p>
          </NelvyonDsCard>
        ) : (
          <div className="space-y-3">
            {certs.map((cert) => (
              <NelvyonDsCard key={cert.id} className="p-4">
                <div className="flex flex-wrap items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xl font-bold text-primary">
                    {cert.recipientName[0]}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-foreground">{cert.recipientName}</p>
                      <NelvyonDsBadge tone="success">Emitido</NelvyonDsBadge>
                    </div>
                    <p className="text-sm text-muted-foreground">{cert.courseName}</p>
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span>{cert.recipientEmail}</span>
                      <span>
                        Emitido: {new Date(cert.completedAt).toLocaleDateString("es-ES")}
                      </span>
                      <span className="font-mono">{cert.verificationCode}</span>
                    </div>
                  </div>
                  {cert.certificateUrl && (
                    <NelvyonDsButton variant="ghost" className="text-xs" asChild>
                      <a href={cert.certificateUrl} target="_blank" rel="noreferrer">
                        Ver / PDF
                      </a>
                    </NelvyonDsButton>
                  )}
                </div>
              </NelvyonDsCard>
            ))}
          </div>
        )
      ) : pending.length === 0 ? (
        <NelvyonDsCard className="p-16 text-center">
          <p className="text-4xl">✓</p>
          <p className="mt-4 text-lg font-semibold text-foreground">No hay pendientes</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Todas las matriculaciones completadas tienen certificado emitido.
          </p>
        </NelvyonDsCard>
      ) : (
        <div className="space-y-3">
          {pending.map((p) => (
            <NelvyonDsCard key={p.enrollmentId} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-foreground">{p.recipientName}</p>
                  <p className="text-sm text-muted-foreground">{p.courseName}</p>
                  <p className="text-xs text-muted-foreground">{p.recipientEmail}</p>
                </div>
                <NelvyonDsBadge tone="warning">Pendiente</NelvyonDsBadge>
              </div>
            </NelvyonDsCard>
          ))}
        </div>
      )}
    </SaasShellLayout>
  );
}
