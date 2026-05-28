import type { Metadata } from "next";
import { Footer } from "@/components/agenforce/footer";
import { Navbar } from "@/components/navbar";
import { NavyToWhiteTransition } from "@/components/agenforce/section-transition";
export const metadata: Metadata = {
  title: "Política de Cookies | NELVYON",
  description: "Política de cookies de NELVYON. Qué cookies usamos y cómo puedes gestionarlas.",
};
export default function CookiesPage() {
  return (
    <>
      <Navbar />
      <main style={{ paddingTop: "68px" }}>
        <section style={{ backgroundColor: "#07122a", padding: "64px 0 0" }}>
          <div style={{ maxWidth: "800px", margin: "0 auto", padding: "0 24px 48px", textAlign: "center" }}>
            <h1 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 900, color: "#ffffff", margin: 0 }}>Política de Cookies</h1>
            <p style={{ fontSize: "16px", color: "#a8c8e8", marginTop: "12px" }}>Última actualización: Mayo 2026</p>
          </div>
          <NavyToWhiteTransition />
        </section>
        <section style={{ backgroundColor: "#ffffff", padding: "80px 0" }}>
          <div style={{ maxWidth: "800px", margin: "0 auto", padding: "0 24px" }}>
            {[
              { title: "¿Qué son las cookies?", content: "Las cookies son pequeños archivos de texto que se almacenan en tu dispositivo cuando visitas un sitio web. Nos ayudan a recordar tus preferencias y mejorar tu experiencia." },
              { title: "Cookies que utilizamos", content: "Usamos cookies técnicas necesarias para el funcionamiento de la web, cookies de análisis anónimo para entender cómo se usa la web (Google Analytics), y cookies de preferencias para recordar tu configuración." },
              { title: "Cookies de terceros", content: "Algunos servicios integrados en nuestra web (como Google Analytics) pueden instalar sus propias cookies. Consulta las políticas de privacidad de estos terceros para más información." },
              { title: "Cómo gestionar las cookies", content: "Puedes configurar tu navegador para rechazar todas las cookies o para que te avise cuando se envíe una cookie. Sin embargo, si rechazas las cookies, algunas funcionalidades de la web pueden no estar disponibles." },
              { title: "Consentimiento", content: "Al continuar navegando por nuestro sitio web, aceptas el uso de cookies conforme a esta política. Puedes retirar tu consentimiento en cualquier momento cambiando la configuración de tu navegador." },
            ].map((section, i) => (
              <div key={i} style={{ marginBottom: "40px" }}>
                <h2 style={{ fontSize: "20px", fontWeight: 800, color: "#07122a", margin: "0 0 12px" }}>{section.title}</h2>
                <p style={{ fontSize: "16px", color: "#5a6a8a", lineHeight: 1.7, margin: 0 }}>{section.content}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
