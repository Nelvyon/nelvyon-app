"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion } from "framer-motion";

import { FadeIn } from "./FadeIn";
import { BRAND } from "./shared";

const BRANCHES = [
  {
    id: "seo",
    label: "SEO & Posicionamiento",
    subs: ["SEO On-Page", "SEO Técnico", "Link Building", "SEO Local", "Auditoría SEO"],
  },
  {
    id: "ads",
    label: "Publicidad Digital",
    subs: ["Google Ads", "Meta Ads", "TikTok Ads", "LinkedIn Ads", "YouTube Ads"],
  },
  {
    id: "content",
    label: "Contenido & Social",
    subs: ["Copywriting", "Artículos Blog", "Posts Redes", "Guiones Vídeo", "Email Marketing"],
  },
  {
    id: "web",
    label: "Web & Diseño",
    subs: ["Webs a Medida", "Tiendas Online", "Landings", "Rediseño Web", "UX/UI"],
  },
  {
    id: "ia",
    label: "Automatización IA",
    subs: ["Chatbots IA", "Email Automático", "CRM Inteligente", "Reporting Auto", "Flujos IA"],
  },
] as const;

const SVG_W = 920;
const SVG_H = 640;
const C_X = 24;
const C_R = 52;
const C_CY = SVG_H / 2;
const B_X = 185;
const B_W = 168;
const B_H = 40;
const S_X = 400;
const S_W = 130;
const S_H = 28;
const S_GAP = 34;

const BRANCH_YS = [48, 178, 308, 438, 568];

function AnimatedPath({
  d,
  inView,
  delay,
}: {
  d: string;
  inView: boolean;
  delay: number;
}) {
  return (
    <motion.path
      animate={{ pathLength: inView ? 1 : 0, opacity: inView ? 1 : 0.2 }}
      d={d}
      fill="none"
      initial={{ pathLength: 0, opacity: 0.2 }}
      stroke="url(#mindmap-gradient)"
      strokeLinecap="round"
      strokeWidth={2.5}
      transition={{ duration: 0.7, delay, ease: "easeOut" }}
    />
  );
}

export function ServicesMindMap({
  className = "bg-white",
  dark = false,
}: {
  className?: string;
  dark?: boolean;
}) {
  const [openId, setOpenId] = useState<string | null>(BRANCHES[0].id);
  const containerRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setInView(true);
      },
      { threshold: 0.2 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section className={`py-16 md:py-24 ${className}`}>
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <FadeIn>
          <h2
            className={`text-center text-3xl font-extrabold tracking-tight md:text-4xl ${dark ? "text-white" : "text-[#111827]"}`}
          >
            Todo lo que Nelvyon hace por tu negocio
          </h2>
        </FadeIn>

        <div className="mt-10 hidden md:block" ref={containerRef}>
          <FadeIn delay={0.08}>
            <svg
              className="mx-auto w-full"
              style={{ maxWidth: SVG_W }}
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="mindmap-gradient" x1="0%" x2="100%" y1="0%" y2="0%">
                  <stop offset="0%" stopColor="#0066FF" />
                  <stop offset="100%" stopColor="#00CFFF" />
                </linearGradient>
              </defs>

              {BRANCHES.map((b, i) => {
                const bY = BRANCH_YS[i];
                const bMidY = bY + B_H / 2;
                const startX = C_X + C_R;
                const endX = B_X;
                const totalSubH = b.subs.length * S_GAP - (S_GAP - S_H);
                const subStartY = bMidY - totalSubH / 2;

                const pathToBranch = `M ${startX} ${C_CY} C ${startX + 60} ${C_CY}, ${endX - 40} ${bMidY}, ${B_X} ${bMidY}`;

                return (
                  <g key={b.id}>
                    <AnimatedPath d={pathToBranch} delay={i * 0.12} inView={inView} />

                    <rect
                      fill={BRAND.blue}
                      height={B_H}
                      opacity={inView ? 1 : 0.4}
                      rx={B_H / 2}
                      width={B_W}
                      x={B_X}
                      y={bY}
                    />
                    <text
                      dominantBaseline="middle"
                      fill="white"
                      fontSize={11}
                      fontWeight="700"
                      textAnchor="middle"
                      x={B_X + B_W / 2}
                      y={bMidY}
                    >
                      {b.label}
                    </text>

                    {b.subs.map((sub, j) => {
                      const sY = subStartY + j * S_GAP;
                      const sMidY = sY + S_H / 2;
                      const pathToSub = `M ${B_X + B_W} ${bMidY} L ${S_X} ${sMidY}`;
                      return (
                        <g key={sub}>
                          <AnimatedPath d={pathToSub} delay={i * 0.12 + 0.25 + j * 0.05} inView={inView} />
                          <rect
                            fill="#111111"
                            height={S_H}
                            rx={S_H / 2}
                            stroke="rgba(0,102,255,0.4)"
                            strokeWidth={1}
                            width={S_W}
                            x={S_X}
                            y={sY}
                          />
                          <text
                            dominantBaseline="middle"
                            fill="#E5E7EB"
                            fontSize={10.5}
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

              {/* Central NELVYON circle */}
              <circle
                cx={C_X + C_R}
                cy={C_CY}
                fill={BRAND.blue}
                opacity={inView ? 1 : 0.5}
                r={C_R}
              />
              <text
                fill="white"
                fontSize={15}
                fontWeight="800"
                textAnchor="middle"
                x={C_X + C_R}
                y={C_CY + 5}
              >
                NELVYON
              </text>
            </svg>
          </FadeIn>
        </div>

        {/* Mobile accordion */}
        <div className="mt-8 space-y-3 md:hidden">
          <div
            className="mb-6 flex h-16 w-full items-center justify-center rounded-full font-bold text-white"
            style={{ backgroundColor: BRAND.blue }}
          >
            NELVYON
          </div>
          {BRANCHES.map((b) => {
            const isOpen = openId === b.id;
            return (
              <div className="overflow-hidden rounded-xl border border-[#E5E7EB]" key={b.id}>
                <button
                  className="flex w-full items-center justify-between px-4 py-4 text-left font-semibold text-[#0066FF]"
                  onClick={() => setOpenId(isOpen ? null : b.id)}
                  type="button"
                >
                  {b.label}
                  <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen ? (
                  <div className="space-y-2 border-t border-[#E5E7EB] px-4 py-3">
                    {b.subs.map((sub) => (
                      <span
                        className="block rounded-full border border-[#0066FF]/40 bg-[#111] px-4 py-2 text-sm font-medium text-[#E5E7EB]"
                        key={sub}
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
