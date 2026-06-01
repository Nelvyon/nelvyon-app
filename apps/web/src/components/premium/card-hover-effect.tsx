"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type CardHoverEffectItem = {
  id: string;
  title: string;
  description?: string;
  href?: string;
  icon?: ReactNode;
};

export type CardHoverEffectProps = {
  items: readonly CardHoverEffectItem[];
  className?: string;
  renderItem?: (item: CardHoverEffectItem) => ReactNode;
};

/**
 * Tarjetas con hover premium — uso futuro en servicios, SaaS y sectores.
 * Sin tracking de ratón exagerado; elevación y borde en hover.
 */
export function CardHoverEffect({ items, className, renderItem }: CardHoverEffectProps) {
  return (
    <div className={cn("nelvyon-card-hover", className)}>
      {items.map((item) => {
        const content = renderItem ? (
          renderItem(item)
        ) : (
          <div className="nelvyon-card-hover__body">
            {item.icon ? <div className="nelvyon-card-hover__icon">{item.icon}</div> : null}
            <h3 className="nelvyon-card-hover__title">{item.title}</h3>
            {item.description ? <p className="nelvyon-card-hover__desc">{item.description}</p> : null}
          </div>
        );

        if (item.href) {
          return (
            <a key={item.id} href={item.href} className="nelvyon-card-hover__card">
              {content}
            </a>
          );
        }

        return (
          <div key={item.id} className="nelvyon-card-hover__card nelvyon-card-hover__card--static">
            {content}
          </div>
        );
      })}
    </div>
  );
}
