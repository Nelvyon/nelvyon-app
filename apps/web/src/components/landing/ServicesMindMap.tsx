"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

import { FadeIn } from "./FadeIn";
import { BRAND } from "./shared";

const BRANCHES = [
  {
    id: "marketing",
    label: "Marketing Digital",
    color: "#6366F1",
    subs: ["SEO", "Google Ads", "Meta Ads", "TikTok Ads"],
  },
  {
    id: "comunicacion",
    label: "Comunicación",
    color: "#0EA5E9",
    subs: ["Email", "SMS", "WhatsApp", "Chatbot IA"],
  },
  {
    id: "contenido",
    label: "Contenido",
    color: "#10B981",
    subs: ["Textos IA", "Imágenes IA", "Vídeos IA", "Redes Sociales"],
  },
  {
    id: "webs",
    label: "Webs y Tiendas",
    color: "#F59E0B",
    subs: ["Web corporativa", "Tienda online", "Landing pages"],
  },
  {
    id: "analisis",
    label: "Análisis",
    color: "#EF4444",
    subs: ["Reporting", "CRM", "Reputación", "Presupuestos IA"],
  },
] as const;

// SVG layout constants
const SVG_W = 860;
const SVG_H = 540;

// Central node
const C_X = 30;
const C_W = 130;
const C_H = 52;
const C_Y = SVG_H / 2 - C_H / 2;

// Branch nodes
const B_X = 210;
const B_W = 158;
const B_H = 36;

// Sub nodes
const S_X = 420;
const S_W = 148;
const S_H = 26;
const S_GAP = 32;

// Vertical positions for each branch (evenly spaced)
const BRANCH_YS = [54, 162, 270, 378, 480];

export function ServicesMindMap() {
  const [openId, setOpenId] = useState<string | null>(BRANCHES[0].id);

  return (
    <section className="bg-white py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <FadeIn>
          <h2 className="text-center text-3xl font-extrabold tracking-tight text-[#111827] md:text-4xl">
            Todo lo que Nelvyon hace por tu negocio
          </h2>
        </FadeIn>

        {/* Desktop: horizontal SVG mind map */}
        <div className="mt-10 hidden md:block">
          <FadeIn delay={0.08}>
            <svg
              className="mx-auto w-full"
              style={{ maxWidth: SVG_W }}
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              xmlns="http://www.w3.org/2000/svg"
            >
              {BRANCHES.map((b, i) => {
                const bY = BRANCH_YS[i];
                const bMidY = bY + B_H / 2;

                // Connection from central node right-edge to branch left-edge
                const cRightX = C_X + C_W;
                const cMidY = C_Y + C_H / 2;
                const cp1x = cRightX + 40;
                const cp2x = B_X - 30;

                // Sub nodes vertical start
                const totalSubH = b.subs.length * S_GAP - (S_GAP - S_H);
                const subStartY = bMidY - totalSubH / 2;

                return (
                  <g key={b.id}>
                    {/* Line: central → branch */}
                    <path
                      d={`M ${cRightX} ${cMidY} C ${cp1x} ${cMidY}, ${cp2x} ${bMidY}, ${B_X} ${bMidY}`}
                      fill="none"
                      stroke={b.color}
                      strokeOpacity={0.5}
                      strokeWidth={2}
                    />

                    {/* Branch node */}
                    <rect
                      fill={b.color}
                      height={B_H}
                      opacity={0.18}
                      rx={8}
                      width={B_W}
                      x={B_X}
                      y={bY}
                    />
                    <text
                      dominantBaseline="middle"
                      fill={b.color}
                      fontSize={12.5}
                      fontWeight="700"
                      x={B_X + 12}
                      y={bMidY}
                    >
                      {b.label}
                    </text>

                    {/* Lines: branch → sub nodes */}
                    {b.subs.map((sub, j) => {
                      const sY = subStartY + j * S_GAP;
                      const sMidY = sY + S_H / 2;
                      return (
                        <g key={sub}>
                          <line
                            stroke={b.color}
                            strokeOpacity={0.3}
                            strokeWidth={1.5}
                            x1={B_X + B_W}
                            x2={S_X}
                            y1={bMidY}
                            y2={sMidY}
                          />
                          <rect
                            fill={b.color}
                            height={S_H}
                            opacity={0.12}
                            rx={6}
                            width={S_W}
                            x={S_X}
                            y={sY}
                          />
                          <text
                            dominantBaseline="middle"
                            fill={b.color}
                            fontSize={11}
                            fontWeight="600"
                            x={S_X + 10}
                            y={sMidY}
                          >
                            {sub}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                );
              })}

              {/* Central NELVYON node */}
              <rect fill={BRAND.blue} height={C_H} rx={12} width={C_W} x={C_X} y={C_Y} />
              <text
                dominantBaseline="middle"
                fill="white"
                fontSize={16}
                fontWeight="800"
                textAnchor="middle"
                x={C_X + C_W / 2}
                y={C_Y + C_H / 2}
              >
                NELVYON
              </text>
            </svg>
          </FadeIn>
        </div>

        {/* Mobile: accordion */}
        <div className="mt-8 space-y-3 md:hidden">
          <div
            className="mb-6 flex h-16 w-full items-center justify-center rounded-2xl font-bold text-white"
            style={{ backgroundColor: BRAND.blue }}
          >
            NELVYON
          </div>
          {BRANCHES.map((b) => {
            const isOpen = openId === b.id;
            return (
              <div className="overflow-hidden rounded-xl border border-[#E5E7EB]" key={b.id}>
                <button
                  className="flex w-full items-center justify-between px-4 py-4 text-left font-semibold"
                  onClick={() => setOpenId(isOpen ? null : b.id)}
                  style={{ color: b.color }}
                  type="button"
                >
                  {b.label}
                  <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen ? (
                  <div className="space-y-2 border-t border-[#E5E7EB] px-4 py-3">
                    {b.subs.map((sub) => (
                      <span
                        className="block rounded-lg px-3 py-2 text-sm font-medium"
                        key={sub}
                        style={{ backgroundColor: `${b.color}18`, color: b.color }}
                      >
                        {sub}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
