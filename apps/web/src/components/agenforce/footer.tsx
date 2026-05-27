import React from "react";
import { Logo } from "./logo";
import { Container } from "./container";
import Link from "next/link";
import { IconBrandInstagram, IconBrandLinkedin, IconBrandTwitter } from "@tabler/icons-react";
export const Footer = () => {
  return (
    <footer style={{ background: "#07122a", paddingTop: "64px", paddingBottom: "32px" }}>
      <Container>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "48px", marginBottom: "48px" }}>
          <div>
            <div style={{ marginBottom: "16px" }}>
              <Logo />
            </div>
            <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.55)", lineHeight: 1.6, maxWidth: "280px", margin: "0 0 24px 0" }}>
              Donde nace tu imperio, crece tu marca y se impone tu legado.
            </p>
            <div style={{ display: "flex", gap: "12px" }}>
              {[IconBrandTwitter, IconBrandInstagram, IconBrandLinkedin].map((Icon, i) => (
                <Link key={i} href="#" style={{ width: "36px", height: "36px", borderRadius: "8px", background: "rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon style={{ width: "16px", height: "16px", color: "rgba(255,255,255,0.6)" }} />
                </Link>
              ))}
            </div>
          </div>
          {[
            { title: "Producto", links: [["Inicio", "/"], ["SaaS", "/saas"], ["Servicios", "/servicios"], ["Precios", "/pricing"]] },
            { title: "Empresa", links: [["Nosotros", "/nosotros"], ["Blog", "/blog"], ["Contacto", "/contacto"]] },
            { title: "Legal", links: [["Privacidad", "/privacidad"], ["Términos", "/terminos"], ["Cookies", "/cookies"]] },
          ].map((col) => (
            <div key={col.title}>
              <h4 style={{ fontSize: "13px", fontWeight: 600, color: "rgba(255,255,255,0.5)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "16px" }}>{col.title}</h4>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
                {col.links.map(([label, href]) => (
                  <li key={label}>
                    <Link href={href} style={{ fontSize: "14px", color: "rgba(255,255,255,0.6)", textDecoration: "none" }}>{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>© 2026 NELVYON. Todos los derechos reservados.</p>
          <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.4)" }}>Madrid, España</p>
        </div>
      </Container>
    </footer>
  );
};
