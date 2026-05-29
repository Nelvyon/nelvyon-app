"use client";

import Link from "next/link";

const MODULOS = [
  { title: "Dashboard Central", desc: "Vista unificada de operación." },
  { title: "Agente de Ads", desc: "Campañas y seguimiento operativo." },
  { title: "Agente de Email", desc: "Secuencias y flujos automatizados." },
  { title: "CRM Visual", desc: "Pipeline y fases comerciales." },
  { title: "Agente de WhatsApp", desc: "Conversaciones integradas con CRM." },
  { title: "Reportes", desc: "Paneles sin hojas dispersas." },
];

export function ModulosHome() {
  return (
    <section className="nelvyon-mkt-section" style={{ backgroundColor: "#ffffff" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            flexWrap: "wrap",
            gap: 20,
            marginBottom: 40,
          }}
        >
          <div>
            <p className="mkt-eyebrow">Plataforma</p>
            <h2 className="mkt-h2 fade-in">Módulos del sistema</h2>
          </div>
          <Link href="/saas" className="mkt-link">
            Ver SaaS →
          </Link>
        </div>
        <div style={{ maxWidth: 720 }}>
          {MODULOS.map((m) => (
            <div key={m.title} className="mkt-row">
              <div>
                <p className="mkt-row__title">{m.title}</p>
                <p className="mkt-row__desc">{m.desc}</p>
              </div>
              <span className="mkt-row__meta">Módulo</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
