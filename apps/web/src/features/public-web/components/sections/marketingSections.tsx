"use client";

import Image from "next/image";
import Link from "next/link";

import { Reveal } from "../Reveal";
import { NelvyonProductMock } from "../NelvyonProductMock";
import { Container, ProductFrame, SectionHeading, SectionShell } from "../ui";

export function ProductHero({
  eyebrow,
  titleLines,
  subtitle,
  primaryCta,
  secondaryCta,
  trustLine,
  productSrc,
  productAlt,
  useProductMock = true,
}: {
  eyebrow: string;
  titleLines: readonly string[];
  subtitle: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  trustLine: string;
  productSrc?: string;
  productAlt?: string;
  useProductMock?: boolean;
}) {
  return (
    <section className="relative overflow-hidden pb-8 pt-16 md:pb-12 md:pt-24">
      <div aria-hidden className="nv-public-glow pointer-events-none absolute inset-0" />
      <div aria-hidden className="nv-public-grid-bg pointer-events-none absolute inset-0 opacity-70" />
      <Container className="relative">
        <Reveal eager>
          <div className="mx-auto max-w-5xl text-center">
            <p className="nv-public-eyebrow justify-center">{eyebrow}</p>
            <h1 className="nv-public-display mt-6 text-4xl text-[var(--nv-fg-strong)] sm:text-5xl md:text-6xl lg:text-[4.25rem]">
              {titleLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </h1>
            <p className="mx-auto mt-7 max-w-3xl text-base leading-relaxed text-[var(--nv-muted)] md:text-xl">
              {subtitle}
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href={primaryCta.href} className="nv-public-btn nv-public-btn-primary min-w-[12rem]">
                {primaryCta.label}
              </Link>
              <Link href={secondaryCta.href} className="nv-public-btn nv-public-btn-secondary min-w-[12rem]">
                {secondaryCta.label}
              </Link>
            </div>
            <p className="mt-6 text-sm font-medium text-slate-400">{trustLine}</p>
          </div>
        </Reveal>

        <Reveal eager delayMs={80} className="relative mx-auto mt-14 max-w-6xl md:mt-20">
          <Image
            src="/brand/public/product/shape1.png"
            alt=""
            width={72}
            height={72}
            className="nv-public-float-shape -left-2 top-8 hidden w-14 md:block lg:-left-6 lg:w-16"
          />
          <Image
            src="/brand/public/product/shape2.png"
            alt=""
            width={72}
            height={72}
            className="nv-public-float-shape nv-public-float-shape--delay -right-2 top-24 hidden w-14 md:block lg:-right-4 lg:w-16"
          />
          {useProductMock || !productSrc ? (
            <NelvyonProductMock />
          ) : (
            <ProductFrame src={productSrc} alt={productAlt || "Producto NELVYON"} priority />
          )}
        </Reveal>
      </Container>
    </section>
  );
}

export function LogoMarquee({ items }: { items: readonly string[] }) {
  const loop = [...items, ...items];
  return (
    <SectionShell soft className="!py-10 md:!py-12 border-y border-[var(--nv-border)]">
      <Container>
        <p className="mb-6 text-center text-xs font-semibold uppercase tracking-[0.2em] text-[var(--nv-muted-2)]">
          Capas e integraciones del stack operativo
        </p>
        <div className="nv-public-marquee">
          <div className="nv-public-marquee-track">
            {loop.map((item, i) => (
              <span
                key={`${item}-${i}`}
                className="nv-public-panel inline-flex items-center rounded-full px-5 py-2.5 text-sm font-semibold text-[var(--nv-fg)]"
              >
                {item}
              </span>
            ))}
          </div>
        </div>
      </Container>
    </SectionShell>
  );
}

export function IconFeatureGrid({
  eyebrow,
  title,
  description,
  action,
  items,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: { label: string; href: string };
  items: readonly { title: string; body: string; icon: string; href: string }[];
}) {
  return (
    <SectionShell soft>
      <Container>
        <Reveal>
          <SectionHeading
            eyebrow={eyebrow}
            title={title}
            description={description}
            action={
              action ? (
                <Link href={action.href} className="nv-public-btn nv-public-btn-secondary">
                  {action.label}
                </Link>
              ) : null
            }
          />
        </Reveal>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => (
            <Reveal key={item.title} delayMs={i * 50}>
              <article className="nv-public-icon-card flex flex-col">
                <Image src={item.icon} alt="" width={56} height={56} className="h-14 w-14 object-contain" />
                <h3 className="mt-7 text-xl font-semibold text-[var(--nv-fg-strong)]">{item.title}</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-[var(--nv-muted)] md:text-base">{item.body}</p>
                <Link
                  href={item.href}
                  className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--nv-fg)] hover:text-[var(--nv-accent-deep)]"
                >
                  Más detalle
                  <Image src="/brand/public/product/arrow-right.png" alt="" width={16} height={16} />
                </Link>
              </article>
            </Reveal>
          ))}
        </div>
      </Container>
    </SectionShell>
  );
}

