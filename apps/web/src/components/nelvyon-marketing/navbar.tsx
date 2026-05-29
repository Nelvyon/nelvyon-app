"use client";

import Link from "next/link";
import { useState } from "react";

import { NvLogo } from "./logo";

const LINKS = [
  { href: "/saas", label: "SaaS" },
  { href: "/servicios", label: "Servicios" },
  { href: "/nosotros", label: "Nosotros" },
  { href: "/blog", label: "Blog" },
  { href: "/contacto", label: "Contacto" },
];

export function NvNavbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="nv-navbar">
      <div className="nv-navbar__inner">
        <NvLogo size={32} priority />
        <nav className="nv-navbar__nav" aria-label="Principal">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="nv-navbar__link">
              {l.label}
            </Link>
          ))}
        </nav>
        <Link href="/contacto" className="nv-btn nv-btn--primary nv-navbar__cta">
          Solicitar demo
        </Link>
        <button type="button" className="nv-navbar__toggle" aria-expanded={open} aria-label="Menú" onClick={() => setOpen((v) => !v)}>
          {open ? "✕" : "☰"}
        </button>
      </div>
      {open ? (
        <nav className="nv-navbar__mobile" aria-label="Menú móvil">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setOpen(false)}>
              {l.label}
            </Link>
          ))}
          <Link href="/contacto" className="nv-btn nv-btn--primary" style={{ marginTop: 12, textAlign: "center" }} onClick={() => setOpen(false)}>
            Solicitar demo
          </Link>
        </nav>
      ) : null}
    </header>
  );
}
