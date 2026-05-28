export function Testimonials() {
  const testimonials = [
    {
      name: "Carlos M.",
      role: "Director de Marketing — E-commerce Moda",
      avatar: "CM",
      text: "En 30 días NELVYON triplicó nuestro ROAS en Meta. Lo que antes hacía un equipo de 4 personas, ahora lo gestiona solo la plataforma.",
      stars: 5,
    },
    {
      name: "Laura P.",
      role: "CEO — Clínica Dental (Madrid)",
      avatar: "LP",
      text: "Las campañas de Google Ads se optimizan solas. Bajamos el coste por lead un 60% y duplicamos las reservas en 45 días.",
      stars: 5,
    },
    {
      name: "Sergio R.",
      role: "Fundador — SaaS B2B",
      avatar: "SR",
      text: "El mejor dinero que he invertido en marketing. Los agentes de NELVYON consiguen resultados que ninguna agencia me había dado.",
      stars: 5,
    },
    {
      name: "Ana G.",
      role: "Responsable Digital — Inmobiliaria",
      avatar: "AG",
      text: "WhatsApp automatizado + Meta Ads = máquina de leads. Cerramos 3 operaciones en el primer mes. Increíble.",
      stars: 5,
    },
    {
      name: "Miguel T.",
      role: "CMO — Retail (50+ tiendas)",
      avatar: "MT",
      text: "Pasamos de gastar €8.000/mes en agencia a €297/mes en NELVYON con mejores resultados. Sin comentarios.",
      stars: 5,
    },
    {
      name: "Elena V.",
      role: "Directora — Academia Online",
      avatar: "EV",
      text: "TikTok Ads automático nos generó 2.000 leads en 3 semanas para nuestro lanzamiento. Absolutamente brutal.",
      stars: 5,
    },
  ];
  return (
    <section style={{ backgroundColor: "#ffffff", padding: "64px 0" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>
        <div style={{ textAlign: "center", marginBottom: "40px" }}>
          <p style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#1a7fc4", marginBottom: "12px" }}>
            Lo que dicen nuestros clientes
          </p>
          <h2 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 800, color: "#07122a", margin: 0 }}>
            Resultados reales, empresas reales
          </h2>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
          {testimonials.map((t, i) => (
            <div
              key={i}
              style={{
                backgroundColor: "#f8faff",
                border: "1px solid #e8eef8",
                borderRadius: "20px",
                padding: "32px",
                display: "flex",
                flexDirection: "column",
                gap: "16px",
              }}
            >
              <div style={{ display: "flex", gap: "4px" }}>
                {Array.from({ length: t.stars }).map((_, si) => (
                  <span key={si} style={{ color: "#f59e0b", fontSize: "16px" }}>★</span>
                ))}
              </div>
              <p style={{ fontSize: "15px", color: "#374151", lineHeight: 1.6, margin: 0, fontStyle: "italic" }}>
                &ldquo;{t.text}&rdquo;
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "auto" }}>
                <div style={{
                  width: "42px", height: "42px", borderRadius: "50%",
                  background: "linear-gradient(135deg, #07122a, #1a7fc4)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#fff", fontSize: "13px", fontWeight: 700, flexShrink: 0,
                }}>
                  {t.avatar}
                </div>
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 700, color: "#07122a" }}>{t.name}</div>
                  <div style={{ fontSize: "12px", color: "#6b7a99" }}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
