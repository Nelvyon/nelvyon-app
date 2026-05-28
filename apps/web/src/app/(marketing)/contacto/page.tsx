import type { Metadata } from "next";
import { CtaFinal } from "@/components/agenforce/cta-final";
import { NavyToWhiteTransition } from "@/components/agenforce/section-transition";

export const metadata: Metadata = {
  title: "Contacto | NELVYON — Habla con un experto",
  description: "Contacta con NELVYON. Te respondemos en menos de 24h para analizar tu negocio y diseñar tu estrategia de marketing automatizado.",
};

export default function ContactoPage() {
  return (
    <main>
      <section style={{ backgroundColor: "#07122a", padding: "120px 0 0" }}>
        <div style={{ maxWidth: "700px", margin: "0 auto", padding: "0 24px 80px", textAlign: "center" }}>
          <p style={{ fontSize: "13px", fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#00d6fe", marginBottom: "16px" }}>
            Contacto
          </p>
          <h1 style={{ fontSize: "clamp(36px, 6vw, 56px)", fontWeight: 900, color: "#ffffff", margin: "0 0 20px", lineHeight: 1.1 }}>
            Hablemos de tu crecimiento
          </h1>
          <p style={{ fontSize: "20px", color: "#a8c8e8", margin: 0, lineHeight: 1.6 }}>
            Cuéntanos tu negocio. Te respondemos en menos de 24h con un plan personalizado.
          </p>
        </div>
        <NavyToWhiteTransition />
      </section>
      <section style={{ backgroundColor: "#ffffff", padding: "96px 0" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "64px", alignItems: "start" }}>
            <div>
              <h2 style={{ fontSize: "28px", fontWeight: 800, color: "#07122a", margin: "0 0 20px" }}>
                ¿Por qué contactar con nosotros?
              </h2>
              <p style={{ fontSize: "16px", color: "#5a6a8a", lineHeight: 1.7, margin: "0 0 32px" }}>
                No somos una agencia más. Analizamos tu negocio, identificamos las oportunidades de crecimiento y te proponemos un plan de automatización específico para ti.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
                {[
                  { icon: "⚡", title: "Respuesta en 24h", desc: "Revisamos tu caso y te contactamos con un plan concreto." },
                  { icon: "🎯", title: "Análisis gratuito", desc: "Auditamos tus campañas actuales sin coste y sin compromiso." },
                  { icon: "🤝", title: "Sin permanencia", desc: "Empieza cuando quieras, cancela cuando quieras." },
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", gap: "16px" }}>
                    <div style={{ width: "44px", height: "44px", borderRadius: "12px", backgroundColor: "#e8f0fb", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>
                      {item.icon}
                    </div>
                    <div>
                      <h3 style={{ fontSize: "15px", fontWeight: 700, color: "#07122a", margin: "0 0 4px" }}>{item.title}</h3>
                      <p style={{ fontSize: "14px", color: "#6b7a99", margin: 0 }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: "40px", padding: "24px", backgroundColor: "#f8faff", border: "1px solid #e8eef8", borderRadius: "16px" }}>
                <p style={{ fontSize: "14px", fontWeight: 600, color: "#07122a", margin: "0 0 8px" }}>¿Prefieres escribirnos directamente?</p>
                <a href="mailto:hola@nelvyon.com" style={{ fontSize: "15px", color: "#0084fc", fontWeight: 700, textDecoration: "none" }}>
                  hola@nelvyon.com
                </a>
              </div>
            </div>
            <div style={{ backgroundColor: "#f8faff", border: "1px solid #e8eef8", borderRadius: "24px", padding: "40px" }}>
              <h3 style={{ fontSize: "22px", fontWeight: 800, color: "#07122a", margin: "0 0 28px" }}>
                Solicita tu análisis gratuito
              </h3>
              <form
                action="https://formspree.io/f/xpwzgvbq"
                method="POST"
                style={{ display: "flex", flexDirection: "column", gap: "20px" }}
              >
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#07122a", marginBottom: "6px" }}>Nombre *</label>
                    <input type="text" name="nombre" required placeholder="Tu nombre" style={{ width: "100%", padding: "12px 16px", border: "1px solid #d1dce8", borderRadius: "10px", fontSize: "14px", color: "#07122a", backgroundColor: "#ffffff", outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#07122a", marginBottom: "6px" }}>Empresa</label>
                    <input type="text" name="empresa" placeholder="Tu empresa" style={{ width: "100%", padding: "12px 16px", border: "1px solid #d1dce8", borderRadius: "10px", fontSize: "14px", color: "#07122a", backgroundColor: "#ffffff", outline: "none", boxSizing: "border-box" }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#07122a", marginBottom: "6px" }}>Email *</label>
                  <input type="email" name="email" required placeholder="tu@email.com" style={{ width: "100%", padding: "12px 16px", border: "1px solid #d1dce8", borderRadius: "10px", fontSize: "14px", color: "#07122a", backgroundColor: "#ffffff", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#07122a", marginBottom: "6px" }}>Teléfono (WhatsApp)</label>
                  <input type="tel" name="telefono" placeholder="+34 600 000 000" style={{ width: "100%", padding: "12px 16px", border: "1px solid #d1dce8", borderRadius: "10px", fontSize: "14px", color: "#07122a", backgroundColor: "#ffffff", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#07122a", marginBottom: "6px" }}>¿Qué necesitas?</label>
                  <select name="servicio" style={{ width: "100%", padding: "12px 16px", border: "1px solid #d1dce8", borderRadius: "10px", fontSize: "14px", color: "#07122a", backgroundColor: "#ffffff", outline: "none", boxSizing: "border-box" }}>
                    <option value="">Selecciona un servicio</option>
                    <option value="meta-ads">Meta Ads (Facebook & Instagram)</option>
                    <option value="google-ads">Google Ads</option>
                    <option value="tiktok-ads">TikTok Ads</option>
                    <option value="whatsapp">WhatsApp Marketing</option>
                    <option value="email">Email Marketing</option>
                    <option value="web-autopilot">Web Autopilot (NELVYON OS)</option>
                    <option value="saas">Plataforma SaaS completa</option>
                    <option value="todo">Todo — plan completo</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#07122a", marginBottom: "6px" }}>Mensaje</label>
                  <textarea name="mensaje" rows={4} placeholder="Cuéntanos tu situación, objetivos o dudas..." style={{ width: "100%", padding: "12px 16px", border: "1px solid #d1dce8", borderRadius: "10px", fontSize: "14px", color: "#07122a", backgroundColor: "#ffffff", outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
                </div>
                <button type="submit" style={{ backgroundColor: "#0084fc", color: "#ffffff", fontWeight: 700, fontSize: "15px", padding: "14px 24px", borderRadius: "12px", border: "none", cursor: "pointer", width: "100%" }}>
                  Enviar solicitud →
                </button>
                <p style={{ fontSize: "12px", color: "#9aabbf", textAlign: "center", margin: 0 }}>
                  Al enviar aceptas nuestra política de privacidad. Sin spam, garantizado.
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>
      <CtaFinal />
    </main>
  );
}
