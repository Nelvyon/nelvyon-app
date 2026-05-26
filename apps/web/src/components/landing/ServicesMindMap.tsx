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

const H = 520;
const CX = 100;
const CY = H / 2;
const NW = 140;
const NH = 80;

function branchY(i: number) {
  const start = 70;
  const gap = (H - 140) / (BRANCHES.length - 1);
  return start + i * gap;
}

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

        <div className="mt-10 hidden md:block">
          <FadeIn delay={0.08}>
            <svg className="mx-auto w-full max-w-[900px]" viewBox={`0 0 900 ${H}`}>
              {BRANCHES.map((b, i) => {
                const y = branchY(i);
                const bx = 280;
                const by = y;
                const startX = CX + NW;
                const startY = CY + NH / 2 - 40 + (i - 2) * 12;
                const cpx1 = startX + 80;
                const cpx2 = bx - 60;
                return (
                  <g key={b.id}>
                    <path
                      d={`M ${startX} ${startY} C ${cpx1} ${startY}, ${cpx2} ${by}, ${bx} ${by}`}
                      fill="none"
                      stroke={b.color}
                      strokeOpacity={0.55}
                      strokeWidth={2}
                    />
                    <rect fill={b.color} height={36} opacity={0.2} rx={8} width={160} x={bx} y={by - 18} />
                    <text fill={b.color} fontSize={13} fontWeight="700" x={bx + 12} y={by + 5}>
                      {b.label}
                    </text>
                    {b.subs.map((sub, j) => {
                      const sx = 460;
                      const sy = by - 36 + j * 26;
                      return (
                        <g key={sub}>
                          <line
                            stroke={b.color}
                            strokeOpacity={0.35}
                            strokeWidth={1}
                            x1={bx + 160}
                            x2={sx}
                            y1={by}
                            y2={sy + 10}
                          />
                          <rect
                            fill={b.color}
                            height={22}
                            opacity={0.12}
                            rx={6}
                            width={140}
                            x={sx}
                            y={sy}
                          />
                          <text fill={b.color} fontSize={11} fontWeight="600" x={sx + 10} y={sy + 15}>
                            {sub}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                );
              })}
              <rect
                fill={BRAND.blue}
                height={NH}
                rx={16}
                width={NW}
                x={CX}
                y={CY - NH / 2}
              />
              <text
                fill="white"
                fontSize={18}
                fontWeight="800"
                textAnchor="middle"
                x={CX + NW / 2}
                y={CY + 6}
              >
                NELVYON
              </text>
            </svg>
          </FadeIn>
        </div>

        <div className="mt-8 space-y-3 md:hidden">
          <div
            className="mb-6 flex h-20 w-full items-center justify-center rounded-2xl font-bold text-white"
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
                  <ChevronDown className={`h-5 w-5 transition ${isOpen ? "rotate-180" : ""}`} />
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
