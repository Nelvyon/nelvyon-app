import { Adobe, GoogleLogo, Microsoft, Raycast } from "@/components/icons/logo";
import {
  Marquee,
  MarqueeContent,
  MarqueeFade,
  MarqueeItem,
} from "@/components/kibo-ui/marquee";

const data = [
  {
    name: "Microsoft",
    logo: <Microsoft />,
  },
  {
    name: "Google",
    logo: <GoogleLogo />,
  },
  {
    name: "Adobe",
    logo: <Adobe />,
  },
  {
    name: "Raycast",
    logo: <Raycast />,
  },
];

export const BrandsMarquee = () => {
  return (
    <div className="relative flex h-full items-center">
      <Marquee className="flex h-full max-h-22 items-center">
        <MarqueeFade side="left" className="from-natural-white" />
        <MarqueeFade side="right" className="from-natural-white" />
        <MarqueeContent direction="right" className="h-full">
          {data.map((brand, index) => (
            <MarqueeItem
              className="shadow-card-md flex items-center gap-2.5 rounded-lg px-2.5 py-1.75"
              key={index}
            >
              <div className="size-4">
                {brand.logo}
              </div>
              <span className="-tracking-xs text-sm leading-3.5 font-medium">
                {brand.name}
              </span>
            </MarqueeItem>
          ))}
        </MarqueeContent>
      </Marquee>
    </div>
  );
};

