import { Container } from "@/components/pa/container";
import { Header } from "@/components/pa/header";

const blocks = [
  {
    title: "Agencia tradicional",
    body: "Ejecuta acciones aisladas: campañas, diseño o contenido, pero muchas veces sin conectar todo el sistema comercial.",
    highlight: false,
  },
  {
    title: "Herramientas separadas",
    body: "CRM, formularios, calendarios, email, WhatsApp y analítica en plataformas distintas que generan fricción y pérdida de control.",
    highlight: false,
  },
  {
    title: "NELVYON",
    body: "Une estrategia, tecnología, automatización e IA para construir una operación digital más clara, conectada y escalable.",
    highlight: true,
  },
] as const;

export function HomeDifferentiationSection() {
  return (
    <section className="w-full bg-[#020817]/50 py-16 md:py-24">
      <Container className="flex flex-col gap-10 md:gap-12">
        <Header>Más que una agencia. Más que un software.</Header>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {blocks.map((block) => (
            <div
              key={block.title}
              className={
                block.highlight
                  ? "rounded-3xl border border-[#0084FF]/45 bg-gradient-to-b from-[#0084FF]/15 to-[#07111F] p-8 shadow-[0_0_40px_rgba(0,132,255,0.12)]"
                  : "rounded-3xl border border-white/10 bg-[#07111F] p-8"
              }
            >
              <h3 className="-tracking-sm text-xl font-medium text-white">{block.title}</h3>
              <p className="mt-4 text-base leading-6 text-white/70">{block.body}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
