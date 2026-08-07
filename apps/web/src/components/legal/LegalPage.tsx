import Link from "next/link";
import type { ReactNode } from "react";

import { PublicShell } from "@/features/public-web";

const NV_SKIN = "/brand/public/nv/css";

type LegalPageProps = {
  title: string;
  lastUpdated: string;
  children: ReactNode;
};

/** Legal NELVYON con chrome público unificado (nav/footer). */
export function LegalPage({ title, lastUpdated, children }: LegalPageProps) {
  return (
    <>
      <link rel="stylesheet" href={`${NV_SKIN}/bootstrap.min.css`} />
      <link rel="stylesheet" href={`${NV_SKIN}/style.css`} />
      <link rel="stylesheet" href={`${NV_SKIN}/nelvyon-skin.css`} />
      <PublicShell>
        <div className="nv-brand-inner-hero" style={{ background: "#F5F8FC", padding: "48px 0 24px" }}>
          <div className="container th-container5">
            <nav aria-label="Miga de pan" style={{ fontSize: 14, color: "#6b7c93" }}>
              <ol className="d-flex flex-wrap gap-1 mb-3" style={{ listStyle: "none", padding: 0 }}>
                <li>
                  <Link href="/" style={{ color: "#0084FF" }}>
                    Inicio
                  </Link>
                </li>
                <li aria-hidden>/</li>
                <li>
                  <Link href="/legal" style={{ color: "#0084FF" }}>
                    Legal
                  </Link>
                </li>
                <li aria-hidden>/</li>
                <li style={{ color: "#06050B" }}>{title}</li>
              </ol>
            </nav>
            <span className="sub-title style3">Legal</span>
            <h1 className="sec-title h2 mb-2">{title}</h1>
            <p className="mb-0" style={{ color: "#484848" }}>
              Última actualización: {lastUpdated}
            </p>
          </div>
        </div>
        <section className="space overflow-hidden">
          <div className="container th-container5" style={{ maxWidth: 800 }}>
            <div
              style={{ color: "#484848", lineHeight: 1.7, fontSize: 15 }}
              className="nv-brand-legal-prose"
            >
              {children}
            </div>
          </div>
        </section>
      </PublicShell>
      <style>{`
        .nv-brand-legal-prose a { color: #0084FF; }
        .nv-brand-legal-prose h2 { margin-top: 2rem; font-size: 1.25rem; color: #06050B; font-weight: 700; }
        .nv-brand-legal-prose h3 { margin-top: 1.25rem; font-size: 1.05rem; color: #06050B; font-weight: 600; }
        .nv-brand-legal-prose ul, .nv-brand-legal-prose ol { padding-left: 1.25rem; }
        .nv-brand-legal-prose li { margin-top: 0.35rem; }
        .nv-brand-legal-prose strong { color: #06050B; }
      `}</style>
    </>
  );
}
