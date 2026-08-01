import Link from "next/link";

import { megaNav, siteBrand } from "../content/siteContent";

export function PublicFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--nv-border)] bg-[var(--nv-bg-soft)]">
      <div className="mx-auto max-w-6xl px-4 py-14 md:px-6 md:py-16">
        <div className="grid gap-10 md:grid-cols-[1.2fr_repeat(4,1fr)]">
          <div className="max-w-sm">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <span
                aria-hidden
                className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--nv-accent)] text-sm font-bold text-[var(--nv-fg-strong)]"
              >
                N
              </span>
              <span className="font-[family-name:var(--font-nv-display)] text-lg font-semibold tracking-tight">
                {siteBrand.name}
              </span>
            </Link>
            <p className="mt-4 text-sm leading-relaxed text-[var(--nv-muted)]">{siteBrand.tagline}</p>
            <p className="mt-4 text-sm text-[var(--nv-muted)]">
              <a className="hover:text-[var(--nv-accent-deep)]" href={`mailto:${siteBrand.contactEmail}`}>
                {siteBrand.contactEmail}
              </a>
            </p>
          </div>

          {megaNav.map((group) => (
            <div key={group.id}>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{group.title}</p>
              <ul className="mt-4 space-y-2.5">
                {group.links.map((link) => (
                  <li key={`${group.id}-${link.href}-${link.label}`}>
                    <Link
                      href={link.href}
                      className="text-sm text-[var(--nv-muted)] transition-colors hover:text-[var(--nv-accent-deep)]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-[var(--nv-border)] pt-6 text-sm text-[var(--nv-muted)] md:flex-row md:items-center md:justify-between">
          <p>
            © {year} {siteBrand.name}. Todos los derechos reservados.
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <Link href="/aviso-legal" className="hover:text-[var(--nv-accent-deep)]">
              Aviso legal
            </Link>
            <Link href="/privacidad" className="hover:text-[var(--nv-accent-deep)]">
              Privacidad
            </Link>
            <Link href="/cookies" className="hover:text-[var(--nv-accent-deep)]">
              Cookies
            </Link>
            <Link href="/terminos" className="hover:text-[var(--nv-accent-deep)]">
              Términos
            </Link>
            <Link href="/seguridad" className="hover:text-[var(--nv-accent-deep)]">
              Seguridad
            </Link>
            <Link href="/status" className="hover:text-[var(--nv-accent-deep)]">
              Status
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
