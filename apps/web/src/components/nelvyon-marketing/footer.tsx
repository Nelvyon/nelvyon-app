import Link from "next/link";

import { NvLogo } from "./logo";

const COLS = [
  {
    title: "SaaS",
    links: [
      ["Plataforma", "/saas"],
      ["Precios", "/pricing"],
      ["Demo", "/contacto"],
    ],
  },
  {
    title: "Servicios",
    links: [
      ["Capas de ejecución", "/servicios"],
      ["Automatización", "/servicios"],
      ["CRM y pipeline", "/servicios"],
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

export function NvFooter() {
  return (
    <footer className="nv-footer">
      <div className="nv-container">
        <div className="nv-footer__grid">
          <div>
            <NvLogo size={28} />
            <p className="nv-footer__tagline">Donde nace tu imperio, crece tu marca y se impone tu legado.</p>
            <p className="nv-footer__meta">Plataforma operativa de marketing y automatización.</p>
          </div>
          {COLS.map((col) => (
            <div key={col.title}>
              <h4>{col.title}</h4>
              <ul>
                {col.links.map(([label, href]) => (
                  <li key={label}>
                    <Link href={href}>{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="nv-footer__bottom">
          <p>© {new Date().getFullYear()} NELVYON. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
