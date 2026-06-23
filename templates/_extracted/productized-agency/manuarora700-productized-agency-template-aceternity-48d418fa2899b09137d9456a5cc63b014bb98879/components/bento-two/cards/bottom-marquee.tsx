import {
  GoogleAnalytics,
  OpenAI,
  Supabase,
  React,
  AmazonWebServices,
  Firebase,
} from "@/components/icons/logo";
import {
  Marquee,
  MarqueeContent,
  MarqueeFade,
  MarqueeItem,
} from "@/components/kibo-ui/marquee";

const data = [
  {
    logo: GoogleAnalytics,
    shadow: "#FFC84E",
  },
  {
    logo: OpenAI,
    shadow: "#91B3FF",
  },
  {
    logo: Supabase,
    shadow: "#6EFFBE",
  },
  {
    logo: React,
    shadow: "#85E9FF",
  },
  {
    logo: AmazonWebServices,
    shadow: "#FFC36A",
  },
  {
    logo: Firebase,
    shadow: "#E37400",
  },
];

export const BottomMarquee = () => {
  return (
    <div className="relative flex h-full items-center px-8">
      <div className="-tracking-xs text-lg leading-6.5 font-medium text-nowrap">
        Technologies we use
      </div>
      <Marquee className="flex h-full max-h-22 items-center">
        <MarqueeFade side="left" className="from-natural-white" />
        <MarqueeFade side="right" className="from-natural-white" />
        <MarqueeContent className="h-full">
          {data.map((icon, index) => (
            <MarqueeItem
              className="shadow-card-md relative mx-6 flex size-10 items-center justify-center gap-2.5 overflow-hidden rounded-2xl px-2.5 py-1.75 lg:size-14"
              key={index}
            >
              <div
                className="absolute bottom-1 left-1 h-2 w-6 rotate-23 rounded-full blur-md"
                style={{
                  backgroundColor: icon.shadow,
                }}
              />
              <div
                className="absolute top-1 right-1 h-2 w-6 rotate-23 rounded-full blur-md"
                style={{
                  backgroundColor: icon.shadow,
                }}
              />
              <icon.logo className="size-6 object-contain" />
            </MarqueeItem>
          ))}
        </MarqueeContent>
      </Marquee>
    </div>
  );
};

