import { Container } from "@/components/container";
import { Header } from "@/components/header";
import { BlogCard, CardData } from "@/components/resources/blog-card";
import { FilterBadge } from "@/components/resources/filter-badge";

const data: CardData[] = [
  {
    title: "The Rise of Data-Driven Creator Marketing",
    description:
      "We break down the strengths, limitations, and ideal use cases of Webflow and Framer helping you choose the best tool for your next site.",
    time: "5 min read",
    image: "/assets/blog-preview.webp",
    href: "#",
  },
  {
    title: "The Rise of Data-Driven Creator Marketing",
    description:
      "We break down the strengths, limitations, and ideal use cases of Webflow and Framer helping you choose the best tool for your next site.",
    time: "5 min read",
    image: "/assets/blog-preview.webp",
    href: "#",
  },
  {
    title: "The Rise of Data-Driven Creator Marketing",
    description:
      "We break down the strengths, limitations, and ideal use cases of Webflow and Framer helping you choose the best tool for your next site.",
    time: "5 min read",
    image: "/assets/blog-preview.webp",
    href: "#",
  },
  {
    title: "The Rise of Data-Driven Creator Marketing",
    description:
      "We break down the strengths, limitations, and ideal use cases of Webflow and Framer helping you choose the best tool for your next site.",
    time: "5 min read",
    image: "/assets/blog-preview.webp",
    href: "#",
  },
  {
    title: "The Rise of Data-Driven Creator Marketing",
    description:
      "We break down the strengths, limitations, and ideal use cases of Webflow and Framer helping you choose the best tool for your next site.",
    time: "5 min read",
    image: "/assets/blog-preview.webp",
    href: "#",
  },
  {
    title: "The Rise of Data-Driven Creator Marketing",
    description:
      "We break down the strengths, limitations, and ideal use cases of Webflow and Framer helping you choose the best tool for your next site.",
    time: "5 min read",
    image: "/assets/blog-preview.webp",
    href: "#",
  },
];

export const Resources = () => {
  return (
    <section className="w-full">
      <Container className="flex flex-col gap-15 pt-30 pb-20">
        <Header>Resources</Header>
        <div className="flex w-full flex-col gap-8">
          <div className="flex gap-2 flex-wrap w-full">
            <FilterBadge isSelected>All</FilterBadge>
            <FilterBadge>Design</FilterBadge>
            <FilterBadge>Development</FilterBadge>
            <FilterBadge>Customers</FilterBadge>
            <FilterBadge>Products</FilterBadge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {data.map((card, index) => (
              <BlogCard key={index} card={card} />
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
};

