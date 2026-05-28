"use client";

export function LogoCloud() {
  const logos = [
    { name: "Meta", slug: "meta", color: "#0081FB" },
    { name: "Google Ads", slug: "googleads", color: "#4285F4" },
    { name: "WhatsApp", slug: "whatsapp", color: "#25D366" },
    { name: "Stripe", slug: "stripe", color: "#635BFF" },
    { name: "LinkedIn", slug: "linkedin", color: "#0A66C2" },
    { name: "Zapier", slug: "zapier", color: "#FF4A00" },
    { name: "Mailchimp", slug: "mailchimp", color: "#FFE01B" },
    { name: "TikTok", slug: "tiktok", color: "#000000" },
    { name: "Shopify", slug: "shopify", color: "#96BF48" },
    { name: "HubSpot", slug: "hubspot", color: "#FF7A59" },
    { name: "Instagram", slug: "instagram", color: "#E4405F" },
    { name: "Slack", slug: "slack", color: "#4A154B" },
  ];
  const doubled = [...logos, ...logos];
  return (
    <section style={{ backgroundColor: "#ffffff", padding: "64px 0", borderTop: "1px solid #e8eef8", borderBottom: "1px solid #e8eef8", overflow: "hidden" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px", textAlign: "center", marginBottom: "40px" }}>
        <p style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#0084fc", marginBottom: "12px" }}>
          Diferenciadores
        </p>
        <h2 className="fade-in" style={{ fontSize: "clamp(24px, 3vw, 36px)", fontWeight: 800, color: "#07122a", margin: "0 0 32px" }}>
          Por qué NELVYON
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", textAlign: "left", marginBottom: "40px" }}>
          {[
            { title: "Plataforma y servicio en un mismo ecosistema", desc: "NELVYON no es solo una herramienta ni solo una agencia. Une tecnología operativa y ejecución profesional." },
            { title: "Operación 24/7", desc: "Los agentes expertos pueden mantener procesos activos de forma continua sin depender de horarios humanos." },
            { title: "Centralización real", desc: "Menos herramientas aisladas. Más control desde un entorno único." },
            { title: "Sin permanencia forzada", desc: "La relación se plantea mes a mes, con foco en utilidad real, claridad y continuidad profesional." },
            { title: "Preparado para escalar", desc: "La estructura permite trabajar con negocios locales, empresas en crecimiento, ecommerce, agencias y organizaciones con equipos más complejos." },
          ].map((d, i) => (
            <div key={i} style={{ backgroundColor: "#f8faff", border: "1px solid #e8eef8", borderRadius: "16px", padding: "20px" }}>
              <p style={{ fontSize: "15px", fontWeight: 700, color: "#07122a", margin: "0 0 8px" }}>{d.title}</p>
              <p style={{ fontSize: "14px", color: "#5a6a8a", margin: 0, lineHeight: 1.5 }}>{d.desc}</p>
            </div>
          ))}
        </div>
        <p style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#0084fc", marginBottom: "12px" }}>
          Integraciones
        </p>
        <h3 style={{ fontSize: "clamp(20px, 2.5vw, 28px)", fontWeight: 800, color: "#07122a", margin: 0 }}>
          Conectado con tu ecosistema
        </h3>
      </div>
      <div style={{ position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "120px", background: "linear-gradient(to right, #ffffff, transparent)", zIndex: 10, pointerEvents: "none" }} />
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: "120px", background: "linear-gradient(to left, #ffffff, transparent)", zIndex: 10, pointerEvents: "none" }} />
        <div
          style={{
            display: "flex",
            gap: "48px",
            width: "max-content",
            animation: "marquee 30s linear infinite",
            alignItems: "center",
          }}
        >
          {doubled.map((logo, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "8px",
                minWidth: "90px",
                opacity: 0.85,
                transition: "opacity 0.2s",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.opacity = "1")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.opacity = "0.85")}
            >
              <div
                style={{
                  width: "56px",
                  height: "56px",
                  borderRadius: "14px",
                  border: "1px solid #e8eef8",
                  backgroundColor: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 8px rgba(7,18,42,0.07)",
                  padding: "10px",
                }}
              >
                <img
                  src={`https://cdn.simpleicons.org/${logo.slug}/${logo.color.replace("#", "")}`}
                  alt={logo.name}
                  width={32}
                  height={32}
                  style={{ objectFit: "contain" }}
                />
              </div>
              <span style={{ fontSize: "11px", fontWeight: 600, color: "#5a6a8a", whiteSpace: "nowrap" }}>
                {logo.name}
              </span>
            </div>
          ))}
        </div>
      </div>
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </section>
  );
}
