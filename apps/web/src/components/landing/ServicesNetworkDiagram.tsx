"use client";

import { useState } from "react";

import { ALL_SERVICES } from "./agencyContent";
import { BRAND } from "./shared";
import { FadeIn } from "./FadeIn";

const CX = 450;
const CY = 450;
const R = 300;

function shorten(name: string) {
  if (name.length <= 22) return name;
  return `${name.slice(0, 20)}…`;
}

export function ServicesNetworkDiagram() {
  const [hovered, setHovered] = useState<string | null>(null);
  const count = ALL_SERVICES.length;

  return (
    <FadeIn>
      <div className="mx-auto w-full max-w-[900px] px-2">
        <div className="relative aspect-square w-full max-h-[min(90vw,900px)]">
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 900 900">
            <defs>
              <linearGradient id="electricGrad" x1="0%" x2="100%" y1="0%" y2="0%">
                <stop offset="0%" stopColor={BRAND.blue} />
                <stop offset="100%" stopColor={BRAND.cyan} />
              </linearGradient>
            </defs>
            {ALL_SERVICES.map((s, i) => {
              const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
              const x = CX + R * Math.cos(angle);
              const y = CY + R * Math.sin(angle);
              const active = hovered === s.slug;
              return (
                <line
                  key={`line-${s.slug}`}
                  stroke="url(#electricGrad)"
                  strokeDasharray="8 6"
                  strokeOpacity={active ? 0.85 : 0.35}
                  strokeWidth={active ? 2 : 1.25}
                  x1={CX}
                  x2={x}
                  y1={CY}
                  y2={y}
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    dur="2.5s"
                    repeatCount="indefinite"
                    values="0;-28"
                  />
                </line>
              );
            })}
          </svg>

          <div
            className="absolute left-1/2 top-1/2 z-10 flex h-[120px] w-[120px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-2xl text-center font-bold text-white shadow-[0_0_40px_rgba(0,102,255,0.45)]"
            style={{ backgroundColor: BRAND.blue }}
          >
            NELVYON
          </div>

          {ALL_SERVICES.map((s, i) => {
            const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
            const x = ((CX + R * Math.cos(angle)) / 900) * 100;
            const y = ((CY + R * Math.sin(angle)) / 900) * 100;
            const active = hovered === s.slug;
            return (
              <button
                className={`absolute z-20 max-w-[120px] -translate-x-1/2 -translate-y-1/2 rounded-lg border px-2 py-2 text-center text-[10px] font-semibold leading-tight transition-all duration-200 sm:max-w-[140px] sm:text-xs ${
                  active
                    ? "scale-105 border-[#0066FF] bg-white shadow-[0_8px_24px_rgba(0,102,255,0.25)]"
                    : "border-[#E5E7EB] bg-[#F3F4F6] text-zinc-800"
                }`}
                key={s.slug}
                onBlur={() => setHovered(null)}
                onFocus={() => setHovered(s.slug)}
                onMouseEnter={() => setHovered(s.slug)}
                onMouseLeave={() => setHovered(null)}
                style={{ left: `${x}%`, top: `${y}%` }}
                type="button"
              >
                {shorten(s.name)}
              </button>
            );
          })}
        </div>
      </div>
    </FadeIn>
  );
}
