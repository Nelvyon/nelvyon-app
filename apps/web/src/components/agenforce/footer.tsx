import Link from "next/link";

import { NelvyonLogo } from "./nelvyon-logo";

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
    <footer className="nelvyon-footer">
      <div className="nelvyon-footer__inner">
        <div className="nelvyon-footer-grid">
          <div className="nelvyon-footer__brand">
            <NelvyonLogo height={36} wordmarkClassName="nelvyon-footer__wordmark" />
            <p className="nelvyon-footer__tagline">
              Donde nace tu imperio, crece tu marca y se impone tu legado.
            </p>
            <p className="nelvyon-footer__meta">Plataforma operativa de marketing y automatización.</p>
          </div>
          {FOOTER_COLUMNS.map((col) => (
            <div key={col.title}>
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
