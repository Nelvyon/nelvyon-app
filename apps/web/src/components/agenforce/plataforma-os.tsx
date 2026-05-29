"use client";

import { NELVYON_BLUE, NELVYON_NAVY } from "./marketing-brand";

const NODES = [
  { label: "Ads", angle: -90 },
  { label: "CRM", angle: -38 },
  { label: "WhatsApp", angle: 14 },
  { label: "Email", angle: 66 },
  { label: "SEO", angle: 118 },
  { label: "Ecommerce", angle: 170 },
  { label: "Reporting", angle: 222 },
  { label: "Automatización", angle: 274 },
  { label: "Contenido", angle: 326 },
];

const CX = 300;
const CY = 300;
const RADIUS = 210;
const NODE_R = 52;

function polar(angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: CX + RADIUS * Math.cos(rad),
    y: CY + RADIUS * Math.sin(rad),
  };
}

export function PlataformaOs() {
  return (
    <section className="nelvyon-mkt-section--airy nelvyon-os-section" style={{ backgroundColor: NELVYON_NAVY }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ textAlign: "center", maxWidth: 480, margin: "0 auto 48px" }}>
          <p className="mkt-eyebrow" style={{ color: "rgba(0,132,252,0.85)" }}>
            NELVYON OS
          </p>
          <h2 className="mkt-h2 mkt-h2--light fade-in">Infraestructura operativa central</h2>
        </div>

        <div className="nelvyon-os-diagram-wrap">
          <svg
            viewBox="0 0 600 600"
            className="nelvyon-os-diagram"
            role="img"
            aria-label="Diagrama: NELVYON OS conectado con Ads, CRM, WhatsApp, Email, SEO, Ecommerce, Reporting, Automatización y Contenido"
          >
            <defs>
              <radialGradient id="nelvyon-os-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={NELVYON_BLUE} stopOpacity="0.12" />
                <stop offset="100%" stopColor={NELVYON_BLUE} stopOpacity="0" />
              </radialGradient>
            </defs>
            <circle cx={CX} cy={CY} r={RADIUS + 40} fill="url(#nelvyon-os-glow)" />
            {NODES.map((node) => {
              const { x, y } = polar(node.angle);
              return (
                <line
                  key={`line-${node.label}`}
                  x1={CX}
                  y1={CY}
                  x2={x}
                  y2={y}
                  stroke={NELVYON_BLUE}
                  strokeOpacity={0.28}
                  strokeWidth={1}
                  className="nelvyon-os-line"
                />
              );
            })}
            <rect
              x={CX - 72}
              y={CY - 40}
              width={144}
              height={80}
              rx={10}
              fill="rgba(255,255,255,0.04)"
              stroke={NELVYON_BLUE}
              strokeOpacity={0.45}
              strokeWidth={1.5}
            />
            <text x={CX} y={CY - 8} textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize={9} fontWeight={500} letterSpacing="0.14em">
              NÚCLEO
            </text>
            <text x={CX} y={CY + 16} textAnchor="middle" fill="#ffffff" fontSize={17} fontWeight={600}>
              NELVYON OS
            </text>
            {NODES.map((node) => {
              const { x, y } = polar(node.angle);
              return (
                <g key={node.label} className="nelvyon-os-node" transform={`translate(${x - NODE_R}, ${y - 22})`}>
                  <rect
                    width={NODE_R * 2}
                    height={44}
                    rx={8}
                    fill="rgba(255,255,255,0.04)"
                    stroke="rgba(255,255,255,0.1)"
                    strokeWidth={1}
                    className="nelvyon-os-node__box"
                  />
                  <text
                    x={NODE_R}
                    y={27}
                    textAnchor="middle"
                    fill="rgba(255,255,255,0.82)"
                    fontSize={11}
                    fontWeight={600}
                    letterSpacing="-0.02em"
                  >
                    {node.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </section>
  );
}
