import Link from "next/link";
import { Facebook, Instagram, Linkedin, Youtube } from "lucide-react";

import { BrandLogo } from "./BrandLogo";
import { BRAND } from "./shared";

const SERVICE_LINKS = [
  { href: "/servicios#seo", label: "SEO & Posicionamiento" },
  { href: "/servicios#publicidad", label: "Publicidad Digital" },
  { href: "/servicios#contenido", label: "Contenido & Social" },
  { href: "/servicios#web", label: "Web & Diseño" },
  { href: "/servicios#automatizacion", label: "Automatización IA" },
] as const;

const SOCIAL = [
  { href: "https://facebook.com", label: "Facebook", Icon: Facebook },
  { href: "https://instagram.com", label: "Instagram", Icon: Instagram },
  { href: "https://tiktok.com", label: "TikTok", Icon: null as null },
  { href: "https://linkedin.com", label: "LinkedIn", Icon: Linkedin },
  { href: "https://youtube.com", label: "YouTube", Icon: Youtube },
] as const;

export function LandingFooter() {
  return (
    <footer className="border-t py-16" style={{ backgroundColor: BRAND.footer, borderColor: BRAND.cardBorder }}>
      <div className="mx-auto grid max-w-7xl gap-10 px-4 md:grid-cols-4 md:px-6">
        <div>
          <BrandLogo />
          <p className="mt-3 text-sm leading-relaxed text-[#94A3B8]">
            Agencia de marketing digital con IA. Estrategia, ejecución y reporting desde un solo lugar.
          </p>
          <div className="mt-4 flex gap-3">
            {SOCIAL.map((s) => (
              <a
                aria-label={s.label}
                className="flex h-9 w-9 items-center justify-center rounded-full border text-[#94A3B8] transition hover:border-[#0066FF] hover:text-white"
                href={s.href}
                key={s.label}
                rel="noopener noreferrer"
                style={{ borderColor: BRAND.cardBorder }}
                target="_blank"
              >
                {s.Icon ? <s.Icon className="h-4 w-4" /> : <span className="text-xs font-bold">TT</span>}
              </a>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-white">Servicios</p>
          <ul className="mt-4 space-y-2">
            {SERVICE_LINKS.map((l) => (
              <li key={l.href}>
                <Link className="text-sm text-[#94A3B8] transition hover:text-white" href={l.href}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-white">Empresa</p>
          <ul className="mt-4 space-y-2 text-sm text-[#94A3B8]">
            <li>
              <Link className="transition hover:text-white" href="/nosotros">
                Nosotros
              </Link>
            </li>
            <li>
              <Link className="transition hover:text-white" href="/blog">
                Blog
              </Link>
            </li>
            <li>
              <Link className="transition hover:text-white" href="/contacto">
                Contacto
              </Link>
            </li>
            <li>
              <Link className="transition hover:text-white" href="/privacidad">
                Política de privacidad
              </Link>
            </li>
            <li>
              <Link className="transition hover:text-white" href="/terminos">
                Aviso legal
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-white">Contacto</p>
          <ul className="mt-4 space-y-2 text-sm text-[#94A3B8]">
            <li>
              <a className="transition hover:text-white" href="mailto:hola@nelvyon.com">
                hola@nelvyon.com
              </a>
            </li>
            <li>Respuesta en 48h</li>
          </ul>
        </div>
      </div>
      <div className="mx-auto mt-12 max-w-7xl border-t px-4 pt-8 text-center text-xs text-[#94A3B8] md:px-6" style={{ borderColor: BRAND.cardBorder }}>
        © 2026 Nelvyon · Todos los derechos reservados
      </div>
    </footer>
  );
}
