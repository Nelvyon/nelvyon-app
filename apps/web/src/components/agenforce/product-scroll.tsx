"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "motion/react";

import { ModuleScreen, type ModuleScreenKey } from "./module-screens";

const SCROLL_MODULES: ModuleScreenKey[] = ["CRM", "Workflows", "Campañas", "Reporting"];

export function ProductScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });

  const rotateX = useTransform(scrollYProgress, [0, 0.35, 1], [14, 6, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.4, 1], [0.92, 0.97, 1]);
  const y = useTransform(scrollYProgress, [0, 1], [40, 0]);

  const stage0 = useTransform(scrollYProgress, [0, 0.25, 0.3], [1, 1, 0]);
  const stage1 = useTransform(scrollYProgress, [0.2, 0.3, 0.5, 0.55], [0, 1, 1, 0]);
  const stage2 = useTransform(scrollYProgress, [0.45, 0.55, 0.75, 0.8], [0, 1, 1, 0]);
  const stage3 = useTransform(scrollYProgress, [0.7, 0.8, 1], [0, 1, 1]);

  const opacities = [stage0, stage1, stage2, stage3];

  return (
    <section ref={ref} className="nelvyon-product-scroll" aria-labelledby="product-scroll-title">
      <div className="nelvyon-product-scroll__sticky">
        <div className="nelvyon-section-inner nelvyon-product-scroll__header">
          <p className="mkt-eyebrow">Producto en acción</p>
          <h2 id="product-scroll-title" className="mkt-h2 mkt-h2--display fade-in">
            La plataforma NELVYON, módulo a módulo
          </h2>
          <p className="mkt-lead nelvyon-product-scroll__lead fade-in">
            Interfaz representativa del entorno operativo real. Desplázate para recorrer CRM, workflows, campañas y reporting.
          </p>
        </div>

        <motion.div className="nelvyon-product-scroll__frame-wrap" style={{ rotateX, scale, y }}>
          <div className="nelvyon-product-scroll__device">
            <div className="nelvyon-product-scroll__device-bar" aria-hidden />
            <div className="nelvyon-product-scroll__device-screen">
              {SCROLL_MODULES.map((module, i) => (
                <motion.div key={module} className="nelvyon-product-scroll__stage" style={{ opacity: opacities[i] }}>
                  <ModuleScreen module={module} flat />
                  <p className="nelvyon-product-scroll__stage-label">{module}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="nelvyon-product-scroll__dots" aria-hidden>
          {SCROLL_MODULES.map((module) => (
            <span key={module} className="nelvyon-product-scroll__dot">
              {module}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
