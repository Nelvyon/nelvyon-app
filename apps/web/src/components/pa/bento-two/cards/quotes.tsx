import Image from "next/image";
import { GridPattenDepth } from "@/components/pa/bento-two/cards/grid-patten-depth";

export const Quotes = () => {
  return (
    <div className="relative flex h-full flex-col justify-end gap-6 p-8">
      <div className="absolute inset-0">
        <div className="-mt-11 ml-20">
          <GridPattenDepth />
        </div>
      </div>
      <div className="z-10">
        <Image
          src={"/logo.png"}
          alt="NELVYON"
          width={140}
          height={52}
          className="w-28 object-contain"
        />
      </div>
      <div className="-tracking-xs text-muted-foreground z-10 text-base leading-6 font-medium">
        &ldquo;No vendemos promesas vacías: diseñamos procesos, ejecutamos con
        disciplina y optimizamos según datos reales.&rdquo;
      </div>
      <div className="flex items-center gap-2 z-10">
        <span className="-tracking-xs text-base leading-6 font-medium">
          - Equipo NELVYON
        </span>
        <span className="-tracking-xs text-muted-foreground text-base leading-6 font-medium">
          Estrategia y operaciones
        </span>
      </div>
    </div>
  );
};

