import Link from "next/link";
import type { ReactNode } from "react";

import { PublicShell } from "@/features/public-web";
import "@/features/public-web/styles/public-web.css";

type LegalPageProps = {
  title: string;
  lastUpdated: string;
  children: ReactNode;
};

export function LegalPage({ title, lastUpdated, children }: LegalPageProps) {
  return (
    <PublicShell>
      <div className="nv-public border-b border-[var(--nv-border)]">
        <article className="mx-auto max-w-3xl px-4 py-14 md:px-6 md:py-20">
          <nav className="text-sm text-[var(--nv-muted)]" aria-label="Miga de pan">
            <ol className="flex flex-wrap items-center gap-1">
              <li>
                <Link href="/" className="hover:text-white">
                  Inicio
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href="/legal" className="hover:text-white">
                  Legal
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-slate-300">{title}</li>
            </ol>
          </nav>

          <header className="mt-8 border-b border-[var(--nv-border)] pb-8">
            <h1 className="nv-public-display text-3xl text-white md:text-4xl">{title}</h1>
            <p className="mt-3 text-sm text-[var(--nv-muted)]">Última actualización: {lastUpdated}</p>
          </header>

          <div className="mt-10 space-y-6 text-sm leading-relaxed text-[var(--nv-muted)] [&_a]:text-[var(--nv-accent)] [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-white [&_h2]:mt-10 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-white [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-medium [&_h3]:text-slate-200 [&_li]:mt-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_strong]:text-slate-200">
            {children}
          </div>
        </article>
      </div>
    </PublicShell>
  );
}
