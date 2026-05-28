"use client";

import Link from "next/link";

export function ModulosHome() {
  const modulos = [
    { title: "Dashboard Central", desc: "Vista unificada de campañas, contactos, tareas y métricas principales." },
    { title: "Agente de Ads", desc: "Coordinación de estructura, mensajes y seguimiento operativo de campañas." },
    { title: "Agente de Email", desc: "Secuencias, segmentación y flujos automatizados de email." },
    { title: "CRM Visual", desc: "Pipeline visual para oportunidades, fases comerciales y seguimiento." },
    { title: "Agente de WhatsApp", desc: "Automatización de conversaciones y cualificación integrada con CRM." },
    { title: "Reportes y Dashboards", desc: "Paneles e informes sin depender de hojas de cálculo dispersas." },
  ];

  return (
    <section className="nelvyon-mkt-section" style={{ backgroundColor: "#ffffff" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "24px", marginBottom: "48px" }}>
          <div>
            <p style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#0084fc", marginBottom: "12px" }}>
              Plataforma
            </p>
            <h2 className="fade-in" style={{ fontSize: "clamp(26px, 3.5vw, 40px)", fontWeight: 800, color: "#07122a", margin: 0, lineHeight: 1.15 }}>
              Módulos principales
            </h2>
          </div>
          <Link
            href="/saas"
            style={{ fontSize: "14px", fontWeight: 600, color: "#0084fc", textDecoration: "none" }}
          >
            Ver todos los módulos →
          </Link>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "16px",
          }}
          className="nelvyon-modulos-grid"
        >
          {modulos.map((m) => (
            <div
              key={m.title}
              style={{
                backgroundColor: "#f8faff",
                border: "1px solid #e8eef8",
                borderRadius: "12px",
                padding: "22px",
                transition: "border-color 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "rgba(0,132,252,0.35)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(7,18,42,0.06)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "#e8eef8";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(0,132,252,0.08)",
                  border: "1px solid rgba(0,132,252,0.15)",
                  marginBottom: "16px",
                }}
              />
              <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#07122a", margin: "0 0 8px" }}>{m.title}</h3>
              <p style={{ fontSize: "14px", color: "#5a6a8a", lineHeight: 1.5, margin: 0 }}>{m.desc}</p>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) {
          .nelvyon-modulos-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 520px) {
          .nelvyon-modulos-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
