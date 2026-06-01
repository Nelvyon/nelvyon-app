"use client";

import Link from "next/link";
import { useState } from "react";

import { NelvyonLogo } from "@/components/agenforce/nelvyon-logo";

const navLinks = [
  { title: "Inicio", href: "/" },
  { title: "SaaS", href: "/saas" },
  { title: "Nosotros", href: "/nosotros" },
  { title: "Blog", href: "/blog" },
  { title: "Contacto", href: "/contacto" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="nelvyon-navbar">
      <div className="nelvyon-navbar__accent" aria-hidden />
      <div className="nelvyon-navbar__inner">
        <div className="nelvyon-navbar__brand">
          <NelvyonLogo height={42} priority />
        </div>

        <nav aria-label="Principal" className="nelvyon-nav-desktop">
          {navLinks.map((item) => (
            <Link key={item.href} href={item.href} className="nelvyon-navbar__link">
              {item.title}
            </Link>
          ))}
        </nav>

        <div className="nelvyon-navbar__actions">
          <Link href="/contacto" className="nelvyon-nav-cta nelvyon-btn-primary nelvyon-navbar__cta">
            Solicitar información
          </Link>
          <button
            type="button"
            aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
            className="nelvyon-nav-mobile-toggle"
          >
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <nav aria-label="Principal móvil" className="nelvyon-nav-mobile-panel">
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="nelvyon-nav-mobile-panel__link"
            >
              {item.title}
            </Link>
          ))}
          <Link href="/contacto" onClick={() => setMobileOpen(false)} className="nelvyon-nav-mobile-panel__cta">
            Solicitar información
          </Link>
        </nav>
      ) : null}
    </header>
  );
}
