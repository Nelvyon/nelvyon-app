import { SkeletonOne } from "@/components/pa/bento-one/skeletons/first";
import { Button } from "@/components/pa/button";

export const DesignAndDevelopment = () => {
  return (
    <div className="h-full w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1">
      <div className="w-full flex-1 h-85">
        <SkeletonOne />
      </div>
      <div className="mt-4 flex flex-col gap-6 px-4 py-4 z-10">
        <div className="relative">
          <h2 className="text-base font-medium text-white">
            Estrategia, diseno y desarrollo
          </h2>
          <p className="mt-4 text-base text-neutral-400">
            Disenamos y ejecutamos activos digitales orientados a conversion,
            rendimiento y continuidad operativa.
          </p>
        </div>
        <div>
          <Button
            containerClassName="my-4"
            text="Ver precios"
            href="/pricing"
          />
        </div>
      </div>
    </div>
  );
};

