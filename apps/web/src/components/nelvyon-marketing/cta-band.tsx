import Link from "next/link";

type NvCtaBandProps = {
  title: string;
  subtitle: string;
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
};

export function NvCtaBand({
  title,
  subtitle,
  primaryLabel = "Solicitar demo",
  primaryHref = "/contacto",
  secondaryLabel,
  secondaryHref,
}: NvCtaBandProps) {
  return (
    <section className="nv-cta">
      <div className="nv-container">
        <h2 className="nv-fade">{title}</h2>
        <p className="nv-fade">{subtitle}</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href={primaryHref} className="nv-btn nv-btn--primary">
            {primaryLabel}
          </Link>
          {secondaryLabel && secondaryHref ? (
            <Link href={secondaryHref} className="nv-btn nv-btn--ghost">
              {secondaryLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
