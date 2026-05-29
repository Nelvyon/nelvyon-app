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

const CX = 400;
const CY = 400;
const RADIUS = 278;
const NODE_W = 128;
const NODE_H = 52;

function polar(angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return {
    x: CX + RADIUS * Math.cos(rad),
    y: CY + RADIUS * Math.sin(rad),
  };
}

export function PlataformaOs() {
  return (
    <section className="nelvyon-diagram-section nelvyon-mkt-section--airy">
      <div className="nelvyon-diagram-section__inner">
        <div className="nelvyon-diagram-section__header">
          <p className="mkt-eyebrow">Plataforma</p>
          <h2 className="mkt-h2 mkt-h2--display fade-in">Infraestructura operativa central</h2>
          <p className="mkt-lead nelvyon-diagram-section__lead">
            NELVYON conecta marketing, ventas y automatización desde un núcleo único.
          </p>
        </div>

        <div className="nelvyon-os-diagram-stage nelvyon-os-diagram-stage--hero">
          <div className="nelvyon-os-diagram-wrap">
            <svg
              viewBox="0 0 800 800"
              className="nelvyon-os-diagram"
              role="img"
              aria-label="Diagrama: NELVYON en el centro conectado con Ads, CRM, WhatsApp, Email, SEO, Ecommerce, Reporting, Automatización y Contenido"
            >
              <defs>
                <radialGradient id="nelvyon-os-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor={NELVYON_BLUE} stopOpacity="0.22" />
                  <stop offset="70%" stopColor={NELVYON_BLUE} stopOpacity="0.04" />
                  <stop offset="100%" stopColor={NELVYON_BLUE} stopOpacity="0" />
                </radialGradient>
                <filter id="nelvyon-line-glow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="2.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <circle cx={CX} cy={CY} r={RADIUS + 72} fill="url(#nelvyon-os-glow)" />
              <circle
                cx={CX}
                cy={CY}
                r={RADIUS + 18}
                fill="none"
                stroke={NELVYON_BLUE}
                strokeOpacity={0.12}
                strokeWidth={1}
                strokeDasharray="6 10"
              />
              <circle
                cx={CX}
                cy={CY}
                r={RADIUS - 36}
                fill="none"
                stroke={NELVYON_BLUE}
                strokeOpacity={0.08}
                strokeWidth={1}
                strokeDasharray="4 12"
              />
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
                    strokeOpacity={0.42}
                    strokeWidth={1.5}
                    className="nelvyon-os-line"
                    filter="url(#nelvyon-line-glow)"
                  />
                );
              })}
              <circle cx={CX} cy={CY} r={72} fill="rgba(0,132,252,0.08)" stroke={NELVYON_BLUE} strokeOpacity={0.35} strokeWidth={1.5} />
              <circle cx={CX} cy={CY} r={56} fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
              <image href="/logo.png" x={CX - 36} y={CY - 52} width={72} height={72} preserveAspectRatio="xMidYMid meet" />
              <text x={CX} y={CY + 44} textAnchor="middle" fill="#ffffff" fontSize={22} fontWeight={700} letterSpacing="-0.03em">
                NELVYON
              </text>
              <text x={CX} y={CY + 64} textAnchor="middle" fill="rgba(255,255,255,0.45)" fontSize={10} fontWeight={500} letterSpacing="0.14em">
                NELVYON OS
              </text>
              {NODES.map((node) => {
                const { x, y } = polar(node.angle);
                return (
                  <g key={node.label} className="nelvyon-os-node" transform={`translate(${x - NODE_W / 2}, ${y - NODE_H / 2})`}>
                    <rect
                      width={NODE_W}
                      height={NODE_H}
                      rx={12}
                      fill="rgba(255,255,255,0.06)"
                      stroke="rgba(255,255,255,0.14)"
                      strokeWidth={1}
                      className="nelvyon-os-node__box"
                    />
                    <circle cx={14} cy={NODE_H / 2} r={3.5} fill={NELVYON_BLUE} fillOpacity={0.9} />
                    <text
                      x={NODE_W / 2 + 4}
                      y={NODE_H / 2 + 4}
                      textAnchor="middle"
                      fill="rgba(255,255,255,0.92)"
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
