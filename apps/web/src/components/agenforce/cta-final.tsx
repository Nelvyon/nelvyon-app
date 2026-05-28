import Link from "next/link";

export function CtaFinal() {
  return (
    <section style={{ padding: "64px 0", background: "linear-gradient(135deg, #07122a 0%, #0084fc 50%, #00d6fe 100%)" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
        <h2 style={{ fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 900, color: "#ffffff", margin: "0 0 20px", lineHeight: 1.15 }}>
          Tu imperio empieza hoy.
        </h2>
        <p style={{ fontSize: "20px", color: "#a8c8e8", margin: "0 0 48px", lineHeight: 1.6 }}>
          Únete a las empresas que ya automatizan su crecimiento con NELVYON. Sin agencias, sin equipos, sin límites.
        </p>
        <div style={{ display: "flex", gap: "16px", justifyContent: "center", flexWrap: "wrap" }}>
          <a
            href="/contacto"
            style={{
              display: "inline-block",
              backgroundColor: "#ffffff",
              color: "#07122a",
              fontWeight: 700,
              fontSize: "16px",
              padding: "16px 40px",
              borderRadius: "12px",
              textDecoration: "none",
              border: "2px solid #ffffff",
            }}
          >
            Empezar gratis →
          </a>
          <Link
            href="/servicios"
            style={{
              display: "inline-block",
              backgroundColor: "transparent",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: "16px",
              padding: "16px 40px",
              borderRadius: "12px",
              textDecoration: "none",
              border: "2px solid rgba(255,255,255,0.3)",
            }}
          >
            Ver servicios
          </Link>
        </div>
        <p style={{ fontSize: "13px", color: "#6b8aaa", marginTop: "24px" }}>
          Sin permanencia · Cancela cuando quieras · Configuración en 24h
        </p>
      </div>
    </section>
  );
}
