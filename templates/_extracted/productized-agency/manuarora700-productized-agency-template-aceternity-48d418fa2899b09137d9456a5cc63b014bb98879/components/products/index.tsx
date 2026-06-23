import { Container } from "@/components/container";
import { Header } from "@/components/header";
import { HoverCard, CardItem } from "@/components/products/hover-card";

const data: CardItem[] = [
  {
    logo: "/ace.webp",
    name: "Acebuilder",
    description:
      "Natural-language interface where you describe your app, features, user flows.",
    badge: "New Launch",
    image: "/assets/project-1.webp",
    feature: [
      "Prompt-to-app generator",
      "Architecture suggestion & setup",
      "Code generation engine",
      "Live preview & sandbox",
    ],
  },
  {
    logo: "/logo.webp",
    name: "Aceternity UI",
    description:
      "Natural-language interface where you describe your app, features, user flows.",
    image: "/assets/project-5.webp",
    feature: [
      "Prompt-to-app generator",
      "Architecture suggestion & setup",
      "Code generation engine",
      "Live preview & sandbox",
    ],
  },
];

export const Products = () => {
  return (
    <section className="w-full">
      <Container className="flex w-full flex-col gap-20 py-20 md:py-30">
        <Header>Always Pushing the Boundaries in Tech</Header>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {data.map((item, index) => (
            <HoverCard key={`${item.name}-${index}`} item={item} />
          ))}
        </div>
      </Container>
    </section>
  );
};

