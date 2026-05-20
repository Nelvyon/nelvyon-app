"use client";

import Link from "next/link";

import { FadeIn } from "./FadeIn";
import { FOOTER_GROUPS } from "./constants";

export function MarketingFooter() {
  return (
    <footer className="border-t border-white/[0.06] bg-[#0a0a0a]">
      <div className="mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-20">
        <FadeIn>
          <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
            <div className="lg:col-span-2">
              <Link href="/" className="text-xl font-bold text-white">
                <span className="bg-gradient-to-r from-violet-400 to-blue-400 bg-clip-text text-transparent">
                  NELVYON
                </span>
              </Link>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-zinc-500">
                Marketing autónomo con inteligencia artificial. SEO, publicidad, contenido, email y branding — un solo
                sistema, sin equipo externo.
              </p>
            </div>
            {FOOTER_GROUPS.map((group) => (
              <div key={group.title}>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{group.title}</h3>
                <ul className="mt-4 space-y-2">
                  {group.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="text-sm text-zinc-400 transition hover:text-white">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-12 flex flex-col gap-2 border-t border-white/[0.06] pt-8 text-xs text-zinc-600 sm:flex-row sm:justify-between">
            <span>© {new Date().getFullYear()} NELVYON. Todos los derechos reservados.</span>
            <a href="mailto:hola@nelvyon.com" className="hover:text-zinc-400">
              hola@nelvyon.com
            </a>
          </div>
        </FadeIn>
      </div>
    </footer>
  );
}
