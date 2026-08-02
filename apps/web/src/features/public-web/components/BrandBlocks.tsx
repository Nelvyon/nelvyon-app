import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { saasShotSrc, type SaasShotId } from "../content/saasShots";
import { BrandCheck } from "./BrandCheck";

type Feature = { title: string; body: string };
type Cta = { label: string; href: string };
type LinkItem = { label: string; href: string; body?: string };

export function BrandSection({
  children,
  soft,
  id,
}: {
  children: ReactNode;
  soft?: boolean;
  id?: string;
}) {
  return (
    <section
      id={id}
      className="space overflow-hidden"
      style={soft ? { background: "#F4F7FF" } : undefined}
    >
      <div className="container th-container5">{children}</div>
    </section>
  );
}

export function BrandTitle({
  eyebrow,
  title,
  description,
  center,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  center?: boolean;
}) {
  return (
    <div className={`title-area mb-40${center ? " text-center" : ""}`}>
      {eyebrow ? <span className="sub-title style3">{eyebrow}</span> : null}
      <h2 className="sec-title h3">{title}</h2>
      {description ? (
        <p className={center ? "mx-auto" : undefined} style={{ maxWidth: 640, color: "#484848" }}>
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function BrandFeatureGrid({ items }: { items: readonly Feature[] }) {
  return (
    <div className="row gy-4">
      {items.map((item) => (
        <div key={item.title} className="col-md-6 col-xl-4">
          <div
            style={{
              padding: 28,
              borderRadius: 16,
              border: "1px solid #E0E0E0",
              background: "#fff",
              height: "100%",
            }}
          >
            <h3 className="box-title h5">{item.title}</h3>
            <p className="mb-0">{item.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function BrandCheckList({ items }: { items: readonly string[] }) {
  return (
    <ul className="hero-list" style={{ textAlign: "left" }}>
      {items.map((item) => (
        <li key={item}>
          <BrandCheck /> {item}
        </li>
      ))}
    </ul>
  );
}

export function BrandProcess({ steps }: { steps: readonly Feature[] }) {
  return (
    <div className="row gy-4">
      {steps.map((step, i) => (
        <div key={step.title} className="col-md-6 col-xl-3">
          <div
            style={{
              padding: 24,
              borderRadius: 16,
              border: "1px solid #E0E0E0",
              background: "#fff",
              height: "100%",
            }}
          >
            <span className="sub-title style3">0{i + 1}</span>
            <h3 className="h6">{step.title}</h3>
            <p className="mb-0" style={{ fontSize: 14 }}>
              {step.body}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function BrandRelated({ title, items }: { title: string; items: readonly LinkItem[] }) {
  if (!items.length) return null;
  return (
    <BrandSection soft>
      <BrandTitle eyebrow="Relacionado" title={title} center />
      <div className="row gy-4">
        {items.map((item) => (
          <div key={item.href} className="col-md-6 col-xl-3">
            <Link
              href={item.href}
              className="d-block h-100"
              style={{
                padding: 24,
                borderRadius: 16,
                border: "1px solid #E0E0E0",
                background: "#fff",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <h3 className="h6">{item.label}</h3>
              {item.body ? (
                <p className="mb-0" style={{ fontSize: 14, color: "#484848" }}>
                  {item.body}
                </p>
              ) : null}
            </Link>
          </div>
        ))}
      </div>
    </BrandSection>
  );
}

export function BrandShot({
  id,
  alt,
  width = 900,
  height = 560,
}: {
  id: SaasShotId;
  alt: string;
  width?: number;
  height?: number;
}) {
  return (
    <Image
      src={saasShotSrc(id)}
      alt={alt}
      width={width}
      height={height}
      className="nv-brand-product-shot"
    />
  );
}

export function BrandCardLink({
  href,
  title,
  body,
  image,
  meta,
}: {
  href: string;
  title: string;
  body: string;
  image?: string;
  meta?: string;
}) {
  return (
    <Link
      href={href}
      className="d-block h-100"
      style={{
        borderRadius: 16,
        border: "1px solid #E0E0E0",
        background: "#fff",
        overflow: "hidden",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      {image ? (
        <Image src={image} alt="" width={640} height={360} className="w-100 h-auto" style={{ display: "block" }} />
      ) : null}
      <div style={{ padding: 24 }}>
        {meta ? <span className="sub-title style3">{meta}</span> : null}
        <h3 className="box-title h5">{title}</h3>
        <p className="mb-0" style={{ color: "#484848" }}>
          {body}
        </p>
      </div>
    </Link>
  );
}

export function BrandAsideNext({
  title = "Siguiente paso",
  body,
  primaryCta,
  secondaryCta,
}: {
  title?: string;
  body: string;
  primaryCta: Cta;
  secondaryCta?: Cta;
}) {
  return (
    <div style={{ padding: 28, borderRadius: 16, border: "1px solid #E0E0E0", background: "#fff" }}>
      <h3 className="h5">{title}</h3>
      <p>{body}</p>
      <div className="btn-group" style={{ flexDirection: "column", alignItems: "stretch" }}>
        <Link href={primaryCta.href} className="th-btn2 btn-gradient2">
          {primaryCta.label}
        </Link>
        {secondaryCta ? (
          <Link href={secondaryCta.href} className="th-btn2 style5">
            {secondaryCta.label}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
