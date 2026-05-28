import type { Metadata } from "next";
import { CtaFinal } from "@/components/agenforce/cta-final";
import { MarketingPageHero } from "@/components/agenforce/marketing-page-hero";

export const metadata: Metadata = {
  title: "Contacto | NELVYON — Habla con un experto",
  description: "Contacta con NELVYON para estructurar marketing, ventas, automatización y reporting con criterio profesional.",
};

export default function ContactoPage() {
  return (
    <main>
      <MarketingPageHero
        eyebrow="Contacto"
        title="Hablemos de tu operación digital"
        subtitle="Cuéntanos qué necesita tu empresa y estudiaremos cómo NELVYON puede ayudarte a estructurar marketing, ventas, automatización y reporting."
      />
      <section className="nelvyon-mkt-section" style={{ backgroundColor: "#ffffff" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 24px" }}>
          <div className="nelvyon-contacto-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "64px", alignItems: "start" }}>
            <div>
              <p style={{ fontSize: "16px", color: "#5a6a8a", lineHeight: 1.7, margin: "0 0 32px" }}>
                Este formulario no es para recibir una propuesta genérica. Es para entender tu situación actual y valorar qué estructura puede tener sentido para tu empresa.
              </p>
              <div style={{ marginBottom: "32px" }}>
                <p style={{ fontSize: "14px", fontWeight: 600, color: "#07122a", margin: "0 0 12px" }}>Información de contacto</p>
                <p style={{ fontSize: "14px", color: "#5a6a8a", margin: "0 0 8px" }}>Web: nelvyon.com</p>
                <a href="mailto:contacto@nelvyon.com" style={{ fontSize: "15px", color: "#0084fc", fontWeight: 700, textDecoration: "none", display: "block", marginBottom: "8px" }}>
                  contacto@nelvyon.com
                </a>
                <p style={{ fontSize: "14px", color: "#5a6a8a", margin: "0 0 4px" }}>Horario: Lunes a viernes</p>
                <p style={{ fontSize: "14px", color: "#5a6a8a", margin: 0 }}>Idioma: Español</p>
              </div>
              <p style={{ fontSize: "15px", color: "#5a6a8a", lineHeight: 1.7, margin: 0 }}>
                NELVYON trabaja con empresas que buscan claridad, estructura y operación seria. No prometemos resultados irreales. No vendemos soluciones genéricas. No construimos sistemas sin entender primero el negocio. Si tu empresa necesita ordenar su marketing, automatizar procesos y trabajar con una plataforma preparada para operar de forma continua, podemos hablar.
              </p>
            </div>
            <div style={{ backgroundColor: "#f8faff", border: "1px solid #e8eef8", borderRadius: "24px", padding: "40px" }}>
              <h3 style={{ fontSize: "22px", fontWeight: 800, color: "#07122a", margin: "0 0 28px" }}>
                Cuéntanos tu situación
              </h3>
              <form
                action="https://formspree.io/f/xpwzgvbq"
                method="POST"
                style={{ display: "flex", flexDirection: "column", gap: "20px" }}
              >
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#07122a", marginBottom: "6px" }}>Nombre completo *</label>
                  <input type="text" name="nombre" required placeholder="Tu nombre completo" style={{ width: "100%", padding: "12px 16px", border: "1px solid #d1dce8", borderRadius: "10px", fontSize: "14px", color: "#07122a", backgroundColor: "#ffffff", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div className="nelvyon-form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#07122a", marginBottom: "6px" }}>Empresa</label>
                    <input type="text" name="empresa" placeholder="Tu empresa" style={{ width: "100%", padding: "12px 16px", border: "1px solid #d1dce8", borderRadius: "10px", fontSize: "14px", color: "#07122a", backgroundColor: "#ffffff", outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#07122a", marginBottom: "6px" }}>Cargo</label>
                    <input type="text" name="cargo" placeholder="Tu cargo" style={{ width: "100%", padding: "12px 16px", border: "1px solid #d1dce8", borderRadius: "10px", fontSize: "14px", color: "#07122a", backgroundColor: "#ffffff", outline: "none", boxSizing: "border-box" }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#07122a", marginBottom: "6px" }}>Email corporativo *</label>
                  <input type="email" name="email" required placeholder="tu@empresa.com" style={{ width: "100%", padding: "12px 16px", border: "1px solid #d1dce8", borderRadius: "10px", fontSize: "14px", color: "#07122a", backgroundColor: "#ffffff", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div className="nelvyon-form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#07122a", marginBottom: "6px" }}>Teléfono</label>
                    <input type="tel" name="telefono" placeholder="+34 600 000 000" style={{ width: "100%", padding: "12px 16px", border: "1px solid #d1dce8", borderRadius: "10px", fontSize: "14px", color: "#07122a", backgroundColor: "#ffffff", outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#07122a", marginBottom: "6px" }}>Página web</label>
                    <input type="url" name="web" placeholder="https://tuempresa.com" style={{ width: "100%", padding: "12px 16px", border: "1px solid #d1dce8", borderRadius: "10px", fontSize: "14px", color: "#07122a", backgroundColor: "#ffffff", outline: "none", boxSizing: "border-box" }} />
                  </div>
                </div>
                <div className="nelvyon-form-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#07122a", marginBottom: "6px" }}>Sector</label>
                    <input type="text" name="sector" placeholder="Tu sector" style={{ width: "100%", padding: "12px 16px", border: "1px solid #d1dce8", borderRadius: "10px", fontSize: "14px", color: "#07122a", backgroundColor: "#ffffff", outline: "none", boxSizing: "border-box" }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#07122a", marginBottom: "6px" }}>Tamaño del equipo</label>
                    <input type="text" name="tamano_equipo" placeholder="Ej. 5-20 personas" style={{ width: "100%", padding: "12px 16px", border: "1px solid #d1dce8", borderRadius: "10px", fontSize: "14px", color: "#07122a", backgroundColor: "#ffffff", outline: "none", boxSizing: "border-box" }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#07122a", marginBottom: "6px" }}>Servicios de interés</label>
                  <select name="servicios_interes" style={{ width: "100%", padding: "12px 16px", border: "1px solid #d1dce8", borderRadius: "10px", fontSize: "14px", color: "#07122a", backgroundColor: "#ffffff", outline: "none", boxSizing: "border-box" }}>
                    <option value="">Selecciona una opción</option>
                    <option value="servicios">Servicios profesionales</option>
                    <option value="saas">Plataforma SaaS</option>
                    <option value="ambos">Servicios + SaaS</option>
                    <option value="publicidad">Publicidad digital</option>
                    <option value="automatizacion">Automatización</option>
                    <option value="crm">CRM y pipeline</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#07122a", marginBottom: "6px" }}>Herramientas actuales</label>
                  <input type="text" name="herramientas" placeholder="CRM, ads, email, etc." style={{ width: "100%", padding: "12px 16px", border: "1px solid #d1dce8", borderRadius: "10px", fontSize: "14px", color: "#07122a", backgroundColor: "#ffffff", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#07122a", marginBottom: "6px" }}>Principal necesidad</label>
                  <input type="text" name="principal_necesidad" placeholder="Qué necesitas resolver" style={{ width: "100%", padding: "12px 16px", border: "1px solid #d1dce8", borderRadius: "10px", fontSize: "14px", color: "#07122a", backgroundColor: "#ffffff", outline: "none", boxSizing: "border-box" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 700, color: "#07122a", marginBottom: "6px" }}>Mensaje</label>
                  <textarea name="mensaje" rows={4} placeholder="Cuéntanos tu situación, objetivos o contexto..." style={{ width: "100%", padding: "12px 16px", border: "1px solid #d1dce8", borderRadius: "10px", fontSize: "14px", color: "#07122a", backgroundColor: "#ffffff", outline: "none", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" }} />
                </div>
                <button type="submit" style={{ backgroundColor: "#0084fc", color: "#ffffff", fontWeight: 700, fontSize: "15px", padding: "14px 24px", borderRadius: "12px", border: "none", cursor: "pointer", width: "100%" }}>
                  Enviar solicitud
                </button>
                <p style={{ fontSize: "12px", color: "#9aabbf", textAlign: "center", margin: 0 }}>
                  Al enviar aceptas nuestra política de privacidad.
                </p>
              </form>
            </div>
          </div>
        </div>
      </section>
      <CtaFinal
        title="Empieza por ordenar el sistema"
        subtitle="El crecimiento serio necesita procesos claros, tecnología fiable y ejecución constante."
        primaryLabel="Contactar con NELVYON"
        showSecondary={false}
      />
      <style>{`
        @media (max-width: 768px) {
          .nelvyon-contacto-grid { grid-template-columns: 1fr !important; gap: 40px !important; }
          .nelvyon-form-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </main>
  );
}
