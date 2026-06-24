"use client";

import { useState } from "react";
import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { SaasShellLayout } from "@/features/saas-shell/components/SaasShellLayout";
import { SaasSidebar } from "@/features/saas-shell/components/SaasSidebar";

interface Certificate {
  id: string;
  recipientName: string;
  recipientEmail: string;
  courseName: string;
  completedAt: string;
  score: number;
  verificationCode: string;
  issued: boolean;
}

interface CertTemplate {
  id: string;
  name: string;
  primaryColor: string;
  logoPosition: "top" | "bottom";
  signatureName: string;
  signatureTitle: string;
}

const DEFAULT_TEMPLATE: CertTemplate = {
  id: "t1", name: "Clásico Premium", primaryColor: "#6366f1", logoPosition: "top", signatureName: "Daniel Castedo", signatureTitle: "CEO, Nelvyon",
};

function CertPreview({ cert, template, brandName }: { cert: Certificate; template: CertTemplate; brandName: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border-4 p-8 text-center" style={{ borderColor: template.primaryColor, backgroundColor: "#fafafa", minHeight: 300 }}>
      <div className="absolute inset-0 opacity-5" style={{ backgroundImage: `repeating-linear-gradient(45deg, ${template.primaryColor} 0, ${template.primaryColor} 1px, transparent 0, transparent 50%)`, backgroundSize: "20px 20px" }} />
      <div className="relative">
        {template.logoPosition === "top" && <div className="mb-4 flex justify-center"><div className="flex h-12 w-12 items-center justify-center rounded-xl text-xl font-bold text-white" style={{ backgroundColor: template.primaryColor }}>N</div></div>}
        <p className="text-xs font-semibold uppercase tracking-[0.3em]" style={{ color: template.primaryColor }}>{brandName}</p>
        <h2 className="mt-2 text-2xl font-bold text-gray-800">CERTIFICADO</h2>
        <p className="text-xs text-gray-500 mt-0.5">de finalización</p>
        <p className="mt-4 text-sm text-gray-500">Otorgado a</p>
        <p className="mt-1 text-2xl font-bold text-gray-800">{cert.recipientName}</p>
        <p className="mt-3 text-sm text-gray-500">por completar con éxito</p>
        <p className="mt-1 text-base font-semibold text-gray-700">{cert.courseName}</p>
        <div className="mx-auto mt-4 flex w-fit items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold text-white" style={{ backgroundColor: template.primaryColor }}>
          Puntuación: {cert.score}/100
        </div>
        <div className="mt-6 flex justify-center gap-16">
          <div className="text-center">
            <div className="h-px w-24 bg-gray-300 mb-1" />
            <p className="text-xs font-medium text-gray-700">{template.signatureName}</p>
            <p className="text-[10px] text-gray-400">{template.signatureTitle}</p>
          </div>
          <div className="text-center">
            <div className="h-px w-24 bg-gray-300 mb-1" />
            <p className="text-xs font-medium text-gray-700">{new Date(cert.completedAt).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}</p>
            <p className="text-[10px] text-gray-400">Fecha de emisión</p>
          </div>
        </div>
        <p className="mt-4 text-[10px] text-gray-400">Código de verificación: <span className="font-mono">{cert.verificationCode}</span></p>
        {template.logoPosition === "bottom" && <div className="mt-4 flex justify-center"><div className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white" style={{ backgroundColor: template.primaryColor }}>N</div></div>}
      </div>
    </div>
  );
}

export default function SaasCertificadosPage() {
  const [certs] = useState<Certificate[]>([]);
  const [templates] = useState<CertTemplate[]>([]);
  const [selectedTemplate] = useState<CertTemplate>(DEFAULT_TEMPLATE);
  const [previewCert] = useState<Certificate | null>(null);
  const [tab, setTab] = useState<"certs" | "templates">("certs");
  const [brandName] = useState("Nelvyon Academy");

  const pendingCount = certs.filter(c => !c.issued).length;

  return (
    <SaasShellLayout sidebar={<SaasSidebar activeId="herramientas" />}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <NelvyonDsSectionHeader title="Certificados" subtitle="Emite y gestiona certificados de finalización para tus cursos LMS" />
              {pendingCount > 0 && <NelvyonDsButton>↗ Emitir {pendingCount} pendientes</NelvyonDsButton>}
            </div>

            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Certificados emitidos", value: certs.filter(c => c.issued).length },
                { label: "Pendientes de emitir", value: pendingCount },
                { label: "Puntuación media", value: certs.length > 0 ? `${Math.round(certs.reduce((s, c) => s + c.score, 0) / certs.length)}/100` : "—" },
              ].map(({ label, value }) => (
                <NelvyonDsCard key={label} className="p-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
                </NelvyonDsCard>
              ))}
            </div>

            <div className="flex gap-2">
              {(["certs", "templates"] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${tab === t ? "bg-primary text-primary-foreground" : "bg-muted/30 text-muted-foreground hover:text-foreground"}`}>
                  {t === "certs" ? `Certificados (${certs.length})` : "Plantillas"}
                </button>
              ))}
            </div>

            {tab === "certs" ? (
              certs.length === 0 ? (
                <NelvyonDsCard className="p-16 text-center">
                  <p className="text-4xl">🎓</p>
                  <p className="mt-4 text-lg font-semibold text-foreground">Certificados no configurados</p>
                  <p className="mt-2 text-sm text-muted-foreground">Activa el módulo LMS para emitir certificados de finalización.</p>
                </NelvyonDsCard>
              ) : (
                <div className="space-y-3">
                  {certs.map(cert => (
                    <NelvyonDsCard key={cert.id} className="p-4">
                      <div className="flex flex-wrap items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xl font-bold text-primary">{cert.recipientName[0]}</div>
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold text-foreground">{cert.recipientName}</p>
                            <NelvyonDsBadge tone={cert.issued ? "success" : "warning"}>{cert.issued ? "Emitido" : "Pendiente"}</NelvyonDsBadge>
                          </div>
                          <p className="text-sm text-muted-foreground">{cert.courseName}</p>
                          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                            <span>{cert.recipientEmail}</span>
                            <span>Nota: <strong className="text-foreground">{cert.score}/100</strong></span>
                            <span>Completado: {new Date(cert.completedAt).toLocaleDateString("es-ES")}</span>
                            <span className="font-mono">{cert.verificationCode}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {cert.issued && <NelvyonDsButton variant="ghost" className="text-xs">↓ PDF</NelvyonDsButton>}
                          {cert.issued && <NelvyonDsButton variant="ghost" className="text-xs">↗ Email</NelvyonDsButton>}
                        </div>
                      </div>
                    </NelvyonDsCard>
                  ))}
                </div>
              )
            ) : (
              templates.length === 0 ? (
                <NelvyonDsCard className="p-16 text-center">
                  <p className="text-4xl">🖼️</p>
                  <p className="mt-4 text-lg font-semibold text-foreground">Certificados no configurados</p>
                  <p className="mt-2 text-sm text-muted-foreground">No hay plantillas de certificados disponibles.</p>
                </NelvyonDsCard>
              ) : (
                <div className="grid gap-4 sm:grid-cols-3">
                  {templates.map(t => (
                    <div key={t.id}
                      className={`cursor-pointer rounded-2xl border-2 p-1 transition-all ${selectedTemplate.id === t.id ? "border-primary shadow-lg" : "border-border hover:border-primary/40"}`}>
                      <p className="mt-2 px-2 pb-2 text-center text-sm font-medium text-foreground">{t.name}</p>
                    </div>
                  ))}
                </div>
              )
            )}

    </SaasShellLayout>
  );
}
