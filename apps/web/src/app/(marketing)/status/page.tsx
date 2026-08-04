"use client";

// Enlace que usa `<a>` para las rutas servidas por el pack estatico y
// `next/link` para el resto. Ver EnlacePublico.tsx.
import { EnlacePublico as Link } from "@/features/public-web/components/EnlacePublico";
import { useEffect, useState } from "react";

import { BrandSection, BrandTitle } from "@/features/public-web/components/BrandBlocks";
import { BrandPageHero } from "@/features/public-web/components/BrandPageHero";

interface StatusData {
  status: "operational" | "degraded" | "down" | "unknown";
  services: Record<
    string,
    {
      status: "up" | "down" | "degraded";
      latencyMs: number;
      checkedAt: string;
    }
  >;
  incidents: Array<{
    id: string;
    title: string;
    message: string;
    severity: string;
    resolved: boolean;
    created_at: string;
  }>;
  updatedAt: string;
}

const SERVICE_LABELS: Record<string, string> = {
  api: "API Principal",
  database: "Base de datos",
  agents: "Agentes IA",
  payments: "Pagos (Stripe)",
  email: "Email (SES)",
};

const STATUS_CONFIG = {
  operational: { label: "Todos los sistemas operativos", color: "#059669" },
  degraded: { label: "Degradación parcial del servicio", color: "#ca8a04" },
  down: { label: "Interrupción del servicio", color: "#dc2626" },
  unknown: { label: "Estado desconocido", color: "#6b7c93" },
};

const SERVICE_STATUS_CONFIG = {
  up: { label: "Operativo", color: "#059669" },
  degraded: { label: "Degradado", color: "#ca8a04" },
  down: { label: "Caído", color: "#dc2626" },
};

export default function StatusPage() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    function load() {
      fetch("/api/status")
        .then((r) => r.json())
        .then((d: StatusData) => setData(d))
        .catch(() => setData(null))
        .finally(() => setLoading(false));
    }
    load();
    const id = setInterval(() => {
      fetch("/api/status")
        .then((r) => r.json())
        .then((d: StatusData) => setData(d))
        .catch(() => {});
    }, 60_000);
    return () => clearInterval(id);
  }, []);

  const overall = data ? STATUS_CONFIG[data.status] : STATUS_CONFIG.unknown;

  return (
    <>
      <BrandPageHero
        eyebrow="Operaciones"
        title="Estado del sistema"
        description="Estado de servicios NELVYON. Datos en vivo desde /api/status cuando está disponible."
        primaryCta={{ label: "Volver al inicio", href: "/" }}
        secondaryCta={{ label: "Contactar", href: "/contacto" }}
      />

      <BrandSection>
        <div className="text-center mb-40">
          {loading ? (
            <p style={{ color: "#6b7c93" }}>Cargando estado…</p>
          ) : (
            <p style={{ color: overall.color, fontWeight: 600, fontSize: 18 }}>{overall.label}</p>
          )}
        </div>

        <div style={{ maxWidth: 640, margin: "0 auto", borderRadius: 16, border: "1px solid #E0E0E0", overflow: "hidden", background: "#fff" }}>
          {loading
            ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ height: 56, borderBottom: "1px solid #E0E0E0", background: "#F4F7FF" }} />
              ))
            : Object.entries(data?.services ?? {}).map(([key, svc], i, arr) => {
                const cfg = SERVICE_STATUS_CONFIG[svc.status];
                return (
                  <div
                    key={key}
                    className="d-flex justify-content-between align-items-center"
                    style={{
                      padding: "16px 20px",
                      borderBottom: i < arr.length - 1 ? "1px solid #E0E0E0" : undefined,
                    }}
                  >
                    <span style={{ fontWeight: 600 }}>{SERVICE_LABELS[key] ?? key}</span>
                    <span style={{ color: cfg.color, fontSize: 14 }}>
                      {cfg.label}
                      {svc.latencyMs > 0 ? ` · ${svc.latencyMs}ms` : ""}
                    </span>
                  </div>
                );
              })}
        </div>

        {(data?.incidents ?? []).length > 0 ? (
          <div className="mt-40" style={{ maxWidth: 640, margin: "40px auto 0" }}>
            <BrandTitle title="Incidentes recientes" />
            {data!.incidents.map((inc) => (
              <article
                key={inc.id}
                style={{
                  padding: 20,
                  borderRadius: 12,
                  border: "1px solid #E0E0E0",
                  marginBottom: 12,
                  background: "#fff",
                }}
              >
                <div className="d-flex justify-content-between gap-2 mb-2">
                  <strong>{inc.title}</strong>
                  <span style={{ fontSize: 12, color: inc.resolved ? "#059669" : "#dc2626" }}>
                    {inc.resolved ? "Resuelto" : "Activo"}
                  </span>
                </div>
                <p className="mb-0" style={{ color: "#484848", fontSize: 14 }}>
                  {inc.message}
                </p>
              </article>
            ))}
          </div>
        ) : null}

        {data?.updatedAt ? (
          <p className="text-center mt-4" style={{ fontSize: 12, color: "#6b7c93" }}>
            Actualizado: {new Date(data.updatedAt).toLocaleString("es-ES")}
          </p>
        ) : null}

        <div className="text-center mt-40">
          <Link href="/recursos" className="th-btn2 style5">
            Centro de recursos
          </Link>
        </div>
      </BrandSection>
    </>
  );
}
