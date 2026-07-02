"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type MacbookScrollProps = {
  /** Captura real del producto (CRM, reporting, etc.). Sin demos de terceros. */
  src: string;
  alt: string;
  className?: string;
  badge?: ReactNode;
};

/**
 * Marco MacBook simplificado — biblioteca NELVYON (inspirado en Aceternity).
 * Uso futuro: página /saas con capturas reales de la plataforma.
 */
export function MacbookScroll({ src, alt, className, badge }: MacbookScrollProps) {
  return (
    <div className={cn("nelvyon-macbook-scroll", className)}>
      <div className="nelvyon-macbook-scroll__lid">
        <div className="nelvyon-macbook-scroll__screen">
          { }
          <img src={src} alt={alt} className="nelvyon-macbook-scroll__image" />
        </div>
      </div>
      <div className="nelvyon-macbook-scroll__base" aria-hidden>
        <div className="nelvyon-macbook-scroll__trackpad" />
      </div>
      {badge ? <div className="nelvyon-macbook-scroll__badge">{badge}</div> : null}
    </div>
  );
}
