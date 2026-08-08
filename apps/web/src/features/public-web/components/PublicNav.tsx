"use client";

import Image from "next/image";
// Enlace que usa `<a>` para las rutas servidas por el pack estatico y
// `next/link` para el resto. Ver EnlacePublico.tsx.
import { EnlacePublico as Link } from "@/features/public-web/components/EnlacePublico";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { mainNav, siteBrand } from "../content/siteContent";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Header público NELVYON (layout header-9) con navegación y CTAs.
 */
export function PublicNav() {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className={`th-header header-layout9${scrolled ? " sticky" : ""}`}>
      <div className="sticky-wrapper">
        <div className="container th-container">
          <div className="menu-area">
            <div className="row align-items-center justify-content-between">
              <div className="col-auto">
                <div className="header-logo">
                  <Link href="/" className="icon-masking d-inline-flex align-items-center gap-2">
                    <Image src="/logo.svg" alt={siteBrand.name} width={140} height={36} priority />
                  </Link>
                </div>
              </div>
              <div className="col-auto">
                <nav className="main-menu d-none d-lg-inline-block" aria-label="Principal">
                  <ul>
                    {mainNav.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          aria-current={isActive(pathname, item.href) ? "page" : undefined}
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                    <li>
                      <Link href="/contacto" aria-current={isActive(pathname, "/contacto") ? "page" : undefined}>
                        Contacto
                      </Link>
                    </li>
                  </ul>
                </nav>
                <button
                  type="button"
                  className="th-menu-toggle d-block d-lg-none"
                  aria-label={open ? "Cerrar menú" : "Abrir menú"}
                  aria-expanded={open}
                  onClick={() => setOpen((v) => !v)}
                >
                  {open ? (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  )}
                </button>
              </div>
              <div className="col-auto d-none d-xl-block">
                <div className="header-button">
                  <Link href="/login" className="th-btn2 style2">
                    Entrar
                  </Link>
                  <Link href="/contacto" className="th-btn2 btn-gradient2">
                    Solicitar demo
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile drawer */}
      <div className={`th-menu-wrapper${open ? " th-body-visible" : ""}`} style={open ? { visibility: "visible" } : undefined}>
        <div className="th-menu-area text-center">
          <button type="button" className="th-menu-toggle" onClick={() => setOpen(false)} aria-label="Cerrar">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <div className="mobile-logo mb-4">
            <Link href="/" onClick={() => setOpen(false)}>
              <Image src="/logo.svg" alt={siteBrand.name} width={140} height={36} />
            </Link>
          </div>
          <div className="th-mobile-menu">
            <ul>
              {mainNav.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} onClick={() => setOpen(false)}>
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/contacto" onClick={() => setOpen(false)}>
                  Contacto
                </Link>
              </li>
              <li>
                <Link href="/login" onClick={() => setOpen(false)}>
                  Entrar al SaaS
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </header>
  );
}
