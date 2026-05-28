import type { Metadata } from "next";
export const metadata: Metadata = {
  title: "Política de Privacidad | NELVYON",
  description: "Política de privacidad de NELVYON. Cómo recopilamos, usamos y protegemos tus datos personales conforme al RGPD.",
};
export default function PrivacidadPage() {
  return (
    <main style={{ paddingTop: "68px" }}>
      <section style={{ background: "linear-gradient(135deg, #07122a 0%, #0b1e44 100%)", padding: "64px 0 48px" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "0 24px", textAlign: "center" }}>
          <h1 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 900, color: "#ffffff", margin: 0 }}>Política de Privacidad</h1>
          <p style={{ fontSize: "16px", color: "#a8c8e8", marginTop: "12px" }}>Última actualización: Mayo 2026</p>
        </div>
      </section>
      <section style={{ backgroundColor: "#ffffff", padding: "80px 0" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto", padding: "0 24px" }}>
          {[
            { title: "1. Responsable del tratamiento", content: "NELVYON (en adelante, \"la empresa\") es la responsable del tratamiento de los datos personales recogidos a través de este sitio web (nelvyon.com). Correo de contacto: hola@nelvyon.com." },
            { title: "2. Datos que recopilamos", content: "Recopilamos los datos que nos proporcionas directamente al rellenar formularios de contacto (nombre, email, teléfono, empresa), así como datos de navegación de forma anónima y agregada para mejorar la experiencia de usuario." },
            { title: "3. Finalidad del tratamiento", content: "Utilizamos tus datos para: responder a tus consultas y solicitudes, enviarte información sobre nuestros servicios si nos das tu consentimiento, y mejorar nuestros productos y servicios." },
            { title: "4. Base jurídica", content: "El tratamiento se basa en tu consentimiento explícito al enviar el formulario de contacto, y en el interés legítimo de la empresa para la gestión de la relación comercial." },
            { title: "5. Conservación de datos", content: "Conservamos tus datos durante el tiempo necesario para cumplir con la finalidad para la que fueron recogidos, y en todo caso durante los plazos establecidos por la legislación aplicable." },
            { title: "6. Tus derechos", content: "Tienes derecho a acceder, rectificar, suprimir, limitar u oponerte al tratamiento de tus datos, así como a la portabilidad de los mismos. Puedes ejercer estos derechos escribiendo a hola@nelvyon.com." },
            { title: "7. Transferencias internacionales", content: "Algunos de nuestros proveedores de servicios (como servicios de email o infraestructura cloud) pueden estar ubicados fuera del Espacio Económico Europeo. En estos casos garantizamos que se aplican las salvaguardas adecuadas conforme al RGPD." },
            { title: "8. Cambios en esta política", content: "Nos reservamos el derecho a actualizar esta política de privacidad. Te notificaremos cualquier cambio significativo por email o mediante aviso en nuestra web." },
          ].map((section, i) => (
            <div key={i} style={{ marginBottom: "40px" }}>
              <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#07122a", margin: "0 0 12px" }}>{section.title}</h2>
              <p style={{ fontSize: "16px", color: "#5a6a8a", lineHeight: 1.7, margin: 0 }}>{section.content}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
