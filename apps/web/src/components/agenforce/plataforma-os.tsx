"use client";

import { NELVYON_BLUE } from "./marketing-brand";

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

const CX = 360;
const CY = 360;
const RADIUS = 248;
const NODE_W = 120;
const NODE_H = 48;

function polar(angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: CX + RADIUS * Math.cos(rad),
    y: CY + RADIUS * Math.sin(rad),
  };
}

export function PlataformaOs() {
  return (
    <section className="nelvyon-mkt-section--airy" style={{ backgroundColor: "#ffffff" }}>
      <div style={{ maxWidth: 1120, margin: "0 auto", padding: "0 24px" }}>
        <div style={{ textAlign: "center", maxWidth: 520, margin: "0 auto 56px" }}>
          <p className="mkt-eyebrow">Plataforma</p>
          <h2 className="mkt-h2 fade-in">Infraestructura operativa central</h2>
          <p className="mkt-lead" style={{ marginTop: 16 }}>
            NELVYON conecta marketing, ventas y automatización desde un núcleo único.
          </p>
        </div>

        <div className="nelvyon-os-diagram-stage">
          <div className="nelvyon-os-diagram-wrap">
            <svg
              viewBox="0 0 720 720"
              className="nelvyon-os-diagram"
              role="img"
              aria-label="Diagrama: NELVYON en el centro conectado con Ads, CRM, WhatsApp, Email, SEO, Ecommerce, Reporting, Automatización y Contenido"
            >
              <defs>
                <radialGradient id="nelvyon-os-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={NELVYON_BLUE} stopOpacity="0.18" />
                  <stop offset="100%" stopColor={NELVYON_BLUE} stopOpacity="0" />
                </radialGradient>
                <filter id="nelvyon-line-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <circle cx={CX} cy={CY} r={RADIUS + 52} fill="url(#nelvyon-os-glow)" />
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
                    strokeOpacity={0.38}
                    strokeWidth={1.5}
                    className="nelvyon-os-line"
                    filter="url(#nelvyon-line-glow)"
                  />
                );
              })}
              <rect
                x={CX - 88}
                y={CY - 52}
                width={176}
                height={104}
                rx={14}
                fill="rgba(255,255,255,0.05)"
                stroke={NELVYON_BLUE}
                strokeOpacity={0.55}
                strokeWidth={1.5}
              />
              <text x={CX} y={CY - 14} textAnchor="middle" fill="#ffffff" fontSize={26} fontWeight={700} letterSpacing="-0.03em">
                NELVYON
              </text>
              <text x={CX} y={CY + 12} textAnchor="middle" fill="rgba(255,255,255,0.42)" fontSize={10} fontWeight={500} letterSpacing="0.16em">
                NELVYON OS
              </text>
              <text x={CX} y={CY + 30} textAnchor="middle" fill="rgba(0,132,252,0.75)" fontSize={9} fontWeight={500} letterSpacing="0.1em">
                NÚCLEO OPERATIVO
              </text>
              {NODES.map((node) => {
                const { x, y } = polar(node.angle);
                return (
                  <g key={node.label} className="nelvyon-os-node" transform={`translate(${x - NODE_W / 2}, ${y - NODE_H / 2})`}>
                    <rect
                      width={NODE_W}
                      height={NODE_H}
                      rx={10}
                      fill="rgba(255,255,255,0.05)"
                      stroke="rgba(255,255,255,0.12)"
                      strokeWidth={1}
                      className="nelvyon-os-node__box"
                    />
                    <text
                      x={NODE_W / 2}
                      y={NODE_H / 2 + 4}
                      textAnchor="middle"
                      fill="rgba(255,255,255,0.88)"
                      fontSize={12}
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
      </div>
    </section>
  );
}
