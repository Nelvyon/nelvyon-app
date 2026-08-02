import Image from "next/image";
import Link from "next/link";

type Cta = { label: string; href: string };

type Props = {
  eyebrow: string;
  title: string;
  description: string;
  primaryCta?: Cta;
  secondaryCta?: Cta;
  imageSrc?: string;
  imageAlt?: string;
};

/** Hero interior alineado a composición AIOR (sin robots / mock genérico). */
export function AiorPageHero({
  eyebrow,
  title,
  description,
  primaryCta,
  secondaryCta,
  imageSrc,
  imageAlt = "",
}: Props) {
  return (
    <div className="nv-aior-inner-hero space overflow-hidden" style={{ background: "#F4F7FF", paddingTop: 72 }}>
      <div className="container th-container5">
        <div className="row align-items-center gy-4">
          <div className={imageSrc ? "col-lg-6" : "col-lg-10"}>
            <span className="sub-title style3">{eyebrow}</span>
            <h1 className="sec-title h2 mb-3" style={{ color: "#06050B" }}>
              {title}
            </h1>
            <p className="mb-4" style={{ maxWidth: 560, color: "#484848" }}>
              {description}
            </p>
            {primaryCta || secondaryCta ? (
              <div className="btn-group">
                {primaryCta ? (
                  <Link href={primaryCta.href} className="th-btn2 btn-gradient2">
                    {primaryCta.label}
                  </Link>
                ) : null}
                {secondaryCta ? (
                  <Link href={secondaryCta.href} className="th-btn2 style5">
                    {secondaryCta.label}
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>
          {imageSrc ? (
            <div className="col-lg-6">
              <Image
                src={imageSrc}
                alt={imageAlt}
                width={900}
                height={560}
                className="nv-aior-product-shot"
                priority
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function AiorCtaBand({
  title,
  body,
  primaryCta,
  secondaryCta,
}: {
  title: string;
  body: string;
  primaryCta: Cta;
  secondaryCta?: Cta;
}) {
  return (
    <section className="space-extra overflow-hidden" style={{ background: "#020817", color: "#fff" }}>
      <div className="container th-container5 text-center">
        <h2 className="sec-title h3 text-white">{title}</h2>
        <p style={{ color: "rgba(255,255,255,0.78)", maxWidth: 560, margin: "0 auto 24px" }}>{body}</p>
        <div className="btn-group justify-content-center">
          <Link href={primaryCta.href} className="th-btn2 btn-gradient2">
            {primaryCta.label}
          </Link>
          {secondaryCta ? (
            <Link href={secondaryCta.href} className="th-btn2 style5" style={{ color: "#fff", borderColor: "#fff" }}>
              {secondaryCta.label}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
