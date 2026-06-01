"use client";

import { useMemo } from "react";
import { motion } from "motion/react";

import { cn } from "@/lib/utils";

export type WorldMapDot = {
  start: { lat: number; lng: number };
  end: { lat: number; lng: number };
};

type WorldMapProps = {
  dots?: WorldMapDot[];
  className?: string;
};

const MAP_WIDTH = 800;
const MAP_HEIGHT = 400;

function projectPoint(lat: number, lng: number) {
  return {
    x: ((lng + 180) / 360) * MAP_WIDTH,
    y: ((90 - lat) / 180) * MAP_HEIGHT,
  };
}

function buildArcPath(
  start: { x: number; y: number },
  end: { x: number; y: number },
) {
  const midX = (start.x + end.x) / 2;
  const midY = Math.min(start.y, end.y) - 48;
  return `M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`;
}

/** Puntos de mapa (silueta simplificada) para fondo. */
const LAND_DOTS: Array<{ lat: number; lng: number }> = [
  { lat: 51, lng: -10 },
  { lat: 48, lng: 2 },
  { lat: 40, lng: -3 },
  { lat: 45, lng: 9 },
  { lat: 52, lng: 13 },
  { lat: 55, lng: 12 },
  { lat: 50, lng: 20 },
  { lat: 47, lng: 25 },
  { lat: 42, lng: 21 },
  { lat: 38, lng: -9 },
  { lat: 37, lng: -6 },
  { lat: 41, lng: 12 },
  { lat: 46, lng: 6 },
  { lat: 44, lng: 26 },
  { lat: 39, lng: 32 },
  { lat: 35, lng: 33 },
  { lat: 60, lng: 10 },
  { lat: 63, lng: 15 },
  { lat: 56, lng: -3 },
  { lat: 53, lng: -2 },
  { lat: 49, lng: -123 },
  { lat: 45, lng: -75 },
  { lat: 40, lng: -74 },
  { lat: 34, lng: -118 },
  { lat: 25, lng: -80 },
  { lat: 19, lng: -99 },
  { lat: -23, lng: -46 },
  { lat: -34, lng: -58 },
  { lat: 30, lng: 31 },
  { lat: 24, lng: 46 },
  { lat: 28, lng: 77 },
  { lat: 1, lng: 103 },
  { lat: 35, lng: 139 },
  { lat: -33, lng: 151 },
  { lat: -37, lng: 175 },
];

export default function WorldMap({ dots = [], className }: WorldMapProps) {
  const arcs = useMemo(
    () =>
      dots.map((dot) => {
        const start = projectPoint(dot.start.lat, dot.start.lng);
        const end = projectPoint(dot.end.lat, dot.end.lng);
        return {
          d: buildArcPath(start, end),
          start,
          end,
        };
      }),
    [dots],
  );

  const landPoints = useMemo(
    () => LAND_DOTS.map((p) => projectPoint(p.lat, p.lng)),
    [],
  );

  return (
    <div
      className={cn(
        "relative mx-auto aspect-[2/1] w-full max-w-5xl overflow-hidden rounded-xl",
        className,
      )}
    >
      <svg
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        className="h-full w-full"
        role="img"
        aria-label="Mapa de conexiones operativas"
      >
        <defs>
          <radialGradient id="nelvyon_map_glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#0084FF" stopOpacity="0.16" />
            <stop offset="100%" stopColor="#0047AB" stopOpacity="0" />
          </radialGradient>
          <filter id="nelvyon_map_line_glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {landPoints.map((point, index) => (
          <circle
            key={`land-${index}`}
            cx={point.x}
            cy={point.y}
            r={1.4}
            fill="#0084FF"
            opacity={0.22}
          />
        ))}

        {arcs.map((arc, index) => (
          <g key={`arc-${index}`}>
            <motion.path
              d={arc.d}
              fill="none"
              stroke="#0047AB"
              strokeWidth={2}
              strokeOpacity={0.35}
              filter="url(#nelvyon_map_line_glow)"
              initial={{ pathLength: 0, opacity: 0 }}
              whileInView={{ pathLength: 1, opacity: 0.45 }}
              viewport={{ once: true }}
              transition={{ duration: 1.4, delay: index * 0.15, ease: "easeInOut" }}
            />
            <motion.path
              d={arc.d}
              fill="none"
              stroke="#0084FF"
              strokeWidth={1.75}
              filter="url(#nelvyon_map_line_glow)"
              initial={{ pathLength: 0, opacity: 0 }}
              whileInView={{ pathLength: 1, opacity: 0.8 }}
              viewport={{ once: true }}
              transition={{ duration: 1.6, delay: index * 0.15 + 0.1, ease: "easeInOut" }}
            />
            <motion.circle
              cx={arc.start.x}
              cy={arc.start.y}
              r={4}
              fill="#0084FF"
              initial={{ scale: 0, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 + 0.5 }}
            />
            <motion.circle
              cx={arc.end.x}
              cy={arc.end.y}
              r={4}
              fill="#0084FF"
              initial={{ scale: 0, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.15 + 0.7 }}
            />
          </g>
        ))}

        <ellipse
          cx={MAP_WIDTH / 2}
          cy={MAP_HEIGHT / 2}
          rx={MAP_WIDTH * 0.48}
          ry={MAP_HEIGHT * 0.38}
          fill="url(#nelvyon_map_glow)"
          opacity={0.55}
        />
      </svg>
    </div>
  );
}
