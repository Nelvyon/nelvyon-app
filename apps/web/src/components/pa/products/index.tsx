import { Container } from "@/components/pa/container";
import { Header } from "@/components/pa/header";
import { HoverCard, CardItem } from "@/components/pa/products/hover-card";
import { nelvyonServices } from "@/config/nelvyon-pa-content";

const data: CardItem[] = nelvyonServices.map((service, index) => ({
  logo: "",
  name: service.title,
  href: service.href,
  description: `${service.problem} → ${service.solution}`,
  microcopy: service.microcopy,
  badge: index === 0 ? "Servicios" : undefined,
  image: `/pa/assets/project-${(index % 6) + 1}.webp`,
  feature: [
    "Diagnóstico y roadmap",
    "Implementación con método",
    "Seguimiento operativo",
    "Mejora continua",
  ],
}));

export const Products = () => {
  return (
    <section className="w-full">
      <Container className="flex w-full flex-col gap-20 py-20 md:py-30">
        <Header>Capas de ejecución</Header>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((item, index) => (
            <HoverCard key={`${item.name}-${index}`} item={item} />
          ))}
        </div>
      </Container>
    </section>
  );
};
