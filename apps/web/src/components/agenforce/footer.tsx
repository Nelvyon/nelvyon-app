import Link from "next/link";

import { NelvyonLogo } from "./nelvyon-logo";
import { NELVYON_SLOGAN } from "./marketing-brand";

const FOOTER_COLUMNS = [
  {
    title: "Producto",
    links: [
      ["Plataforma SaaS", "/saas"],
      ["Precios", "/pricing"],
      ["Solicitar información", "/contacto"],
    ],
  },
  {
    title: "Recursos",
    links: [
      ["Blog", "/blog"],
      ["Partners", "/partners"],
      ["Contacto", "/contacto"],
    ],
  },
  {
    title: "Empresa",
    links: [
      ["Nosotros", "/nosotros"],
      ["Privacidad", "/privacidad"],
      ["Términos", "/terminos"],
    ],
  },
];

export function Footer() {
  return (
    <footer className="nelvyon-footer nelvyon-footer--launch">
      <div className="nelvyon-footer__accent" aria-hidden />
      <div className="nelvyon-footer__inner">
        <div className="nelvyon-footer-grid">
          <div className="nelvyon-footer__brand">
            <NelvyonLogo height={44} />
            <p className="nelvyon-footer__tagline">{NELVYON_SLOGAN}</p>
            <p className="nelvyon-footer__meta">
              Servicios profesionales y plataforma SaaS para marketing y operación digital.
            </p>
            <Link href="/contacto" className="nelvyon-footer__cta">
              Solicitar información →
            </Link>
          </div>
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title} className="nelvyon-footer__col">
              <h4 className="nelvyon-footer__col-title">{col.title}</h4>
              <ul className="nelvyon-footer__links">
                {col.links.map(([label, href]) => (
                  <li key={label}>
                    <Link href={href} className="nelvyon-footer__link">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="nelvyon-footer__bottom">
          <p>© {new Date().getFullYear()} NELVYON. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
