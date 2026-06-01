"use client";

import { cn } from "@/lib/utils";

import type { IntegrationLogo } from "./integration-logos";

export type LogoCloudMarqueeProps = {
  title?: string;
  subtitle?: string;
  logos: readonly IntegrationLogo[];
  className?: string;
  /** Duración de un ciclo completo en segundos (más alto = más lento). */
  durationSeconds?: number;
  /** Si false, solo se muestra el eyebrow (p. ej. Home integraciones). */
  showTitle?: boolean;
};

function LogoTile({ logo }: { logo: IntegrationLogo }) {
  return (
    <div className="nelvyon-logo-marquee__tile">
      <div className="nelvyon-logo-marquee__logo-wrap">
        {logo.slug && logo.brandColor ? (
          <img
            src={`https://cdn.simpleicons.org/${logo.slug}/${logo.brandColor}`}
            alt=""
            width={28}
            height={28}
            className="nelvyon-logo-marquee__logo-img"
            loading="lazy"
            decoding="async"
          />
        ) : null}
      </div>
      <span className="nelvyon-logo-marquee__name">{logo.name}</span>
    </div>
  );
}

export function LogoCloudMarquee({
  title,
  subtitle,
  logos,
  className,
  durationSeconds = 55,
  showTitle = true,
}: LogoCloudMarqueeProps) {
  const track = [...logos, ...logos];
  const headingId = "nelvyon-logo-marquee-title";

  return (
    <section
      className={cn("nelvyon-logo-marquee", className)}
      aria-labelledby={showTitle && title ? headingId : "nelvyon-logo-marquee-eyebrow"}
    >
      <div className="nelvyon-logo-marquee__inner">
        <header className="nelvyon-logo-marquee__head">
          <p id="nelvyon-logo-marquee-eyebrow" className="mkt-eyebrow nelvyon-logo-marquee__eyebrow">
            Integraciones
          </p>
          {showTitle && title ? (
            <h2 id={headingId} className="nelvyon-logo-marquee__title">
              {title}
            </h2>
          ) : null}
          {subtitle ? <p className="nelvyon-logo-marquee__subtitle">{subtitle}</p> : null}
        </header>

        <div className="nelvyon-logo-marquee__viewport">
          <div
            className="nelvyon-logo-marquee__track"
            style={{ animationDuration: `${durationSeconds}s` }}
          >
            {track.map((logo, index) => (
              <LogoTile key={`${logo.name}-${index}`} logo={logo} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
