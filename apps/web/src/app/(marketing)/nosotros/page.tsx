import type { Metadata } from "next";
import { CtaFinal } from "@/components/agenforce/cta-final";
import { NavyToWhiteTransition } from "@/components/agenforce/section-transition";

export const metadata: Metadata = {
  title: "Nosotros | NELVYON — La empresa detrás de la automatización",
  description: "NELVYON nació para democratizar el marketing de precisión. Conoce nuestra misión, visión y el equipo de agentes expertos que lo hacen posible.",
};

const values = [
  { icon: "🚀", title: "Automatización total", desc: "Creemos que el marketing eficiente no debería requerir un ejército de personas. Los agentes lo hacen todo." },
  { icon: "🎯", title: "Resultados, no promesas", desc: "Cada euro de nuestros clientes tiene que tener un retorno medible. Sin excusas, sin humo." },
  { icon: "🌍", title: "Escala global", desc: "Nuestras herramientas están pensadas para empresas que quieren crecer sin fronteras." },
  { icon: "🔒", title: "Confianza y transparencia", desc: "Datos seguros, precios claros y sin letra pequeña. Así construimos relaciones duraderas." },
];

const milestones = [
  { year: "2024", title: "Nace NELVYON", desc: "Fundada con la misión de democratizar el marketing automatizado para empresas de todos los tamaños." },
  { year: "2025", title: "Primeros 100 clientes", desc: "Validación del modelo: ROAS medio x3 frente a agencias tradicionales. Primeros €500K ARR." },
  { year: "2026", title: "Lanzamiento SaaS global", desc: "Apertura de la plataforma SaaS con agentes expertos. Expansión a Europa y LATAM." },
  { year: "2030", title: "10M clientes objetivo", desc: "Visión de convertirnos en la plataforma de marketing automatizado líder a nivel mundial." },
];

export default function NosotrosPage() {
  return (
    <main>
      <section style={{ backgroundColor: "#07122a", padding: "120px 0 0" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "0 24px 80px", textAlign: "center" }}>
          <p style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#00d6fe", marginBottom: "16px" }}>
            Sobre NELVYON
          </p>
          <h1 style={{ fontSize: "clamp(36px, 6vw, 60px)", fontWeight: 900, color: "#ffffff", margin: "0 0 20px", lineHeight: 1.1 }}>
            Donde nace tu imperio,<br />crece tu marca y<br />se impone tu legado
          </h1>
          <p style={{ fontSize: "20px", color: "#a8c8e8", margin: 0, lineHeight: 1.6 }}>
            NELVYON es la plataforma de marketing automatizado que está redefiniendo cómo las empresas crecen en la era digital.
          </p>
        </div>
        <NavyToWhiteTransition />
      </section>
      <section style={{ backgroundColor: "#ffffff", padding: "96px 0" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "80px", alignItems: "center" }}>
            <div>
              <p style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#0084fc", marginBottom: "16px" }}>
                Nuestra misión
              </p>
              <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, color: "#07122a", margin: "0 0 20px", lineHeight: 1.2 }}>
                Democratizar el marketing de precisión
              </h2>
              <p style={{ fontSize: "17px", color: "#5a6a8a", lineHeight: 1.7, margin: "0 0 16px" }}>
                Antes, acceder a campañas de marketing de alto rendimiento requería grandes agencias, equipos caros y meses de trabajo. NELVYON lo cambia todo.
              </p>
              <p style={{ fontSize: "17px", color: "#5a6a8a", lineHeight: 1.7, margin: 0 }}>
                Nuestros agentes expertos dan a cualquier empresa — desde startups hasta grandes corporaciones — la capacidad de competir con los mejores, sin el coste y la complejidad de hacerlo de forma tradicional.
              </p>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              {[
                { v: "10M+", l: "Clientes objetivo 2030" },
                { v: "€2.4B", l: "ARR proyectado" },
                { v: "3x", l: "ROI medio clientes" },
                { v: "24/7", l: "Automatización activa" },
              ].map((s, i) => (
                <div key={i} style={{ backgroundColor: "#f8faff", border: "1px solid #e8eef8", borderRadius: "20px", padding: "28px", textAlign: "center" }}>
                  <div style={{ fontSize: "36px", fontWeight: 900, color: "#0084fc", marginBottom: "8px" }}>{s.v}</div>
                  <div style={{ fontSize: "13px", color: "#6b7a99", fontWeight: 600 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section style={{ backgroundColor: "#f8faff", padding: "96px 0" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: "56px" }}>
            <p style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#0084fc", marginBottom: "12px" }}>
              Lo que nos define
            </p>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, color: "#07122a", margin: 0 }}>
              Nuestros valores
            </h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px" }}>
            {values.map((v, i) => (
              <div key={i} style={{ backgroundColor: "#ffffff", border: "1px solid #e8eef8", borderRadius: "20px", padding: "32px", textAlign: "center" }}>
                <div style={{ fontSize: "40px", marginBottom: "16px" }}>{v.icon}</div>
                <h3 style={{ fontSize: "17px", fontWeight: 800, color: "#07122a", margin: "0 0 10px" }}>{v.title}</h3>
                <p style={{ fontSize: "14px", color: "#5a6a8a", lineHeight: 1.6, margin: 0 }}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section style={{ backgroundColor: "#ffffff", padding: "96px 0" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "0 24px" }}>
          <div style={{ textAlign: "center", marginBottom: "56px" }}>
            <p style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#0084fc", marginBottom: "12px" }}>
              Nuestra historia
            </p>
            <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, color: "#07122a", margin: 0 }}>
              El camino al liderazgo mundial
            </h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
            {milestones.map((m, i) => (
              <div key={i} style={{ display: "flex", gap: "24px", paddingBottom: i < milestones.length - 1 ? "40px" : "0" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div style={{ width: "48px", height: "48px", borderRadius: "50%", background: "linear-gradient(135deg, #07122a, #0084fc)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "12px", fontWeight: 800, flexShrink: 0 }}>
                    {m.year}
                  </div>
                  {i < milestones.length - 1 && (
                    <div style={{ width: "2px", flex: 1, backgroundColor: "#e8eef8", marginTop: "8px" }} />
                  )}
                </div>
                <div style={{ paddingTop: "10px" }}>
                  <h3 style={{ fontSize: "18px", fontWeight: 800, color: "#07122a", margin: "0 0 8px" }}>{m.title}</h3>
                  <p style={{ fontSize: "15px", color: "#5a6a8a", lineHeight: 1.6, margin: 0 }}>{m.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <CtaFinal />
    </main>
  );
}
