import Link from "next/link";

import { BRAND, NAV_LINKS } from "./shared";

export function LandingFooter() {
  return (
    <footer className="border-t border-white/10 py-16" style={{ backgroundColor: BRAND.bgAlt }}>
      <div className="mx-auto grid max-w-7xl gap-10 px-4 md:grid-cols-4 md:px-6">
        <div>
          <p className="text-xl font-bold" style={{ color: BRAND.blue }}>
            NELVYON
          </p>
          <p className="mt-3 text-sm" style={{ color: BRAND.textDim }}>
            Agencia de marketing digital. Donde nace tu imperio, crece tu marca y se impone tu legado.
          </p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Navegación</p>
          <ul className="mt-4 space-y-2">
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <Link className="text-sm transition hover:text-white" href={l.href} style={{ color: BRAND.textMuted }}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Legal</p>
          <ul className="mt-4 space-y-2 text-sm" style={{ color: BRAND.textMuted }}>
            <li>
              <Link href="/legal/privacidad">Privacidad</Link>
            </li>
            <li>
              <Link href="/legal/terminos">Términos</Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Contacto</p>
          <ul className="mt-4 space-y-2 text-sm" style={{ color: BRAND.textMuted }}>
            <li>
              <a href="mailto:hola@nelvyon.com">hola@nelvyon.com</a>
            </li>
            <li>
              <Link href="/contacto">Formulario</Link>
            </li>
          </ul>
        </div>
      </div>
      <p className="mx-auto mt-12 max-w-7xl px-4 text-center text-xs text-zinc-600 md:px-6">
        © {new Date().getFullYear()} NELVYON. Todos los derechos reservados.
      </p>
    </footer>
  );
}
