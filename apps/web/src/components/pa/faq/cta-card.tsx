import { Button } from "@/components/pa/button";

export const CTACard = () => {
  return (
    <div className="bg-natural-white flex flex-col gap-8 rounded-3xl px-6 py-8 shadow-card-md w-full lg:max-w-lg">
      <div className="flex flex-col gap-3">
        <span className="font-medium text-2xl leading-8 -tracking-sm">
          Necesitas ayuda para estructurar tu operacion?
        </span>
        <span className="font-medium text-muted-foreground text-base -tracking-xs leading-6">
          Te ayudamos a alinear marketing, ventas y automatizacion con una hoja
          de ruta clara.
        </span>
      </div>
      <div>
        <Button text="Solicitar informacion" />
      </div>
    </div>
  );
};

