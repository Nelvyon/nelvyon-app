import {
  Marquee,
  MarqueeContent,
  MarqueeFade,
  MarqueeItem,
} from "@/components/pa/kibo-ui/marquee";

const data = [
  {
    name: "CRM",
    shadow: "#0084FF",
  },
  {
    name: "Automatizacion",
    shadow: "#91B3FF",
  },
  {
    name: "Reporting",
    shadow: "#6EFFBE",
  },
  {
    name: "Integraciones",
    shadow: "#85E9FF",
  },
  {
    name: "Ejecucion",
    shadow: "#0084FF",
  },
  {
    name: "Escalado",
    shadow: "#0047AB",
  },
];

export const BottomMarquee = () => {
  return (
    <div className="relative flex h-full items-center px-8">
      <div className="-tracking-xs text-lg leading-6.5 font-medium text-nowrap">
        Capacidades operativas
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
              <span className="text-xs font-medium">{icon.name}</span>
            </MarqueeItem>
          ))}
        </MarqueeContent>
      </Marquee>
    </div>
  );
};

