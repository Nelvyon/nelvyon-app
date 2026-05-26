import Link from "next/link";

import { COLORS, LINKS } from "./constants";

const PLATFORM = [
  { href: "#plataforma", label: "Funciones" },
  { href: "#servicios", label: "Servicios" },
  { href: "#precios", label: "Precios" },
  { href: LINKS.plataforma, label: "Dashboard" },
];

const COMPANY = [
  { href: "/sobre-nosotros", label: "Sobre nosotros" },
  { href: "/blog", label: "Blog" },
  { href: "/legal/privacidad", label: "Privacidad" },
  { href: "/legal/terminos", label: "Términos" },
];

export function LandingFooter() {
  return (
    <footer className="border-t border-white/10 py-16" style={{ backgroundColor: COLORS.bg }}>
      <div className="mx-auto grid max-w-7xl gap-10 px-4 md:grid-cols-4 md:px-6">
        <div>
          <p className="text-xl font-bold" style={{ color: COLORS.primary }}>
            NELVYON
          </p>
          <p className="mt-3 text-sm text-zinc-500">
            Donde nace tu imperio, crece tu marca y se impone tu legado.
          </p>
          <div className="mt-4 flex gap-4 text-sm text-zinc-400">
            <a href="https://linkedin.com" rel="noopener noreferrer" target="_blank">
              LinkedIn
            </a>
            <a href="https://instagram.com" rel="noopener noreferrer" target="_blank">
              Instagram
            </a>
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Plataforma</p>
          <ul className="mt-4 space-y-2">
            {PLATFORM.map((l) => (
              <li key={l.href}>
                <Link className="text-sm text-zinc-400 hover:text-white" href={l.href}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Empresa</p>
          <ul className="mt-4 space-y-2">
            {COMPANY.map((l) => (
              <li key={l.href}>
                <Link className="text-sm text-zinc-400 hover:text-white" href={l.href}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Contacto</p>
          <ul className="mt-4 space-y-2 text-sm text-zinc-400">
            <li>
              <a href="mailto:hola@nelvyon.com">hola@nelvyon.com</a>
            </li>
            <li>
              <Link href={LINKS.contacto}>Formulario de contacto</Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="mx-auto mt-12 flex max-w-7xl flex-col items-center justify-between gap-4 border-t border-white/10 px-4 pt-8 text-xs text-zinc-600 md:flex-row md:px-6">
        <p>© {new Date().getFullYear()} NELVYON. Todos los derechos reservados.</p>
        <div className="flex gap-6">
          <Link href="/legal/privacidad">Privacidad</Link>
          <Link href="/legal/terminos">Términos</Link>
          <Link href="/legal/cookies">Cookies</Link>
        </div>
      </div>
    </footer>
  );
}
