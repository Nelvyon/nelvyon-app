import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import type { CtaLink } from "../content/siteContent";
import { Reveal } from "./Reveal";

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-6xl px-4 md:px-6 ${className}`.trim()}>{children}</div>;
}

export function PageHero({
  eyebrow,
  title,
  description,
  primaryCta,
  secondaryCta,
  imageSrc,
  imageAlt,
}: {
  eyebrow: string;
  title: string;
  description: string;
  primaryCta?: CtaLink;
  secondaryCta?: CtaLink;
  imageSrc?: string;
  imageAlt?: string;
}) {
  return (
    <section className="relative overflow-hidden border-b border-[var(--nv-border)]">
      <div aria-hidden className="nv-public-grid-bg pointer-events-none absolute inset-0 opacity-70" />
      <Container className="relative grid items-center gap-10 py-16 md:grid-cols-[1.15fr_0.85fr] md:py-24 lg:gap-14">
        <Reveal>
          <p className="nv-public-eyebrow">{eyebrow}</p>
          <h1 className="nv-public-display mt-5 max-w-3xl text-4xl text-white md:text-5xl lg:text-[3.4rem]">
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-relaxed text-[var(--nv-muted)] md:text-lg">
            {description}
          </p>
          {(primaryCta || secondaryCta) && (
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              {primaryCta ? (
                <Link href={primaryCta.href} className="nv-public-btn nv-public-btn-primary">
                  {primaryCta.label}
                </Link>
              ) : null}
              {secondaryCta ? (
                <Link href={secondaryCta.href} className="nv-public-btn nv-public-btn-secondary">
                  {secondaryCta.label}
                </Link>
              ) : null}
            </div>
          )}
        </Reveal>
        {imageSrc ? (
          <Reveal delayMs={80} className="relative">
            <div className="nv-public-panel relative aspect-[4/3] overflow-hidden">
              <Image
                src={imageSrc}
                alt={imageAlt || title}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 40vw"
                priority
              />
            </div>
          </Reveal>
        ) : null}
      </Container>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      {eyebrow ? <p className="nv-public-eyebrow">{eyebrow}</p> : null}
      <h2 className="nv-public-display mt-4 text-3xl text-white md:text-4xl">{title}</h2>
      {description ? <p className="mt-4 text-base leading-relaxed text-[var(--nv-muted)] md:text-lg">{description}</p> : null}
    </div>
  );
}

export function FeatureCards({
  items,
}: {
  items: readonly { title: string; body: string }[];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((item, i) => (
        <Reveal key={item.title} delayMs={i * 40}>
          <article className="nv-public-panel h-full p-6">
            <h3 className="text-lg font-semibold text-white">{item.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-[var(--nv-muted)]">{item.body}</p>
          </article>
        </Reveal>
      ))}
    </div>
  );
}

export function ContentSections({
  sections,
}: {
  sections: readonly { heading: string; body: string; bullets?: readonly string[] }[];
}) {
  return (
    <div className="space-y-8">
      {sections.map((section, i) => (
        <Reveal key={section.heading} delayMs={i * 30}>
          <article className="nv-public-panel p-6 md:p-8">
            <h2 className="text-xl font-semibold text-white md:text-2xl">{section.heading}</h2>
            <p className="mt-3 text-base leading-relaxed text-[var(--nv-muted)]">{section.body}</p>
            {section.bullets?.length ? (
              <ul className="mt-5 space-y-2.5">
                {section.bullets.map((b) => (
                  <li key={b} className="flex gap-3 text-sm text-slate-300">
                    <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--nv-accent)]" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </article>
        </Reveal>
      ))}
    </div>
  );
}

export function CtaBand({
  title,
  body,
  primaryCta,
  secondaryCta,
}: {
  title: string;
  body: string;
  primaryCta: CtaLink;
  secondaryCta?: CtaLink;
}) {
  return (
    <section className="border-t border-[var(--nv-border)] py-16 md:py-20">
      <Container>
        <Reveal>
          <div className="nv-public-panel relative overflow-hidden px-6 py-10 md:px-12 md:py-14">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[rgba(0,132,255,0.12)] blur-3xl"
            />
            <div className="relative max-w-2xl">
              <h2 className="nv-public-display text-3xl text-white md:text-4xl">{title}</h2>
              <p className="mt-4 text-base leading-relaxed text-[var(--nv-muted)]">{body}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href={primaryCta.href} className="nv-public-btn nv-public-btn-primary">
                  {primaryCta.label}
                </Link>
                {secondaryCta ? (
                  <Link href={secondaryCta.href} className="nv-public-btn nv-public-btn-secondary">
                    {secondaryCta.label}
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </Reveal>
      </Container>
    </section>
  );
}

export function MediaSplit({
  eyebrow,
  title,
  body,
  imageSrc,
  imageAlt,
  reverse = false,
  bullets,
}: {
  eyebrow: string;
  title: string;
  body: string;
  imageSrc: string;
  imageAlt: string;
  reverse?: boolean;
  bullets?: readonly string[];
}) {
  return (
    <section className="py-16 md:py-20">
      <Container
        className={`grid items-center gap-10 md:grid-cols-2 lg:gap-14 ${reverse ? "md:[&>*:first-child]:order-2" : ""}`}
      >
        <Reveal>
          <p className="nv-public-eyebrow">{eyebrow}</p>
          <h2 className="nv-public-display mt-4 text-3xl text-white md:text-4xl">{title}</h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--nv-muted)]">{body}</p>
          {bullets?.length ? (
            <ul className="mt-6 space-y-2.5">
              {bullets.map((b) => (
                <li key={b} className="flex gap-3 text-sm text-slate-300">
                  <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--nv-accent)]" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </Reveal>
        <Reveal delayMs={60}>
          <div className="nv-public-panel relative aspect-[5/4] overflow-hidden">
            <Image src={imageSrc} alt={imageAlt} fill className="object-cover" sizes="(max-width: 768px) 100vw, 45vw" />
          </div>
        </Reveal>
      </Container>
    </section>
  );
}
