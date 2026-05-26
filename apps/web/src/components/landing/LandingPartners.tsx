import { FadeIn } from "./FadeIn";
import { SectionHeading } from "./ui";

const PARTNERS = [
  { name: "OpenAI", desc: "Modelos de lenguaje para contenido y automatización" },
  { name: "Google Cloud", desc: "Infraestructura y APIs de Google Ads y Analytics" },
  { name: "Meta Business", desc: "Publicidad y mensajería en Facebook e Instagram" },
  { name: "Stripe", desc: "Pagos y suscripciones seguras" },
  { name: "Twilio", desc: "SMS, voz y WhatsApp a escala" },
  { name: "Railway", desc: "Despliegue y hosting de la plataforma" },
  { name: "Supabase", desc: "Base de datos y autenticación" },
  { name: "Klaviyo", desc: "Email marketing y automatizaciones" },
] as const;

export function LandingPartners() {
  return (
    <section className="bg-white py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <FadeIn>
          <SectionHeading
            center
            subtitle="Nelvyon se apoya en la infraestructura de las empresas más avanzadas del mundo"
            title="Tecnología de primer nivel, partners globales"
            variant="light"
          />
        </FadeIn>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PARTNERS.map((p, i) => (
            <FadeIn delay={i * 0.04} key={p.name}>
              <div className="rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] px-5 py-6 shadow-sm">
                <p className="text-base font-semibold text-zinc-900" style={{ fontFamily: "var(--font-inter)" }}>
                  {p.name}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">{p.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
