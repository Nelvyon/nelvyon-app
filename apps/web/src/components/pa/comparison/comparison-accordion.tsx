import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/pa/ui/accordion";
import { ComparisonData } from "@/components/pa/comparison/comparison-tabel";
import { Logo } from "@/components/pa/logo";
import { GreenCheckIcon, WarningIcon } from "@/components/pa/icons/general";

export const ComparisonAccordion = ({ cards }: { cards: ComparisonData[] }) => {
  return (
    <div className="w-full">
      <Accordion defaultValue={[cards[0].title]} className="gap-4">
        {cards.map((card) => (
          <AccordionItem
            key={card.title}
            value={card.title}
            className="bg-natural-white rounded-3xl p-6"
          >
            <AccordionTrigger className="items-center py-0">
              <div className="relative flex items-center gap-3">
                <span className="z-10">{card.icon}</span>
                <span className="-tracking-sm z-10 text-lg leading-4.5 font-medium">
                  {card.title}
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="mt-6 flex flex-col gap-6">
              <div className="bg-natural-black/7 h-px w-full" />

              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <Logo className="size-5 lg:scale-125" />
                  <span className="-tracking-sm text-lg leading-4.5 font-medium">
                    Aceternity Labs
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <GreenCheckIcon />
                  <span className="-tracking-sm text-lg leading-4.5 font-medium">
                    {card.aceternity}
                  </span>
                </div>
              </div>

              <div className="bg-natural-black/7 h-px w-full" />

              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="-tracking-sm text-muted-foreground text-lg leading-4.5 font-medium">
                    Traditional Service Providers
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <WarningIcon />
                  <span className="-tracking-sm text-lg leading-4.5 font-medium">
                    {card.traditional}
                  </span>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
};
