"use client";

import type { ReactNode } from "react";

import WorldMapCanvas, { type WorldMapDot } from "@/components/ui/world-map";
import { cn } from "@/lib/utils";

/** Conexiones operativas (Europa) — sin claims de presencia global. */
const OPERATION_DOTS: WorldMapDot[] = [
  {
    start: { lat: 40.4168, lng: -3.7038 },
    end: { lat: 48.8566, lng: 2.3522 },
  },
  {
    start: { lat: 40.4168, lng: -3.7038 },
    end: { lat: 51.5074, lng: -0.1278 },
  },
  {
    start: { lat: 48.8566, lng: 2.3522 },
    end: { lat: 52.52, lng: 13.405 },
  },
];

export type WorldMapProps = {
  children?: ReactNode;
  className?: string;
  title?: string;
  subtitle?: string;
  dots?: WorldMapDot[];
};

export function WorldMap({
  children,
  className,
  title,
  subtitle,
  dots = OPERATION_DOTS,
}: WorldMapProps) {
  return (
    <section
      className={cn("nelvyon-world-map", className)}
      aria-labelledby={title ? "nelvyon-world-map-title" : undefined}
    >
      <div className="nelvyon-section-inner nelvyon-section-inner--wide">
        {title ? (
          <header className="nelvyon-world-map__head">
            <h2 id="nelvyon-world-map-title" className="nelvyon-world-map__title">
              {title}
            </h2>
            {subtitle ? <p className="nelvyon-world-map__subtitle">{subtitle}</p> : null}
          </header>
        ) : null}
        <div className={cn("nelvyon-world-map__canvas", !title && "nelvyon-world-map__canvas--bare")}>
          <WorldMapCanvas dots={dots} />
        </div>
        {children}
      </div>
    </section>
  );
}
