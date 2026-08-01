"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

import type { CatalogStatus, ProductMockVariant } from "../content/catalog";
import { shotForMock, type SaasShotId } from "../content/saasShots";
import type { DeviceKind } from "./DeviceMockup";
import { SaasProductCapture } from "./SaasProductCapture";
import { Reveal } from "./Reveal";
import { Container, CtaBand, SectionHeading, SectionShell } from "./ui";

export function StatusBadge({ status }: { status: CatalogStatus }) {
  const label =
    status === "en_producto" ? "En producto" : status === "por_proyecto" ? "Por proyecto" : "Enterprise";
  const tone = status === "en_producto" ? "product" : status === "por_proyecto" ? "project" : "enterprise";
  return (
    <span className="nv-public-status" data-tone={tone}>
      {label}
    </span>
  );
}

export function StatCounter({
  value,
  label,
  detail,
}: {
  value: string;
  label: string;
  detail?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [shown, setShown] = useState(false);
  const numeric = Number(String(value).replace(/[^\d.]/g, ""));
  const isNum = Number.isFinite(numeric) && /^\d/.test(value);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          obs.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const display = !isNum || !shown ? value : String(Math.round(numeric));

  return (
    <div>
      <p ref={ref} className="nv-public-stat">
        {isNum && shown && !/^\d+$/.test(value) ? value : display}
      </p>
      <p className="mt-2 text-sm font-semibold text-[var(--nv-fg)]">{label}</p>
      {detail ? <p className="mt-1 text-sm text-[var(--nv-muted)]">{detail}</p> : null}
    </div>
  );
}

export function FaqAccordion({ items }: { items: readonly { question: string; answer: string }[] }) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <Reveal key={item.question} delayMs={i * 30}>
          <details className="nv-public-panel group p-5 open:border-[rgba(0,132,255,0.25)]">
            <summary className="cursor-pointer list-none text-base font-semibold text-[var(--nv-fg-strong)] marker:content-none [&::-webkit-details-marker]:hidden">
              {item.question}
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-[var(--nv-muted)] md:text-base">{item.answer}</p>
          </details>
        </Reveal>
      ))}
    </div>
  );
}

export function FeatureGrid({
  items,
}: {
  items: readonly { title: string; body: string; icon?: string }[];
}) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {items.map((item, i) => (
        <Reveal key={item.title} delayMs={i * 40}>
          <article className="nv-public-icon-card">
            {item.icon ? (
              <Image src={item.icon} alt="" width={48} height={48} className="h-12 w-12 object-contain" />
            ) : (
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--nv-accent-soft)] text-sm font-bold text-[var(--nv-accent-deep)]">
                {String(i + 1).padStart(2, "0")}
              </span>
            )}
            <h3 className="mt-5 text-lg font-semibold text-[var(--nv-fg-strong)]">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--nv-muted)] md:text-base">{item.body}</p>
          </article>
        </Reveal>
      ))}
    </div>
  );
}

