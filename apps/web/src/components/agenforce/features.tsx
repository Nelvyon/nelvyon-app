import Link from "next/link";

export function Features() {
  const servicios = [
    { title: "Publicidad digital", desc: "Campañas en Meta, Google, TikTok, LinkedIn y más, con estructura y seguimiento responsable." },
    { title: "SEO técnico", desc: "Auditoría y optimización de indexación, rendimiento, arquitectura y visibilidad orgánica." },
    { title: "Marketing de contenidos", desc: "Contenido estratégico para educar, posicionar y comunicar con claridad." },
    { title: "Automatización de procesos", desc: "Flujos que conectan formularios, CRM, email, WhatsApp y reporting." },
    { title: "Diseño web y ecommerce", desc: "Páginas, landings y tiendas con estructura clara y experiencia cuidada." },
    { title: "Analítica y reporting", desc: "Medición, eventos y paneles para interpretar la actividad con precisión." },
  ];

  return (
    <section style={{ backgroundColor: "#f8faff", padding: "96px 0" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "24px", marginBottom: "48px" }}>
          <div>
            <p style={{ fontSize: "12px", fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "#0084fc", marginBottom: "12px" }}>
              Servicios
            </p>
            <h2 className="fade-in" style={{ fontSize: "clamp(26px, 3.5vw, 40px)", fontWeight: 800, color: "#07122a", margin: 0 }}>
              Servicios destacados
            </h2>
          </div>
          <Link href="/servicios" style={{ fontSize: "14px", fontWeight: 600, color: "#0084fc", textDecoration: "none" }}>
            Ver los 16 servicios →
          </Link>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "16px",
          }}
          className="nelvyon-servicios-grid"
        >
          {servicios.map((s) => (
            <div
              key={s.title}
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #e8eef8",
                borderRadius: "12px",
                padding: "28px",
              }}
            >
              <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#07122a", margin: "0 0 8px" }}>{s.title}</h3>
              <p style={{ fontSize: "14px", color: "#5a6a8a", lineHeight: 1.55, margin: 0 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @media (max-width: 900px) {
          .nelvyon-servicios-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 520px) {
          .nelvyon-servicios-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </section>
  );
}
