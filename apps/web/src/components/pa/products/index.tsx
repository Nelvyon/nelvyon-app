import { Container } from "@/components/pa/container";
import { Header } from "@/components/pa/header";
import { HoverCard, CardItem } from "@/components/pa/products/hover-card";
import { nelvyonServices } from "@/config/nelvyon-pa-content";

const data: CardItem[] = nelvyonServices.map((service, index) => ({
  logo: "/logo.png",
  name: service.title,
  description: service.description,
  badge: index === 0 ? "Servicios" : undefined,
  image: `/pa/assets/project-${(index % 6) + 1}.webp`,
  feature: [
    "Diagnostico y roadmap",
    "Implementacion con metodo",
    "Seguimiento operativo",
    "Mejora continua",
  ],
}));

export const Products = () => {
  return (
    <section className="w-full">
      <Container className="flex w-full flex-col gap-20 py-20 md:py-30">
        <Header>Capas de ejecución</Header>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {data.map((item, index) => (
            <HoverCard key={`${item.name}-${index}`} item={item} />
          ))}
        </div>
      </Container>
    </section>
  );
};

