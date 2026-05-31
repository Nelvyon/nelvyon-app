"use client";

import { Container } from "./container";
import { SaasDashboardMock } from "./saas-dashboard-mock";
import { DottedGlowBackground } from "./ui/dotted-glow-background";

export const Hero = () => {
  return (
    <section className="relative overflow-hidden nelvyon-hero">
      <DottedGlowBackground
        className="nelvyon-hero-dots"
        gap={14}
        radius={1.2}
        color="rgba(255,255,255,0.04)"
        glowColor="rgba(0,132,252,0.45)"
        darkColor="rgba(255,255,255,0.04)"
        darkGlowColor="rgba(0,132,252,0.45)"
        opacity={0.85}
        speedMin={0.15}
        speedMax={0.45}
        speedScale={0.6}
      />
      <Container className="nelvyon-hero-container">
        <div className="nelvyon-hero-grid">
          <div className="nelvyon-hero-copy">
            <p className="mkt-eyebrow fade-in" style={{ color: "rgba(255,255,255,0.55)", marginBottom: 16 }}>
              NELVYON
            </p>
            <h1 className="mkt-h1 fade-in">
              Plataforma empresarial para{" "}
              <span className="nelvyon-text-accent">centralizar marketing, ventas y operación</span>
            </h1>
            <p className="nelvyon-hero-subtitle mkt-lead--light fade-in">
              Donde nace tu imperio, crece tu marca y se impone tu legado. CRM, campañas, automatización,
              comunicación y reporting en un entorno diseñado para equipos que escalan con orden.
            </p>
            <div className="nelvyon-hero-ctas">
              <a href="/contacto" className="mkt-btn nelvyon-btn-primary">
                Solicitar información
              </a>
              <a href="/saas" className="mkt-btn nelvyon-btn-ghost">
                Ver SaaS
              </a>
            </div>
          </div>
          <div className="nelvyon-hero-visual">
            <div className="nelvyon-hero-glow" aria-hidden />
            <SaasDashboardMock />
          </div>
        </div>
      </Container>
    </section>
  );
};
