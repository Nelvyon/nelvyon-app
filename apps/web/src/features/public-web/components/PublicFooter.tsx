import Image from "next/image";
// Enlace que usa `<a>` para las rutas servidas por el pack estatico y
// `next/link` para el resto. Ver EnlacePublico.tsx.
import { EnlacePublico as Link } from "@/features/public-web/components/EnlacePublico";

import { siteBrand } from "../content/siteContent";

/**
 * Footer AIOR (layout limpio) con enlaces reales NELVYON.
 */
export function PublicFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer-wrapper footer-layout2" style={{ background: "#020817", color: "#fff" }}>
      <div className="widget-area space-top">
        <div className="container th-container5">
          <div className="row gy-4 justify-content-between">
            <div className="col-lg-4">
              <div className="widget footer-widget">
                <Link href="/" className="d-inline-flex align-items-center gap-2 mb-3">
                  <Image src="/logo.svg" alt={siteBrand.name} width={140} height={36} />
                </Link>
                <p style={{ color: "rgba(255,255,255,0.72)", maxWidth: 360 }}>{siteBrand.tagline}</p>
              </div>
            </div>
            <div className="col-6 col-md-4 col-lg-2">
              <div className="widget widget_nav_menu footer-widget">
                <h3 className="widget_title" style={{ color: "#fff", fontSize: 16 }}>
                  Producto
                </h3>
                <ul className="menu">
                  <li>
                    <Link href="/producto">SaaS</Link>
                  </li>
                  <li>
                    <Link href="/producto/ia">IA</Link>
                  </li>
                  <li>
                    <Link href="/agencia">Agencia</Link>
                  </li>
                  <li>
                    <Link href="/precios">Precios</Link>
                  </li>
                  <li>
                    <Link href="/enterprise">Enterprise</Link>
                  </li>
                </ul>
              </div>
            </div>
            <div className="col-6 col-md-4 col-lg-2">
              <div className="widget widget_nav_menu footer-widget">
                <h3 className="widget_title" style={{ color: "#fff", fontSize: 16 }}>
                  Recursos
                </h3>
                <ul className="menu">
                  <li>
                    <Link href="/recursos">Centro</Link>
                  </li>
                  <li>
                    <Link href="/blog">Blog</Link>
                  </li>
                  <li>
                    <Link href="/integraciones">Integraciones</Link>
                  </li>
                  <li>
                    <Link href="/faq">FAQ</Link>
                  </li>
                  <li>
                    <Link href="/seguridad">Seguridad</Link>
                  </li>
                </ul>
              </div>
            </div>
            <div className="col-6 col-md-4 col-lg-2">
              <div className="widget widget_nav_menu footer-widget">
                <h3 className="widget_title" style={{ color: "#fff", fontSize: 16 }}>
                  Legal
                </h3>
                <ul className="menu">
                  <li>
                    <Link href="/aviso-legal">Aviso legal</Link>
                  </li>
                  <li>
                    <Link href="/privacidad">Privacidad</Link>
                  </li>
                  <li>
                    <Link href="/cookies">Cookies</Link>
                  </li>
                  <li>
                    <Link href="/terminos">Términos</Link>
                  </li>
                  <li>
                    <Link href="/legal/dpa">DPA</Link>
                  </li>
                </ul>
              </div>
            </div>
            <div className="col-md-6 col-lg-2">
              <div className="widget footer-widget">
                <h3 className="widget_title" style={{ color: "#fff", fontSize: 16 }}>
                  Contacto
                </h3>
                <p style={{ color: "rgba(255,255,255,0.72)", fontSize: 14 }}>
                  <a href={`mailto:${siteBrand.contactEmail}`} style={{ color: "#33A1FF" }}>
                    {siteBrand.contactEmail}
                  </a>
                </p>
                <Link href="/contacto" className="th-btn2 btn-gradient2 mt-2 d-inline-block">
                  Solicitar demo
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="copyright-wrap" style={{ borderTop: "1px solid rgba(255,255,255,0.1)", padding: "20px 0" }}>
        <div className="container th-container5">
          <p className="mb-0 text-center" style={{ color: "rgba(255,255,255,0.55)", fontSize: 14 }}>
            © {year} {siteBrand.name}. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
