import { ServicesNetworkDiagram } from "./ServicesNetworkDiagram";
import { ServicesGrid } from "./ServicesGrid";
import { FadeIn } from "./FadeIn";
import { BRAND } from "./shared";
import { SectionHeading } from "./ui";

export function LandingServicesSection() {
  return (
    <div className="bg-white" id="servicios">
      <section className="mx-auto max-w-3xl px-4 py-16 md:px-6 md:py-20">
        <FadeIn>
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 md:text-4xl">
            ¿Qué es el marketing digital y por qué lo necesita tu negocio?
          </h2>
          <div className="mt-8 space-y-5 text-lg leading-relaxed text-[#6B7280]">
            <p>
              El marketing digital es la forma en que tu negocio se hace visible, atrae clientes y vende en
              internet: buscadores, redes, email, publicidad y tu propia web trabajando juntos.
            </p>
            <p>
              Hoy tus clientes comparan opciones online antes de llamar o comprar. Si no estás presente con
              claridad y constancia, pierdes oportunidades frente a competidores que sí invierten en canales
              digitales.
            </p>
            <p>
              Sin una estrategia unificada suele haber herramientas sueltas, datos dispersos y mucho tiempo
              perdido en tareas repetitivas que no escalan.
            </p>
            <p style={{ color: BRAND.textOnWhite }}>
              <strong className="text-zinc-900">NELVYON</strong> centraliza estrategia, ejecución y reporting:
              un equipo y una tecnología que conectan todos tus canales para que tu negocio crezca con orden.
            </p>
          </div>
        </FadeIn>
      </section>

      <section className="mx-auto max-w-[900px] px-4 pb-12 md:px-6 md:pb-16">
        <FadeIn>
          <SectionHeading
            center
            subtitle="Cada servicio conectado con el resto de tu ecosistema digital"
            title="Tu marketing, una sola red"
            variant="light"
          />
        </FadeIn>
        <div className="mt-10">
          <ServicesNetworkDiagram />
        </div>
      </section>

      <ServicesGrid showHeading />
    </div>
  );
}
