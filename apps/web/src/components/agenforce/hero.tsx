import React from "react";
import { Container } from "./container";
import { Button } from "./ui/button";
import Link from "next/link";
import { GradientDivider } from "./gradient-divider";
export const Hero = () => {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        background: "linear-gradient(175deg, #07122a 0%, #0b1e44 30%, #0e3a7a 58%, #1a7fc4 80%, #4db8e8 94%, #ffffff 100%)",
        paddingTop: "80px",
        paddingBottom: "0",
      }}
    >
      <Container>
        {/* Badge */}
        <div className="flex justify-center mb-8">
          <span style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.20)",
            borderRadius: "50px", padding: "8px 20px", fontSize: "13px", fontWeight: 600,
            color: "#a8dff5", letterSpacing: "0.02em"
          }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#4db8e8", display: "inline-block" }} />
            La plataforma todo-en-uno para agencias y negocios
          </span>
        </div>
        {/* H1 */}
        <h1 style={{
          textAlign: "center", fontSize: "clamp(36px, 5.5vw, 68px)", fontWeight: 800,
          color: "#ffffff", lineHeight: 1.08, letterSpacing: "-0.03em", margin: "0 0 16px 0"
        }}>
          El sistema operativo<br />de tu negocio
        </h1>
        {/* Eslogan */}
        <p style={{
          textAlign: "center", fontSize: "clamp(15px, 1.8vw, 19px)", fontWeight: 500,
          color: "#a8dff5", margin: "0 0 20px 0", fontStyle: "italic"
        }}>
          Donde nace tu imperio, crece tu marca y se impone tu legado
        </p>
        {/* Subtítulo */}
        <p style={{
          textAlign: "center", fontSize: "clamp(14px, 1.5vw, 17px)", color: "rgba(255,255,255,0.72)",
          maxWidth: "600px", margin: "0 auto 44px auto", lineHeight: 1.6
        }}>
          Capta leads, cierra ventas y escala tu agencia — todo ejecutado por agentes expertos dentro de una sola plataforma.
        </p>
        {/* CTAs */}
        <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap", marginBottom: "40px" }}>
          <a href="/registro" style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            height: "52px", padding: "0 32px", borderRadius: "50px",
            background: "#ffffff", color: "#07122a", fontSize: "15px", fontWeight: 700,
            textDecoration: "none", boxShadow: "0 4px 20px rgba(0,0,0,0.25)"
          }}>
            Empieza gratis 14 días
          </a>
          <a href="/demo" style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            height: "52px", padding: "0 32px", borderRadius: "50px",
            background: "transparent", border: "2px solid rgba(255,255,255,0.40)",
            color: "#ffffff", fontSize: "15px", fontWeight: 700, textDecoration: "none"
          }}>
            Ver demo →
          </a>
        </div>
        {/* Dashboard mock */}
        <div style={{
          maxWidth: "1040px", margin: "0 auto",
          borderRadius: "16px 16px 0 0", overflow: "hidden",
          boxShadow: "0 -8px 80px rgba(7,18,42,0.5), 0 0 0 1px rgba(255,255,255,0.08)"
        }}>
          {/* Top bar */}
          <div style={{ background: "#0d1b3e", padding: "10px 16px", display: "flex", alignItems: "center", gap: "8px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#ff5f57" }} />
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#febc2e" }} />
            <div style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#28c840" }} />
            <div style={{ flex: 1, height: "22px", background: "rgba(255,255,255,0.06)", borderRadius: "6px", margin: "0 16px" }} />
          </div>
          {/* Dashboard interior */}
          <div style={{ display: "flex", background: "#0a1628", minHeight: "300px" }}>
            {/* Sidebar */}
            <div style={{ width: "200px", flexShrink: 0, background: "#071020", borderRight: "1px solid rgba(255,255,255,0.06)", padding: "20px 0" }}>
              <div style={{ padding: "0 16px 20px 16px", display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "28px", height: "28px", borderRadius: "6px", background: "linear-gradient(135deg, #1a7fc4, #4db8e8)" }} />
                <span style={{ color: "#ffffff", fontWeight: 700, fontSize: "13px" }}>NELVYON</span>
              </div>
              {["Dashboard", "CRM", "Campañas", "Automatizaciones", "Email", "Pagos", "Analíticas", "Webs"].map((item, i) => (
                <div key={item} style={{
                  padding: "9px 16px", display: "flex", alignItems: "center", gap: "10px",
                  background: i === 0 ? "rgba(26,127,196,0.18)" : "transparent",
                  borderLeft: i === 0 ? "2px solid #1a7fc4" : "2px solid transparent"
                }}>
                  <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: i === 0 ? "#4db8e8" : "rgba(255,255,255,0.20)", flexShrink: 0 }} />
                  <span style={{ color: i === 0 ? "#ffffff" : "rgba(255,255,255,0.45)", fontSize: "12px", fontWeight: i === 0 ? 600 : 400 }}>{item}</span>
                </div>
              ))}
            </div>
            {/* Main */}
            <div style={{ flex: 1, padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ color: "#ffffff", fontSize: "16px", fontWeight: 700 }}>Dashboard NELVYON</div>
                  <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "12px", marginTop: "2px" }}>Mayo 2026 — En directo</div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
                {[
                  { label: "Leads este mes", value: "2,847", change: "+18%" },
                  { label: "Ingresos", value: "€38,420", change: "+24%" },
                  { label: "Tasa cierre", value: "34.2%", change: "+5%" },
                  { label: "Clientes activos", value: "142", change: "+12" },
                ].map((kpi) => (
                  <div key={kpi.label} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "10px", padding: "14px" }}>
                    <div style={{ color: "rgba(255,255,255,0.45)", fontSize: "10px", marginBottom: "6px" }}>{kpi.label}</div>
                    <div style={{ color: "#ffffff", fontSize: "18px", fontWeight: 700 }}>{kpi.value}</div>
                    <div style={{ color: "#28c840", fontSize: "10px", fontWeight: 600, marginTop: "4px" }}>{kpi.change}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: "12px", flex: 1 }}>
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "16px" }}>
                  <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "11px", marginBottom: "12px" }}>Ingresos — últimos 6 meses</div>
                  <div style={{ display: "flex", alignItems: "flex-end", gap: "6px", height: "80px" }}>
                    {[40, 55, 48, 70, 65, 90].map((h, i) => (
                      <div key={i} style={{ flex: 1, height: `${h}%`, borderRadius: "4px 4px 0 0", background: i === 5 ? "linear-gradient(180deg, #4db8e8, #1a7fc4)" : "rgba(26,127,196,0.25)" }} />
                    ))}
                  </div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "10px", padding: "16px" }}>
                  <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "11px", marginBottom: "12px" }}>Pipeline</div>
                  {[["Nuevo lead", 100], ["Contactado", 65], ["Propuesta", 38], ["Negociación", 19], ["Cerrado", 10]].map(([s, p]) => (
                    <div key={s as string} style={{ marginBottom: "8px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "3px" }}>
                        <span style={{ color: "rgba(255,255,255,0.55)", fontSize: "10px" }}>{s}</span>
                      </div>
                      <div style={{ height: "4px", background: "rgba(255,255,255,0.08)", borderRadius: "2px" }}>
                        <div style={{ width: `${p}%`, height: "100%", background: "#1a7fc4", borderRadius: "2px" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
      <GradientDivider />
    </section>
  );
};
