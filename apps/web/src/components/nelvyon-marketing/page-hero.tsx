import type { ReactNode } from "react";

type NvPageHeroProps = {
  eyebrow?: string;
  title: string;
  subtitle: string;
  visual?: ReactNode;
  split?: boolean;
};

export function NvPageHero({ eyebrow, title, subtitle, visual, split = false }: NvPageHeroProps) {
  return (
    <section className={`nv-page-hero${split ? " nv-page-hero--split" : ""}`}>
      <div className="nv-container">
        {split && visual ? (
          <div className="nv-page-hero__grid">
            <div>
              {eyebrow ? <span className="nv-eyebrow">{eyebrow}</span> : null}
              <h1 className="nv-fade">{title}</h1>
              <p className="nv-fade">{subtitle}</p>
            </div>
            <div>{visual}</div>
          </div>
        ) : (
          <>
            {eyebrow ? <span className="nv-eyebrow">{eyebrow}</span> : null}
            <h1 className="nv-fade">{title}</h1>
            <p className="nv-fade">{subtitle}</p>
            {visual ? <div style={{ marginTop: 40 }}>{visual}</div> : null}
          </>
        )}
      </div>
    </section>
  );
}
