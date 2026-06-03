import { Button } from "@/components/pa/button";
import { cn } from "@/lib/pa/utils";

const patten = Array.from({ length: 20 }, (_, index) => ({
  type: index % 5 === 0 ? ("depth" as const) : ("tile" as const),
}));

export const CtaCard = () => {
  return (
    <div className="group flex h-full flex-col justify-end p-8">
      <div
        className={cn(
          "absolute inset-0 grid h-fit scale-125 grid-cols-5 gap-3",
          "*:data-[slot=tile-body]:h-20 *:data-[slot=tile-body]:w-20 *:data-[slot=tile-body]:rounded-lg",
          "mask-[radial-gradient(circle,rgba(0,0,0,1)_50%,rgba(0,0,0,0)_70%)]",
        )}
      >
        {patten.map((item, index) => {
          if (item.type === "tile") {
            return (
              <div
                key={`tile-${index}`}
                data-slot="tile-body"
                className={cn(
                  "border-natural-black/10 border transition-all",
                  "group-hover:border-transparent group-hover:bg-[#0084FF]/10 group-hover:shadow-[inset_var(--shadow-card-md)]",
                )}
              />
            );
          }
          return (
            <div
              key={`depth-${index}`}
              data-slot="tile-body"
              className="bg-[#0084FF]/15 shadow-[inset_var(--shadow-card-md)]"
            />
          );
        })}
      </div>

      <div className="flex flex-col gap-5">
        <span className="-tracking-xs text-lg leading-6 font-medium">
          Hablemos de tu operación digital
        </span>
        <div>
          <Button text="Solicitar información" />
        </div>
      </div>
    </div>
  );
};
