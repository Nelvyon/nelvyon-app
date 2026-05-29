"use client";

import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="nelvyon-footer" style={{ background: "#07122a" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
        <div
          className="nelvyon-footer-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "1.4fr 1fr 1fr 1fr",
            gap: "48px",
            marginBottom: "32px",
          }}
        >
          <div>
            <Link href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
              <Image src="/logo.png" alt="NELVYON" width={28} height={28} className="object-contain" />
              <span style={{ color: "rgba(255,255,255,0.95)", fontWeight: 650, fontSize: "17px", letterSpacing: "-0.03em" }}>NELVYON</span>
            </Link>
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", lineHeight: 1.6, maxWidth: "280px", margin: "0 0 8px" }}>
              Donde nace tu imperio, crece tu marca y se impone tu legado.
            </p>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.42)", margin: 0 }}>
              Plataforma operativa de marketing y automatización.
            </p>
          </div>
          {[
            {
              title: "Navegación",
              links: [
                ["Inicio", "/"],
                ["Servicios", "/servicios"],
                ["SaaS", "/saas"],
                ["Nosotros", "/nosotros"],
                ["Blog", "/blog"],
                ["Contacto", "/contacto"],
              ],
            },
            {
              title: "Servicios",
              links: [
                ["Publicidad digital", "/servicios"],
                ["Automatización", "/servicios"],
                ["CRM y pipeline", "/servicios"],
                ["Analítica", "/servicios"],
              ],
            },
            {
              title: "Legal",
              links: [
                ["Privacidad", "/privacidad"],
                ["Términos", "/terminos"],
                ["Cookies", "/cookies"],
              ],
            },
          ].map((col) => (
            <div key={col.title}>
              <h4
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.4)",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  marginBottom: "16px",
                }}
              >
                {col.title}
              </h4>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
                {col.links.map(([label, href]) => (
                  <li key={label}>
                    <Link
                      href={href}
                      style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", textDecoration: "none" }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = "#0084fc";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = "rgba(255,255,255,0.55)";
                      }}
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div
          style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            paddingTop: "24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)", margin: 0 }}>© 2026 NELVYON. Todos los derechos reservados.</p>
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.35)", margin: 0 }}>nelvyon.com · España</p>
        </div>
      </div>
      <style>{`
        @media (max-width: 768px) {
          .nelvyon-footer-grid { grid-template-columns: 1fr 1fr !important; gap: 24px !important; margin-bottom: 24px !important; }
        }
        @media (max-width: 480px) {
          .nelvyon-footer-grid { grid-template-columns: 1fr !important; gap: 20px !important; }
        }
      `}</style>
    </footer>
  );
}
