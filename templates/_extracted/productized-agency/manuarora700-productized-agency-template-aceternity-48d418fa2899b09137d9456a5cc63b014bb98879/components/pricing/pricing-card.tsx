import { cn } from "@/lib/utils";
import { PricingBadge } from "@/components/pricing/pricing-badge";
import { Button } from "@/components/button";
import { Testimonial } from "@/components/pricing/testimonial";

export interface PricingCardType {
  category: string; // "Components" / "Website Pages"
  badge: {
    text: string;
    variant: "danger" | "success";
  };
  title: string;
  subtitle: string;
  price: number;
  billing: string; // "/mo"
  cta: string; // "Select Plan"
  testimonial: {
    avatar: string;
    brand: React.ReactNode;
    name: string;
    role: string;
    message: string;
  };
  features: string[];
  theme: "light" | "dark";
}
export const PricingCard = ({ card }: { card: PricingCardType }) => {
  return (
    <div
      className={cn(
        "relative flex flex-col gap-2.5 overflow-hidden rounded-3xl p-3",
        card.theme === "light"
          ? "bg-natural-white text-natural-black"
          : "bg-natural-black text-natural-white",
      )}
    >
      {card.theme === "dark" && (
        <div className="absolute top-0 left-0 h-48 w-44 -translate-x-1/5 -translate-y-1/5">
          <div className="absolute top-0 left-[61.27px] h-48 w-28 rounded-full bg-stone-800 blur-2xl" />
          <div className="absolute top-[45.09px] left-0 size-20 rounded-full bg-white blur-[34.09px]" />
        </div>
      )}

      <div
        className={cn(
          "relative z-10 flex flex-col gap-16 rounded-2xl px-6 pt-4 pb-6",
          card.theme === "light" ? "bg-secondary" : "bg-secondary/15",
        )}
      >
        <div className="flex flex-col gap-6">
          <div className="flex w-fit flex-col gap-3 md:flex-row md:items-center">
            <span className="-tracking-sm text-lg leading-5">
              {card.category}
            </span>
            <PricingBadge variant={card.badge.variant}>
              {card.badge.text}
            </PricingBadge>
          </div>
          <div className="-tracking-xl text-2xl leading-8 font-medium">
            <span>{card.title}</span>
            <br />
            <span className="text-muted-foreground">{card.subtitle}</span>
          </div>
        </div>
        <div className="flex w-full flex-col gap-10 md:flex-row md:items-end md:justify-between md:gap-0">
          <div className="flex flex-col gap-4">
            <div className="-tracking-xs text-3xl leading-9 font-medium">
              <span className="text-2xl">$</span>
              <span>{card.price}</span>
              <span className="text-2xl">{card.billing}</span>
            </div>
            <div>
              <Button text={card.cta} />
            </div>
          </div>
          <Testimonial
            theme={card.theme}
            avatar={card.testimonial.avatar}
            name={card.testimonial.name}
            role={card.testimonial.role}
            brand={card.testimonial.brand}
            message={card.testimonial.message}
          />
        </div>
      </div>
      {/* info */}
      <div className="grid grid-cols-2 gap-4.5 px-3 py-6">
        {card.features.map((feature, index) => (
          <div
            key={`${feature}-${index}`}
            className="text-muted-foreground flex items-center gap-2 text-sm leading-3.5 font-medium"
          >
            <div className="bg-muted-foreground/50 size-2.5 rounded-full" />
            {feature}
          </div>
        ))}
      </div>
    </div>
  );
};