export function LogoCloud({ items }: { items: readonly { name: string; category?: string; initial?: string }[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
      {items.map((item, i) => (
        <Reveal key={item.name} delayMs={i * 20}>
          <div className="nv-public-panel flex items-center gap-3 px-4 py-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--nv-bg-soft)] text-xs font-bold text-[var(--nv-fg)]">
              {item.initial || item.name.slice(0, 2)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[var(--nv-fg)]">{item.name}</p>
              {item.category ? <p className="truncate text-[11px] text-[var(--nv-muted-2)]">{item.category}</p> : null}
            </div>
          </div>
        </Reveal>
      ))}
    </div>
  );
}

export function CaptureSlider({
  variants,
  labels,
  shots,
  device = "macbook",
}: {
  variants?: readonly ProductMockVariant[];
  labels?: readonly string[];
  /** Prefer real SaaS captures when provided */
  shots?: readonly { id: SaasShotId; label: string; mockVariant?: ProductMockVariant }[];
  device?: DeviceKind;
}) {
  const [idx, setIdx] = useState(0);
  const useShots = Boolean(shots?.length);
  const tabs = useShots
    ? (shots as readonly { id: SaasShotId; label: string; mockVariant?: ProductMockVariant }[])
    : (variants ?? ["dashboard"]).map((v) => ({
        id: (shotForMock(v) ?? "dashboard") as SaasShotId,
        label: v,
        mockVariant: v,
      }));
  const current = tabs[idx] ?? tabs[0];
  if (!current) return null;
  return (
    <div className="nv-public-capture-slider">
      <div className="nv-public-capture-slider-nav" role="tablist" aria-label="Capturas del producto">
        {tabs.map((t, i) => (
          <button
            key={`${t.id}-${i}`}
            type="button"
            role="tab"
            className="nv-public-tab"
            data-active={i === idx}
            aria-selected={i === idx}
            onClick={() => setIdx(i)}
          >
            {labels?.[i] || t.label}
          </button>
        ))}
      </div>
      <SaasProductCapture
        device={device}
        shotId={current.id}
        mockVariant={current.mockVariant ?? "dashboard"}
        alt={`Captura NELVYON · ${current.label}`}
        priority={idx === 0}
      />
    </div>
  );
}

export function FeatureTabs({
  tabs,
}: {
  tabs: readonly { id: string; label: string; title: string; body: string; bullets?: readonly string[] }[];
}) {
  const [id, setId] = useState(tabs[0]?.id ?? "");
  const active = tabs.find((t) => t.id === id) ?? tabs[0];
  if (!active) return null;
  return (
    <div>
      <div className="nv-public-tabs" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            className="nv-public-tab"
            data-active={t.id === active.id}
            aria-selected={t.id === active.id}
            onClick={() => setId(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="nv-public-panel mt-6 p-6 md:p-8">
        <h3 className="text-xl font-semibold text-[var(--nv-fg-strong)]">{active.title}</h3>
        <p className="mt-3 text-sm leading-relaxed text-[var(--nv-muted)] md:text-base">{active.body}</p>
        {active.bullets?.length ? (
          <ul className="mt-5 space-y-2">
            {active.bullets.map((b) => (
              <li key={b} className="flex gap-2 text-sm text-[var(--nv-muted)]">
                <Image src="/brand/public/product/check-circle.png" alt="" width={18} height={18} />
                {b}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

export function ComparisonTable({
  columns,
  rows,
}: {
  columns: readonly string[];
  rows: readonly { feature: string; values: readonly string[] }[];
}) {
  return (
    <div className="nv-public-panel overflow-x-auto">
      <table className="nv-public-compare min-w-[36rem]">
        <thead>
          <tr>
            <th>Capacidad</th>
            {columns.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.feature}>
              <td>{row.feature}</td>
              {row.values.map((v, i) => (
                <td key={`${row.feature}-${i}`}>{v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ProcessTimeline({ steps }: { steps: readonly { title: string; body: string }[] }) {
  return (
    <div className="nv-public-timeline">
      {steps.map((step, i) => (
        <Reveal key={step.title} delayMs={i * 40}>
          <div className="nv-public-timeline-step">
            <span className="nv-public-timeline-dot" aria-hidden />
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--nv-accent-deep)]">
              {String(i + 1).padStart(2, "0")}
            </p>
            <h3 className="mt-2 text-lg font-semibold text-[var(--nv-fg-strong)]">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--nv-muted)]">{step.body}</p>
          </div>
        </Reveal>
      ))}
    </div>
  );
}

export function MidCta({
  title,
  body,
  primaryCta,
  secondaryCta,
}: {
  title: string;
  body: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
}) {
  return (
    <SectionShell soft>
      <Container>
        <div className="nv-public-mid-cta">
          <h2 className="nv-public-display text-2xl md:text-3xl">{title}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--nv-muted)] md:text-base">{body}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
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
      </Container>
    </SectionShell>
  );
}

export function BenefitRows({ items }: { items: readonly { title: string; body: string; image?: string }[] }) {
  return (
    <div className="space-y-10">
      {items.map((item, i) => (
        <Reveal key={item.title} delayMs={i * 30}>
          <div className={`grid items-center gap-8 lg:grid-cols-2 ${i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""}`}>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--nv-accent-deep)]">
                {String(i + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-[var(--nv-fg-strong)]">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[var(--nv-muted)] md:text-base">{item.body}</p>
            </div>
            {item.image ? (
              <div className="relative aspect-[16/10] overflow-hidden rounded-[1rem] border border-[var(--nv-border)] shadow-[var(--nv-shadow-md)]">
                <Image src={item.image} alt="" fill className="object-cover" sizes="(max-width:1024px) 100vw, 45vw" />
              </div>
            ) : (
              <div className="nv-public-panel flex min-h-[12rem] items-center justify-center p-8 text-sm text-[var(--nv-muted)]">
                {item.title}
              </div>
            )}
          </div>
        </Reveal>
      ))}
    </div>
  );
}

export function MediaBlock({
  title,
  body,
  bullets,
  image,
  imageAlt,
  reverse,
  mock,
  mockVariant,
}: {
  title: string;
  body: string;
  bullets?: readonly string[];
  image?: string;
  imageAlt?: string;
  reverse?: boolean;
  mock?: boolean;
  mockVariant?: ProductMockVariant;
}) {
  return (
    <SectionShell soft={reverse}>
      <Container
        className={`grid items-center gap-12 lg:grid-cols-2 lg:gap-16 ${reverse ? "lg:[&>*:first-child]:order-2" : ""}`}
      >
        <Reveal>
          <h2 className="nv-public-display text-3xl md:text-4xl">{title}</h2>
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
          {mock ? (
            <SaasProductCapture
              shotId={shotForMock(mockVariant || "dashboard")}
              mockVariant={mockVariant || "dashboard"}
              alt={imageAlt || title}
            />
          ) : image ? (
            <div className="relative aspect-[5/4] overflow-hidden rounded-[1.15rem] border border-[var(--nv-border)] shadow-[var(--nv-shadow-lg)]">
              <Image src={image} alt={imageAlt || title} fill className="object-cover" sizes="(max-width:1024px) 100vw, 45vw" />
            </div>
          ) : null}
        </Reveal>
      </Container>
    </SectionShell>
  );
}

export function DeepHero({
  eyebrow,
  title,
  description,
  primaryCta,
  secondaryCta,
  mock,
  mockVariant,
  image,
  imageAlt,
  status,
  device = "macbook",
}: {
  eyebrow: string;
  title: string;
  description: string;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  mock?: boolean;
  mockVariant?: ProductMockVariant;
  image?: string;
  imageAlt?: string;
  status?: CatalogStatus;
  device?: DeviceKind;
}) {
  return (
    <section className="relative overflow-hidden border-b border-[var(--nv-border)] bg-[var(--nv-bg)]">
      <div aria-hidden className="nv-public-glow pointer-events-none absolute inset-0" />
      <Container className="relative grid items-center gap-12 py-16 md:grid-cols-[1.05fr_0.95fr] md:py-24 lg:gap-16">
        <Reveal eager>
          <div className="flex flex-wrap items-center gap-3">
            <p className="nv-public-eyebrow">{eyebrow}</p>
            {status ? <StatusBadge status={status} /> : null}
          </div>
          <h1 className="nv-public-display mt-5 text-4xl md:text-5xl lg:text-[3.25rem]">{title}</h1>
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
        <Reveal eager delayMs={80}>
          {mock ? (
            <SaasProductCapture
              device={device}
              shotId={shotForMock(mockVariant || "dashboard")}
              mockVariant={mockVariant || "dashboard"}
              alt={imageAlt || title}
              priority
            />
          ) : image ? (
            <div className="nv-library-photo relative aspect-[5/4]">
              <Image src={image} alt={imageAlt || title} fill className="object-cover" sizes="(max-width:1024px) 100vw, 40vw" priority />
            </div>
          ) : null}
        </Reveal>
      </Container>
    </section>
  );
}

export function DeepPageShell({
  children,
  ctaTitle,
  ctaBody,
}: {
  children: ReactNode;
  ctaTitle?: string;
  ctaBody?: string;
}) {
  return (
    <>
      {children}
      <CtaBand
        title={ctaTitle || "Hablemos de su operación"}
        body={ctaBody || "Demo del SaaS, presupuesto de agencia o ambos — con alcance concreto."}
        primaryCta={{ label: "Solicitar demo", href: "/contacto" }}
        secondaryCta={{ label: "Ver precios", href: "/precios" }}
      />
    </>
  );
}

export function RelatedLinks({
  title,
  items,
}: {
  title: string;
  items: readonly { label: string; href: string; body?: string }[];
}) {
  return (
    <SectionShell>
      <Container>
        <Reveal>
          <SectionHeading title={title} />
        </Reveal>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item, i) => (
            <Reveal key={item.href} delayMs={i * 30}>
              <Link href={item.href} className="nv-public-icon-card block">
                <h3 className="text-lg font-semibold text-[var(--nv-fg-strong)]">{item.label}</h3>
                {item.body ? <p className="mt-2 text-sm text-[var(--nv-muted)]">{item.body}</p> : null}
                <span className="mt-4 inline-flex text-sm font-semibold text-[var(--nv-accent-deep)]">Ver más →</span>
              </Link>
            </Reveal>
          ))}
        </div>
      </Container>
    </SectionShell>
  );
}
