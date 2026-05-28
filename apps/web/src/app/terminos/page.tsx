import type { Metadata } from "next";
import { Footer } from "@/components/agenforce/footer";
import { Navbar } from "@/components/agenforce/navbar";
import { NavyToWhiteTransition } from "@/components/agenforce/section-transition";
export const metadata: Metadata = {
  title: "Términos de Uso | NELVYON",
  description: "Términos y condiciones de uso de los servicios de NELVYON.",
};
export default function TerminosPage() {
  return (
    <>
      <Navbar />
      <main style={{ paddingTop: "68px" }}>
        <section style={{ backgroundColor: "#07122a", padding: "64px 0 0" }}>
          <div style={{ maxWidth: "800px", margin: "0 auto", padding: "0 24px 48px", textAlign: "center" }}>
            <h1 style={{ fontSize: "clamp(28px, 4vw, 44px)", fontWeight: 900, color: "#ffffff", margin: 0 }}>Términos de Uso</h1>
            <p style={{ fontSize: "16px", color: "#a8c8e8", marginTop: "12px" }}>Última actualización: Mayo 2026</p>
          </div>
          <NavyToWhiteTransition />
        </section>
        <section style={{ backgroundColor: "#ffffff", padding: "80px 0" }}>
          <div style={{ maxWidth: "800px", margin: "0 auto", padding: "0 24px" }}>
            {[
              { title: "1. Aceptación de los términos", content: "Al acceder y utilizar los servicios de NELVYON, aceptas estos términos y condiciones en su totalidad. Si no estás de acuerdo con alguno de estos términos, no debes usar nuestros servicios." },
              { title: "2. Descripción del servicio", content: "NELVYON proporciona una plataforma de marketing digital automatizado que incluye gestión de campañas publicitarias, automatización de comunicaciones y generación de contenido web mediante agentes expertos." },
              { title: "3. Uso aceptable", content: "Te comprometes a usar nuestros servicios únicamente para fines legales y de acuerdo con estos términos. Queda prohibido el uso de la plataforma para enviar spam, contenido ilegal o actividades fraudulentas." },
              { title: "4. Propiedad intelectual", content: "Todo el contenido, software y materiales de NELVYON están protegidos por derechos de propiedad intelectual. No puedes copiar, modificar ni distribuir nuestros materiales sin autorización expresa." },
              { title: "5. Limitación de responsabilidad", content: "NELVYON no será responsable de daños indirectos, incidentales o consecuentes derivados del uso o imposibilidad de uso de nuestros servicios. La responsabilidad máxima se limita al importe pagado en los últimos 3 meses." },
              { title: "6. Cancelación y reembolsos", content: "Puedes cancelar tu suscripción en cualquier momento sin penalización. Los pagos realizados no son reembolsables salvo en los casos establecidos por la legislación de consumidores aplicable." },
              { title: "7. Modificaciones del servicio", content: "Nos reservamos el derecho a modificar o interrumpir el servicio con un preaviso mínimo de 30 días. Te notificaremos los cambios significativos por email." },
              { title: "8. Ley aplicable", content: "Estos términos se rigen por la legislación española. Cualquier disputa será sometida a los juzgados y tribunales de Madrid, España." },
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
