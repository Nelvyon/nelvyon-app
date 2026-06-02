import { Processor } from "@/components/pa/bento-one/cards/processor";

export const ComponentsDashboardsAndEverything = () => {
  return (
    <div className="relative p-4">
      <div className="absolute inset-0">
        <Processor />
      </div>
      <div className="text-lg leading-6 font-medium tracking-tight z-10 relative">
        Dashboards, funnels e integraciones clave
      </div>
    </div>
  );
};

