import { Container } from "@/components/pa/container";
import { Header } from "@/components/pa/header";
import { InfoCards, InfoCardsProps } from "@/components/pa/comparison/info-cards";
import {
  ChipIcon,
  CubeIcon,
  DimondIcon,
  DocsIcon,
  DoorsOpenIcon,
  HandShakeIocn,
  HandsIcon,
  MessageIcon,
  MessageSend,
  NodeLines,
} from "@/components/pa/icons/general";
import { ComparisonTabel, ComparisonData } from "@/components/pa/comparison/comparison-tabel";
import { ComparisonAccordion } from "@/components/pa/comparison/comparison-accordion";
import { Button } from "@/components/pa/button";

const cardsData: InfoCardsProps[] = [
  {
    title: "Instant Onboarding",
    description:
      "Skip Hiring Delays and Start seeing results faster than ever before with our expert team",
    icon: <DoorsOpenIcon />,
  },
  {
    title: "High Impact, Low Overhead",
    description:
      "Skip Hiring Delays and Start seeing results faster than ever before with our expert team",
    icon: <DocsIcon />,
  },
  {
    title: "Stress-Free Collaboartion",
    description:
      "Skip Hiring Delays and Start seeing results faster than ever before with our expert team",
    icon: <HandsIcon />,
  },
];

const comparisonData: ComparisonData[] = [
  {
    title: "Approach",
    aceternity: "Design and engineering in sync",
    traditional: "Disconnected teams",
    icon: <DimondIcon />,
  },
  {
    title: "Process",
    aceternity: "Streamlined, transparent, and async",
    traditional: "Endless calls, vague timelines",
    icon: <ChipIcon />,
  },
  {
    title: "Design Philosophy",
    aceternity: "Modern, minimal, and purposeful.",
    traditional: "Trend-based and cluttered",
    icon: <NodeLines />,
  },
  {
    title: "Development Stack",
    aceternity: "Built with modern frameworks",
    traditional: "Outdated stacks",
    icon: <CubeIcon />,
  },
  {
    title: "Communication",
    aceternity: "Clear updates",
    traditional: "Multiple middlemen",
    icon: <MessageIcon />,
  },
  {
    title: "Deliverables",
    aceternity: "Production-ready design systems",
    traditional: "Static mockups",
    icon: <MessageSend />,
  },
  {
    title: "Support",
    aceternity: "Long-term partnership mindset",
    traditional: "One-and-done projects",
    icon: <HandShakeIocn />,
  },
];

export const Comparison = () => {
  return (
    <section className="w-full">
      <Container className="flex flex-col gap-15 py-20 md:py-30">
        <div className="flex flex-col gap-6">
          <Header>Aceternity VS Traditional Service Providers</Header>
          <div className="block lg:hidden">
            <Button text="Book a Free Call" />
          </div>
        </div>
        <div className="flex flex-col gap-6">
          {/* for desktop only */}
          <div className="bg-natural-white hidden w-full rounded-3xl lg:block">
            <ComparisonTabel cards={comparisonData} />
          </div>

          {/* for mobile and tablet */}
          <div className="block w-full lg:hidden">
            <ComparisonAccordion cards={comparisonData} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {cardsData.map((item) => (
              <InfoCards key={item.title} {...item} />
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
};

