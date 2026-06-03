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
    <section className="w-full py-16 md:py-24">
      <Container className="flex flex-col gap-12">
        <Header>Más que una agencia. Más que un software.</Header>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {blocks.map((block) => (
            <div
              key={block.title}
              className={
                block.highlight
                  ? "rounded-3xl border border-[#0084FF]/40 bg-[#0084FF]/10 p-8"
                  : "bg-natural-white rounded-3xl p-8 text-natural-black"
              }
            >
              <h3
                className={
                  block.highlight
                    ? "-tracking-sm text-xl font-medium text-white"
                    : "-tracking-sm text-xl font-medium"
                }
              >
                {block.title}
              </h3>
              <p
                className={
                  block.highlight
                    ? "text-muted-foreground mt-4 text-base leading-6"
                    : "text-muted-foreground mt-4 text-base leading-6"
                }
              >
                {block.body}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