export function ShowcaseSplit({
  eyebrow,
  title,
  body,
  bullets,
  imageSrc,
  imageAlt,
  floatCardSrc,
  reverse = false,
  cta,
}: {
  eyebrow: string;
  title: string;
  body: string;
  bullets: readonly { title: string; body: string }[];
  imageSrc: string;
  imageAlt: string;
  floatCardSrc?: string;
  reverse?: boolean;
  cta?: { label: string; href: string };
}) {
  return (
    <SectionShell>
      <Container
        className={`grid items-center gap-12 lg:grid-cols-2 lg:gap-16 ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}
      >
        <Reveal>
          <div className="relative">
            <div className="relative overflow-hidden rounded-[1.35rem] border border-[var(--nv-border)] bg-[radial-gradient(circle_at_30%_20%,rgba(0,132,255,0.22),transparent_55%),linear-gradient(160deg,#12213d,#07111f)] p-4 shadow-[var(--nv-shadow-lg)] md:p-6">
              <div className="relative aspect-[4/5] overflow-hidden rounded-2xl md:aspect-[5/6]">
                <Image src={imageSrc} alt={imageAlt} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 45vw" />
              </div>
              {floatCardSrc ? (
                <Image
                  src={floatCardSrc}
                  alt=""
                  width={220}
                  height={140}
                  className="absolute -bottom-2 -right-2 w-[42%] max-w-[220px] drop-shadow-2xl md:bottom-4 md:right-4"
                />
              ) : null}
            </div>
          </div>
        </Reveal>
        <Reveal delayMs={70}>
          <p className="nv-public-eyebrow">{eyebrow}</p>
          <h2 className="nv-public-display mt-4 text-3xl text-[var(--nv-fg-strong)] md:text-5xl">{title}</h2>
          <p className="mt-5 text-base leading-relaxed text-[var(--nv-muted)] md:text-lg">{body}</p>
          <div className="mt-8 space-y-5">
            {bullets.map((b) => (
              <div key={b.title} className="flex gap-3">
                <Image
                  src="/brand/public/product/check-circle.png"
                  alt=""
                  width={24}
                  height={24}
                  className="mt-1 h-6 w-6 shrink-0"
                />
                <div>
                  <h3 className="text-lg font-semibold text-[var(--nv-fg-strong)]">{b.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--nv-muted)] md:text-base">{b.body}</p>
                </div>
              </div>
            ))}
          </div>
          {cta ? (
            <Link href={cta.href} className="nv-public-btn nv-public-btn-primary mt-9">
              {cta.label}
            </Link>
          ) : null}
        </Reveal>
      </Container>
    </SectionShell>
  );
}

export function BentoCapabilities({
  eyebrow,
  title,
  description,
  items,
}: {
  eyebrow: string;
  title: string;
  description: string;
  items: readonly { title: string; body: string; image?: string }[];
}) {
  return (
    <SectionShell soft className="border-y border-[var(--nv-border)]">
      <Container>
        <Reveal>
          <SectionHeading eyebrow={eyebrow} title={title} description={description} align="center" />
        </Reveal>
        <div className="nv-public-bento mt-12">
          {items.map((item, i) => (
            <Reveal key={item.title} delayMs={i * 40}>
              <article className="nv-public-panel nv-public-panel-lift relative h-full overflow-hidden p-6 md:p-7">
                {item.image ? (
                  <div className="relative mb-5 aspect-[16/9] overflow-hidden rounded-xl border border-[var(--nv-border)]">
                    <Image src={item.image} alt="" fill className="object-cover" sizes="(max-width: 768px) 100vw, 40vw" />
                  </div>
                ) : null}
                <h3 className="text-lg font-semibold text-[var(--nv-fg-strong)] md:text-xl">{item.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-[var(--nv-muted)] md:text-base">{item.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </Container>
    </SectionShell>
  );
}

export function IntegrationsBand({
  title,
  body,
  cta,
  visualSrc,
}: {
  title: string;
  body: string;
  cta: { label: string; href: string };
  visualSrc: string;
}) {
  return (
    <SectionShell soft className="border-y border-[var(--nv-border)]">
      <Container className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <Reveal>
          <div className="relative mx-auto max-w-md">
            <Image src={visualSrc} alt="" width={420} height={320} className="h-auto w-full drop-shadow-2xl" />
          </div>
        </Reveal>
        <Reveal delayMs={60}>
          <h2 className="nv-public-display text-3xl text-[var(--nv-fg-strong)] md:text-5xl">{title}</h2>
          <p className="mt-5 text-base leading-relaxed text-[var(--nv-muted)] md:text-lg">{body}</p>
          <Link href={cta.href} className="nv-public-btn nv-public-btn-primary mt-9">
            {cta.label}
          </Link>
        </Reveal>
      </Container>
    </SectionShell>
  );
}

export function TestimonialMarquee({
  title,
  items,
}: {
  title: string;
  items: readonly { quote: string; author: string; role: string; avatar: string }[];
}) {
  const rowA = [...items, ...items];
  const rowB = [...items.slice().reverse(), ...items.slice().reverse()];
  return (
    <SectionShell>
      <Container>
        <Reveal>
          <SectionHeading title={title} align="center" />
        </Reveal>
      </Container>
      <div className="mt-12 space-y-4">
        <div className="nv-public-marquee">
          <div className="nv-public-marquee-track px-4">
            {rowA.map((item, i) => (
              <article
                key={`a-${item.author}-${i}`}
                className="nv-public-panel w-[min(22rem,85vw)] shrink-0 p-5"
              >
                <p className="text-sm leading-relaxed text-[var(--nv-muted)]">&ldquo;{item.quote}&rdquo;</p>
                <div className="mt-5 flex items-center gap-3">
                  <Image src={item.avatar} alt="" width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
                  <div>
                    <p className="text-sm font-semibold text-[var(--nv-fg-strong)]">{item.author}</p>
                    <p className="text-xs text-[var(--nv-muted)]">{item.role}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
        <div className="nv-public-marquee">
          <div className="nv-public-marquee-track nv-public-marquee-track--reverse px-4">
            {rowB.map((item, i) => (
              <article
                key={`b-${item.author}-${i}`}
                className="nv-public-panel w-[min(22rem,85vw)] shrink-0 p-5"
              >
                <p className="text-sm leading-relaxed text-[var(--nv-muted)]">&ldquo;{item.quote}&rdquo;</p>
                <div className="mt-5 flex items-center gap-3">
                  <Image src={item.avatar} alt="" width={40} height={40} className="h-10 w-10 rounded-full object-cover" />
                  <div>
                    <p className="text-sm font-semibold text-[var(--nv-fg-strong)]">{item.author}</p>
                    <p className="text-xs text-[var(--nv-muted)]">{item.role}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
      <p className="mx-auto mt-8 max-w-2xl px-4 text-center text-xs text-[var(--nv-muted-2)]">
        Perfiles operativos ilustrativos (no testimonios de clientes inventados). El alcance real se valida en demo.
      </p>
    </SectionShell>
  );
}
