import { ComparisonTable } from "./ComparisonTable";
import { HOME_COMPARE_ROWS } from "./comparisonData";
import { LandingColorfulServices } from "./LandingColorfulServices";
import { ServicesMindMap } from "./ServicesMindMap";
import { FadeIn } from "./FadeIn";

export function LandingServicesSection() {
  return (
    <div className="bg-white" id="servicios">
      <section className="mx-auto max-w-3xl px-4 py-16 md:px-6 md:py-20">
        <FadeIn>
          <h2 className="text-3xl font-extrabold tracking-tight text-[#111827] md:text-4xl">
            ¿Qué es el marketing digital y por qué lo necesita tu negocio?
          </h2>
          <div className="mt-8 space-y-5 text-lg leading-relaxed text-[#374151]">
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
            <p>
              <strong className="text-[#111827]">NELVYON</strong> centraliza estrategia, ejecución y reporting:
              un equipo y una tecnología que conectan todos tus canales para que tu negocio crezca con orden.
            </p>
          </div>
        </FadeIn>
      </section>

      <ComparisonTable rows={HOME_COMPARE_ROWS} title="¿Qué incluye trabajar con NELVYON?" />

      <ServicesMindMap />

      <LandingColorfulServices />
    </div>
  );
}
