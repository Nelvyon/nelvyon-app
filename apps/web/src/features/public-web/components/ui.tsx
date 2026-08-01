import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import type { CtaLink } from "../content/siteContent";
import { SaasProductCapture } from "./SaasProductCapture";
import { Reveal } from "./Reveal";

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-7xl px-4 md:px-6 ${className}`.trim()}>{children}</div>;
}

export function SectionShell({
  children,
  className = "",
  soft = false,
  band = false,
}: {
  children: ReactNode;
  className?: string;
  soft?: boolean;
  band?: boolean;
}) {
  const tone = soft ? "nv-public-surface-soft" : band ? "nv-public-surface-band" : "";
  return (
    <section className={`relative overflow-hidden py-20 md:py-28 ${tone} ${className}`.trim()}>{children}</section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  action?: ReactNode;
}) {
  return (
    <div
      className={
        align === "center"
          ? "mx-auto max-w-4xl text-center"
          : "flex flex-col gap-6 md:flex-row md:items-end md:justify-between"
      }
    >
      <div className={align === "center" ? "" : "max-w-3xl"}>
        {eyebrow ? <p className="nv-public-eyebrow">{eyebrow}</p> : null}
        <h2 className="nv-public-display mt-4 text-3xl text-[var(--nv-fg-strong)] md:text-5xl">{title}</h2>
        {description ? (
          <p className="mt-5 text-base leading-relaxed text-[var(--nv-muted)] md:text-lg">{description}</p>
        ) : null}
      </div>
      {action ? <div className={align === "center" ? "mt-8" : "shrink-0"}>{action}</div> : null}
    </div>
  );
}

export function ProductFrame({
  src,
  alt,
  priority = false,
  className = "",
}: {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <div className={`nv-public-product-frame ${className}`.trim()}>
      <div className="nv-public-product-chrome" aria-hidden>
        <span />
        <span />
        <span />
        <div className="ml-3 h-5 flex-1 rounded-md bg-white/5" />
      </div>
      <div className="relative aspect-[16/10] w-full">
        <Image src={src} alt={alt} fill className="object-cover object-top" sizes="(max-width: 768px) 100vw, 90vw" priority={priority} />
      </div>
    </div>
  );
}

export function PageHero({
  eyebrow,
  title,
  description,
  primaryCta,
  secondaryCta,
  imageSrc,
  imageAlt,
  productMock = false,
}: {
  eyebrow: string;
  title: string;
  description: string;
  primaryCta?: CtaLink;
  secondaryCta?: CtaLink;
  imageSrc?: string;
  imageAlt?: string;
  productMock?: boolean;
}) {
  return (
    <section className="relative overflow-hidden border-b border-[var(--nv-border)]">
      <div aria-hidden className="nv-public-glow pointer-events-none absolute inset-0" />
      <div aria-hidden className="nv-public-grid-bg pointer-events-none absolute inset-0 opacity-60" />
      <Container className="relative grid items-center gap-12 py-20 md:grid-cols-[1.1fr_0.9fr] md:py-28 lg:gap-16">
        <Reveal eager>
          <p className="nv-public-eyebrow">{eyebrow}</p>
          <h1 className="nv-public-display mt-5 max-w-3xl text-4xl text-[var(--nv-fg-strong)] md:text-5xl lg:text-[3.6rem]">{title}</h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-[var(--nv-muted)] md:text-lg">{description}</p>
          {(primaryCta || secondaryCta) && (
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
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
        {productMock ? (
          <Reveal eager delayMs={80}>
            <SaasProductCapture
              device="macbook"
              shotId="dashboard"
              mockVariant="dashboard"
              alt="Dashboard SaaS NELVYON"
              priority
            />
          </Reveal>
        ) : imageSrc ? (
          <Reveal eager delayMs={80}>
            <ProductFrame src={imageSrc} alt={imageAlt || title} priority />
          </Reveal>
        ) : null}
      </Container>
    </section>
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
          <article className="nv-public-icon-card">
            <h3 className="text-lg font-semibold text-[var(--nv-fg-strong)]">{item.title}</h3>
            <p className="mt-3 text-sm leading-relaxed text-[var(--nv-muted)] md:text-base">{item.body}</p>
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
    <div className="space-y-6">
      {sections.map((section, i) => (
        <Reveal key={section.heading} delayMs={i * 30}>
          <article className="nv-public-panel p-6 md:p-8">
            <h2 className="text-xl font-semibold text-[var(--nv-fg-strong)] md:text-2xl">{section.heading}</h2>
            <p className="mt-3 text-base leading-relaxed text-[var(--nv-muted)]">{section.body}</p>
            {section.bullets?.length ? (
              <ul className="mt-5 space-y-2.5">
                {section.bullets.map((b) => (
                  <li key={b} className="flex gap-3 text-sm text-[var(--nv-muted)] md:text-base">
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
    <SectionShell className="border-t border-[var(--nv-border)] !py-16 md:!py-20">
      <Container>
        <Reveal>
          <div className="nv-public-panel relative overflow-hidden px-6 py-12 md:px-14 md:py-16">
            <div
              aria-hidden
              className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[rgba(0,132,255,0.16)] blur-3xl"
            />
            <div className="relative max-w-3xl">
              <h2 className="nv-public-display text-3xl text-[var(--nv-fg-strong)] md:text-5xl">{title}</h2>
              <p className="mt-5 text-base leading-relaxed text-[var(--nv-muted)] md:text-lg">{body}</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
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
    </SectionShell>
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
    <SectionShell>
      <Container
        className={`grid items-center gap-12 md:grid-cols-2 lg:gap-16 ${reverse ? "md:[&>*:first-child]:order-2" : ""}`}
      >
        <Reveal>
          <p className="nv-public-eyebrow">{eyebrow}</p>
          <h2 className="nv-public-display mt-4 text-3xl text-[var(--nv-fg-strong)] md:text-5xl">{title}</h2>
          <p className="mt-5 text-base leading-relaxed text-[var(--nv-muted)] md:text-lg">{body}</p>
          {bullets?.length ? (
            <ul className="mt-7 space-y-3">
              {bullets.map((b) => (
                <li key={b} className="flex gap-3 text-sm text-[var(--nv-muted)] md:text-base">
                  <Image
                    src="/brand/public/product/check-circle.png"
                    alt=""
                    width={22}
                    height={22}
                    className="mt-0.5 h-[22px] w-[22px] shrink-0"
                  />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </Reveal>
        <Reveal delayMs={60}>
          <ProductFrame src={imageSrc} alt={imageAlt} />
        </Reveal>
      </Container>
    </SectionShell>
  );
}
