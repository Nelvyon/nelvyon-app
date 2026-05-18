import Link from "next/link";
import type { ReactNode } from "react";

import { MarketingSubnav } from "@/components/marketing/MarketingSubnav";

type LegalPageProps = {
  title: string;
  lastUpdated: string;
  children: ReactNode;
};

export function LegalPage({ title, lastUpdated, children }: LegalPageProps) {
  return (
    <>
      <MarketingSubnav />
      <main className="min-h-screen bg-[#080808] px-4 py-12 text-zinc-100 md:px-6">
        <article className="mx-auto max-w-[800px]">
          <nav className="text-sm text-zinc-500" aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1">
              <li>
                <Link href="/" className="hover:text-zinc-300">
                  Inicio
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href="/legal" className="hover:text-zinc-300">
                  Legal
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li className="text-zinc-300">{title}</li>
            </ol>
          </nav>

          <header className="mt-8 border-b border-zinc-800 pb-8">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-50">{title}</h1>
            <p className="mt-3 text-sm text-zinc-500">Última actualización: {lastUpdated}</p>
          </header>

          <div className="prose-legal mt-10 space-y-6 text-sm leading-relaxed text-zinc-300 [&_h2]:mt-10 [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-zinc-100 [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-medium [&_h3]:text-zinc-200 [&_li]:mt-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_a]:text-indigo-400 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-indigo-300">
            {children}
          </div>
        </article>
      </main>
    </>
  );
}
