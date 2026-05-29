"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

import { NELVYON_BLUE } from "@/components/agenforce/marketing-brand";

const navLinks = [
  { title: "Inicio", href: "/" },
  { title: "Servicios", href: "/servicios" },
  { title: "SaaS", href: "/saas" },
  { title: "Nosotros", href: "/nosotros" },
  { title: "Blog", href: "/blog" },
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
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "0 24px",
          height: "64px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "24px",
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            textDecoration: "none",
            flexShrink: 0,
            gap: "10px",
          }}
        >
          <Image src="/logo.png" alt="NELVYON" width={32} height={32} className="object-contain" priority />
          <span style={{ color: "rgba(255,255,255,0.95)", fontWeight: 650, fontSize: "17px", letterSpacing: "-0.03em" }}>
            NELVYON
          </span>
        </Link>

        <nav
          aria-label="Principal"
          className="nelvyon-nav-desktop"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "32px",
            flex: 1,
          }}
        >
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              style={{
                color: "rgba(255,255,255,0.7)",
                fontSize: "14px",
                fontWeight: 500,
                textDecoration: "none",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#ffffff";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "rgba(255,255,255,0.7)";
              }}
            >
              {item.title}
            </Link>
          ))}
        </nav>

        <Link
          href="/contacto"
          className="nelvyon-nav-cta mkt-btn"
          style={{
            display: "inline-flex",
            alignItems: "center",
            backgroundColor: NELVYON_BLUE,
            color: "#ffffff",
            fontWeight: 600,
            fontSize: "13px",
            padding: "9px 18px",
            borderRadius: "8px",
            textDecoration: "none",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          Solicitar demo
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
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: "8px",
            color: "#ffffff",
            fontSize: "16px",
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
          className="nelvyon-nav-mobile-panel"
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "0 24px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              style={{
                color: "rgba(255,255,255,0.88)",
                fontSize: "15px",
                fontWeight: 500,
                textDecoration: "none",
                padding: "12px 0",
              }}
            >
              {item.title}
            </Link>
          ))}
          <Link
            href="/contacto"
            onClick={() => setMobileOpen(false)}
            style={{
              marginTop: "12px",
              display: "block",
              textAlign: "center",
              backgroundColor: NELVYON_BLUE,
              color: "#ffffff",
              fontWeight: 600,
              fontSize: "14px",
              padding: "14px 20px",
              borderRadius: "8px",
              textDecoration: "none",
            }}
          >
            Solicitar demo
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
