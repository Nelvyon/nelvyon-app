"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { mainNav, siteBrand } from "../content/siteContent";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Header AIOR (header-layout9) con navegación y CTAs NELVYON.
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
                  <i className={open ? "far fa-times" : "far fa-bars"} aria-hidden />
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
            <i className="fal fa-times" aria-hidden />
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
