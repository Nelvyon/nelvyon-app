import Link from "next/link";

import { NvPageHero } from "../page-hero";

export function NvContactoPage() {
  return (
    <main>
      <NvPageHero
        eyebrow="Contacto"
        title="Hablemos de tu operación digital"
        subtitle="Cuéntanos qué necesita tu empresa y valoraremos cómo NELVYON puede ayudarte."
      />

      <section className="nv-section nv-section--white">
        <div className="nv-container nv-contact-grid">
          <div className="nv-prose">
            <p>
              Este formulario sirve para entender tu situación actual y valorar qué estructura puede tener sentido para tu empresa.
            </p>
            <h3 style={{ fontSize: 17, fontWeight: 650, margin: "24px 0 12px", color: "var(--nv-text)" }}>Información de contacto</h3>
            <p style={{ margin: "0 0 8px" }}>Web: nelvyon.com</p>
            <p style={{ margin: "0 0 8px" }}>
              Email:{" "}
              <Link href="mailto:contacto@nelvyon.com" className="nv-link">
                contacto@nelvyon.com
              </Link>
            </p>
            <p style={{ margin: "0 0 8px" }}>Horario: Lunes a viernes</p>
            <p style={{ margin: 0 }}>Idioma: Español</p>
            <p style={{ marginTop: 24 }}>
              NELVYON trabaja con empresas que buscan claridad y operación seria. No prometemos resultados irreales ni soluciones genéricas.
            </p>
          </div>

          <div className="nv-form-card">
            <h3>Cuéntanos tu situación</h3>
            <form action="https://formspree.io/f/xpwzgvbq" method="POST">
              <div className="nv-field">
                <label htmlFor="nombre">Nombre completo *</label>
                <input id="nombre" name="nombre" type="text" required placeholder="Tu nombre" />
              </div>
              <div className="nv-form-row">
                <div className="nv-field">
                  <label htmlFor="empresa">Empresa</label>
                  <input id="empresa" name="empresa" type="text" placeholder="Tu empresa" />
                </div>
                <div className="nv-field">
                  <label htmlFor="cargo">Cargo</label>
                  <input id="cargo" name="cargo" type="text" placeholder="Tu cargo" />
                </div>
              </div>
              <div className="nv-field">
                <label htmlFor="email">Email corporativo *</label>
                <input id="email" name="email" type="email" required placeholder="tu@empresa.com" />
              </div>
              <div className="nv-form-row">
                <div className="nv-field">
                  <label htmlFor="telefono">Teléfono</label>
                  <input id="telefono" name="telefono" type="tel" placeholder="+34 600 000 000" />
                </div>
                <div className="nv-field">
                  <label htmlFor="sector">Sector</label>
                  <input id="sector" name="sector" type="text" placeholder="Tu sector" />
                </div>
              </div>
              <div className="nv-field">
                <label htmlFor="servicios_interes">Servicios de interés</label>
                <select id="servicios_interes" name="servicios_interes" defaultValue="">
                  <option value="">Selecciona una opción</option>
                  <option value="servicios">Servicios profesionales</option>
                  <option value="saas">Plataforma SaaS</option>
                  <option value="ambos">Servicios + SaaS</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div className="nv-field">
                <label htmlFor="mensaje">Mensaje</label>
                <textarea id="mensaje" name="mensaje" rows={4} placeholder="Cuéntanos tu situación..." />
              </div>
              <button type="submit" className="nv-btn nv-btn--primary" style={{ width: "100%" }}>
                Enviar solicitud
              </button>
              <p className="nv-form-privacy">Al enviar aceptas nuestra política de privacidad.</p>
            </form>
          </div>
        </div>
      </section>
    </main>
  );
}
