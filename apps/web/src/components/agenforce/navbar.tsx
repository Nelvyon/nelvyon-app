"use client";

import Link from "next/link";
import { useState } from "react";

const navLinks = [
  { title: "Inicio", href: "/" },
  { title: "Servicios", href: "/servicios" },
  { title: "SaaS", href: "/saas" },
  { title: "Nosotros", href: "/nosotros" },
  { title: "Precios", href: "/#precios" },
  { title: "Contacto", href: "/contacto" },
];

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backgroundColor: "#07122a",
        padding: "16px 24px",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "24px",
        }}
      >
        <Link
          href="/"
          style={{
            color: "#ffffff",
            fontWeight: 800,
            fontSize: "20px",
            textDecoration: "none",
            letterSpacing: "-0.02em",
            flexShrink: 0,
          }}
        >
          NELVYON
        </Link>

        <nav
          aria-label="Principal"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "28px",
            flex: 1,
          }}
          className="nelvyon-nav-desktop"
        >
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                color: "rgba(255,255,255,0.85)",
                fontSize: "14px",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              {item.title}
            </Link>
          ))}
        </nav>

        <Link
          href="/contacto"
          className="nelvyon-nav-cta"
          style={{
            display: "inline-block",
            backgroundColor: "#1a7fc4",
            color: "#ffffff",
            fontWeight: 700,
            fontSize: "14px",
            padding: "10px 20px",
            borderRadius: "10px",
            textDecoration: "none",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          Empezar gratis →
        </Link>

        <button
          type="button"
          aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
          className="nelvyon-nav-mobile-toggle"
          style={{
            display: "none",
            alignItems: "center",
            justifyContent: "center",
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: "8px",
            color: "#ffffff",
            fontSize: "18px",
            width: "40px",
            height: "40px",
            cursor: "pointer",
            flexShrink: 0,
          }}
        >
          {mobileOpen ? "✕" : "☰"}
        </button>
      </div>

      {mobileOpen ? (
        <nav
          aria-label="Principal móvil"
          style={{
            maxWidth: "1200px",
            margin: "16px auto 0",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            paddingTop: "16px",
            borderTop: "1px solid rgba(255,255,255,0.1)",
          }}
          className="nelvyon-nav-mobile-panel"
        >
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              style={{
                color: "#ffffff",
                fontSize: "15px",
                fontWeight: 600,
                textDecoration: "none",
                padding: "8px 0",
              }}
            >
              {item.title}
            </Link>
          ))}
          <Link
            href="/contacto"
            onClick={() => setMobileOpen(false)}
            style={{
              marginTop: "8px",
              display: "inline-block",
              textAlign: "center",
              backgroundColor: "#1a7fc4",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "14px",
              padding: "12px 20px",
              borderRadius: "10px",
              textDecoration: "none",
            }}
          >
            Empezar gratis →
          </Link>
        </nav>
      ) : null}

      <style>{`
        @media (max-width: 899px) {
          .nelvyon-nav-desktop { display: none !important; }
          .nelvyon-nav-cta { display: none !important; }
          .nelvyon-nav-mobile-toggle { display: flex !important; }
        }
      `}</style>
    </header>
  );
}
