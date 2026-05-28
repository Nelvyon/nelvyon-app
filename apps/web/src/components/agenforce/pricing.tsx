import React from "react";
import { Container } from "./container";
import { IconCircleCheckFilled } from "@tabler/icons-react";
import Link from "next/link";
const plans = [
  {
    name: "Starter",
    price: "97",
    description: "Para agencias que empiezan a automatizar.",
    popular: false,
    steps: ["CRM y Pipeline incluido", "Email marketing automatizado", "Hasta 3 agentes expertos", "Soporte por email", "14 días gratis"],
    cta: "Empezar con Starter",
    href: "/registro",
  },
  {
    name: "Growth",
    price: "297",
    description: "Para agencias en crecimiento que necesitan escalar.",
    popular: true,
    steps: ["Todo lo de Starter", "Hasta 15 agentes expertos", "Meta, Google y TikTok Ads", "Funnels y webs ilimitados", "Soporte prioritario 24h"],
    cta: "Empezar con Growth",
    href: "/registro",
  },
  {
    name: "Elite",
    price: "797",
    description: "Para agencias que quieren dominar su mercado.",
    popular: false,
    steps: ["Todo lo de Growth", "Agentes expertos ilimitados", "White-label completo", "Manager de cuenta dedicado", "SLA garantizado"],
    cta: "Contactar ventas",
    href: "/contacto",
  },
];
export const Pricing = () => {
  return (
    <section id="precios" className="py-12 lg:py-16 bg-white">
      <Container>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <p style={{ fontSize: "13px", fontWeight: 600, color: "#0084fc", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "12px" }}>Precios</p>
          <h2 style={{ fontSize: "clamp(28px, 3.5vw, 44px)", fontWeight: 800, color: "#07122a", letterSpacing: "-0.03em", margin: "0 0 16px 0" }}>
            Precios claros. Sin sorpresas.
          </h2>
          <p style={{ fontSize: "16px", color: "#6b7a99", maxWidth: "500px", margin: "0 auto" }}>
            Elige el plan que se adapta a tu agencia. Cancela cuando quieras.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px", maxWidth: "1100px", margin: "0 auto" }}>
          {plans.map((plan) => (
            <div key={plan.name} style={{
              background: plan.popular ? "#07122a" : "#ffffff",
              border: plan.popular ? "2px solid #0084fc" : "1px solid #e8eef8",
              borderRadius: "20px", padding: "36px", position: "relative",
              boxShadow: plan.popular ? "0 20px 60px rgba(7,18,42,0.3)" : "0 4px 20px rgba(7,18,42,0.06)"
            }}>
              {plan.popular && (
                <div style={{
                  position: "absolute", top: "-14px", left: "50%", transform: "translateX(-50%)",
                  background: "#0084fc", color: "#ffffff", fontSize: "12px", fontWeight: 700,
                  padding: "4px 16px", borderRadius: "50px", whiteSpace: "nowrap"
                }}>
                  Más popular
                </div>
              )}
              <div style={{ marginBottom: "24px" }}>
                <p style={{ fontSize: "13px", fontWeight: 600, color: plan.popular ? "#00d6fe" : "#0084fc", marginBottom: "8px" }}>{plan.name}</p>
                <div style={{ display: "flex", alignItems: "baseline", gap: "4px", marginBottom: "8px" }}>
                  <span style={{ fontSize: "48px", fontWeight: 800, color: plan.popular ? "#ffffff" : "#07122a", letterSpacing: "-0.03em" }}>€{plan.price}</span>
                  <span style={{ fontSize: "16px", color: plan.popular ? "rgba(255,255,255,0.5)" : "#6b7a99" }}>/mes</span>
                </div>
                <p style={{ fontSize: "14px", color: plan.popular ? "rgba(255,255,255,0.6)" : "#6b7a99", lineHeight: 1.5 }}>{plan.description}</p>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px 0", display: "flex", flexDirection: "column", gap: "12px" }}>
                {plan.steps.map((step) => (
                  <li key={step} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <IconCircleCheckFilled style={{ width: "18px", height: "18px", color: plan.popular ? "#00d6fe" : "#0084fc", flexShrink: 0 }} />
                    <span style={{ fontSize: "14px", color: plan.popular ? "rgba(255,255,255,0.85)" : "#07122a" }}>{step}</span>
                  </li>
                ))}
              </ul>
              <a href={plan.href} style={{
                display: "block", textAlign: "center", padding: "14px 24px", borderRadius: "50px",
                background: plan.popular ? "#0084fc" : "transparent",
                border: plan.popular ? "none" : "2px solid #0084fc",
                color: plan.popular ? "#ffffff" : "#0084fc",
                fontSize: "15px", fontWeight: 700, textDecoration: "none",
                transition: "all 0.15s"
              }}>
                {plan.cta}
              </a>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
};
