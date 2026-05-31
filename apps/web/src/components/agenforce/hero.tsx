"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "motion/react";

import { Container } from "./container";
import { ModuleScreen } from "./module-screens";
import { DottedGlowBackground } from "./ui/dotted-glow-background";

function HeroScrollCard({
  rotate,
  translate,
  children,
}: {
  rotate: MotionValue<number>;
  translate: MotionValue<number>;
  children: ReactNode;
}) {
  return (
    <motion.div
      className="nelvyon-hero-v3__card"
      style={{ rotateX: rotate, translateY: translate }}
    >
      <div className="nelvyon-hero-v3__beam" aria-hidden />
      <div className="nelvyon-hero-v3__card-inner">{children}</div>
      <div className="nelvyon-hero-v3__card-fade" aria-hidden />
    </motion.div>
  );
}

export const Hero = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ["start start", "end start"] });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth <= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const rotate = useTransform(scrollYProgress, [0, 0.45], [isMobile ? 8 : 18, 0]);
  const translate = useTransform(scrollYProgress, [0, 0.5], [0, isMobile ? 24 : 48]);

  return (
    <section ref={containerRef} className="nelvyon-hero nelvyon-hero--v3" aria-labelledby="home-hero-title">
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
      <Container className="nelvyon-hero-v3__copy-wrap">
        <p className="mkt-eyebrow fade-in nelvyon-hero-v3__eyebrow">NELVYON</p>
        <h1 id="home-hero-title" className="mkt-h1 fade-in nelvyon-hero-v3__title">
          Plataforma empresarial para{" "}
          <span className="nelvyon-text-accent">centralizar marketing, ventas y operación</span>
        </h1>
        <p className="nelvyon-hero-subtitle mkt-lead--light fade-in nelvyon-hero-v3__subtitle">
          CRM, campañas, workflows, comunicación y reporting en un entorno operativo diseñado para equipos que
          necesitan control, trazabilidad y ejecución sin herramientas dispersas.
        </p>
        <div className="nelvyon-hero-ctas nelvyon-hero-v3__ctas fade-in">
          <a href="/contacto" className="mkt-btn nelvyon-btn-primary">
            Solicitar información
          </a>
          <a href="/saas" className="mkt-btn nelvyon-btn-ghost">
            Ver SaaS
          </a>
        </div>
      </Container>

      <div className="nelvyon-hero-v3__stage" style={{ perspective: "1200px" }}>
        <HeroScrollCard rotate={rotate} translate={translate}>
          <ModuleScreen module="CRM" flat />
        </HeroScrollCard>
      </div>
    </section>
  );
};
