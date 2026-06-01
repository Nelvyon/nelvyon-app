"use client";

import { useEffect } from "react";
import { motion, useMotionTemplate, useMotionValue } from "motion/react";

import { cn } from "@/lib/utils";

type SpotlightProps = {
  className?: string;
  fill?: string;
  /** Menos saturación — Hero negro premium */
  subtle?: boolean;
};

/** Spotlight New (Aceternity) — atmósfera + seguimiento suave del cursor. */
export function Spotlight({ className, fill = "#0084FF", subtle = false }: SpotlightProps) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      mouseX.set(event.clientX);
      mouseY.set(event.clientY);
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [mouseX, mouseY]);

  const cursorGlow = useMotionTemplate`radial-gradient(720px circle at ${mouseX}px ${mouseY}px, rgba(0, 71, 171, ${subtle ? 0.06 : 0.14}), transparent 72%)`;

  return (
    <>
      <motion.div
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{ background: cursorGlow }}
        aria-hidden
      />
      <svg
        className={cn(
          "nelvyon-spotlight-svg pointer-events-none absolute -top-[42%] left-0 z-[1] h-[185%] w-[90%] opacity-0 md:w-[68%] animate-spotlight",
          className,
        )}
        viewBox="0 0 3787 2842"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <g filter="url(#nelvyon_spotlight_filter)">
          <ellipse
            cx="1924.71"
            cy="273.501"
            rx="1924.71"
            ry="273.501"
            transform="matrix(-0.822377 -0.568943 -0.568943 0.822377 3631.88 2291.09)"
            fill={subtle ? "#0047AB" : fill}
            fillOpacity={subtle ? "0.08" : "0.18"}
          />
        </g>
        <defs>
          <filter
            id="nelvyon_spotlight_filter"
            x="0.860352"
            y="0.838989"
            width="3785.16"
            height="2840.26"
            filterUnits="userSpaceOnUse"
            colorInterpolationFilters="sRGB"
          >
            <feFlood floodOpacity="0" result="BackgroundImageFix" />
            <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
            <feGaussianBlur stdDeviation="151" result="effect1_foregroundBlur" />
          </filter>
        </defs>
      </svg>
    </>
  );
}
