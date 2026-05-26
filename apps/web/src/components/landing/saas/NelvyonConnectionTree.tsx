"use client";

import { motion } from "framer-motion";

import { BRAND } from "../shared";
import { FadeIn } from "../FadeIn";
import { SectionHeading } from "../ui";

const NODES = [
  {
    id: "marketing",
    label: "Marketing",
    angle: -90,
    subs: ["Email", "Ads", "SEO"],
  },
  {
    id: "ventas",
    label: "Ventas",
    angle: -30,
    subs: ["CRM", "Pipeline", "Presupuestos"],
  },
  {
    id: "comunicacion",
    label: "Comunicación",
    angle: 30,
    subs: ["WhatsApp", "SMS", "Chat"],
  },
  {
    id: "contenido",
    label: "Contenido",
    angle: 90,
    subs: ["Redes", "IA copy", "Vídeo"],
  },
  {
    id: "analytics",
    label: "Analytics",
    angle: 150,
    subs: ["Dashboards", "Informes", "KPIs"],
  },
  {
    id: "auto",
    label: "Automatización",
    angle: 210,
    subs: ["Flujos", "Triggers", "Integraciones"],
  },
] as const;

const R = 140;
const CX = 200;
const CY = 200;

function polar(angleDeg: number, radius: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) };
}

export function NelvyonConnectionTree() {
  return (
    <section className="relative overflow-hidden py-20 md:py-28" style={{ backgroundColor: BRAND.bg }}>
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <FadeIn>
          <SectionHeading
            light
            center
            subtitle="Cada parte de tu negocio habla con las demás sin que tú hagas nada."
            title="Todo conectado. Todo automático."
          />
        </FadeIn>
        <FadeIn delay={0.15}>
          <div className="relative mx-auto mt-12 max-w-[420px] md:max-w-none md:overflow-x-auto">
            <svg
              aria-label="Diagrama de conexión NELVYON"
              className="mx-auto w-full max-w-[500px]"
              viewBox="0 0 400 400"
            >
              {NODES.map((node) => {
                const end = polar(node.angle, R);
                return (
                  <g key={node.id}>
                    <motion.line
                      animate={{ strokeDashoffset: [0, -24] }}
                      stroke="url(#lineGrad)"
                      strokeDasharray="8 6"
                      strokeWidth="2"
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      x1={CX}
                      x2={end.x}
                      y1={CY}
                      y2={end.y}
                    />
                  </g>
                );
              })}
              <defs>
                <linearGradient id="lineGrad" x1="0%" x2="100%" y1="0%" y2="0%">
                  <stop offset="0%" stopColor={BRAND.blue} />
                  <stop offset="100%" stopColor={BRAND.cyan} />
                </linearGradient>
              </defs>
              <motion.circle
                animate={{ scale: [1, 1.08, 1], opacity: [0.85, 1, 0.85] }}
                cx={CX}
                cy={CY}
                fill="url(#coreGrad)"
                r="52"
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              />
              <defs>
                <radialGradient id="coreGrad" cx="35%" cy="35%">
                  <stop offset="0%" stopColor="#00CFFF" />
                  <stop offset="60%" stopColor={BRAND.blue} />
                  <stop offset="100%" stopColor="#003d99" />
                </radialGradient>
              </defs>
              <text
                fill="white"
                fontSize="11"
                fontWeight="700"
                textAnchor="middle"
                x={CX}
                y={CY + 4}
              >
                NELVYON
              </text>
              {NODES.map((node) => {
                const pos = polar(node.angle, R);
                return (
                  <g key={`n-${node.id}`}>
                    <circle cx={pos.x} cy={pos.y} fill={BRAND.card} r="36" stroke={BRAND.cardBorder} strokeWidth="1" />
                    <text fill="white" fontSize="9" fontWeight="600" textAnchor="middle" x={pos.x} y={pos.y + 3}>
                      {node.label}
                    </text>
                    {node.subs.map((sub, i) => {
                      const subPos = polar(node.angle, R + 38 + i * 14);
                      return (
                        <g key={sub}>
                          <circle cx={subPos.x} cy={subPos.y} fill="#0A0A0A" r="14" stroke="rgba(255,255,255,0.1)" />
                          <text fill={BRAND.textDim} fontSize="6" textAnchor="middle" x={subPos.x} y={subPos.y + 2}>
                            {sub}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                );
              })}
            </svg>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
