import Image from "next/image";
import { GridPattenDepth } from "@/components/bento-two/cards/grid-patten-depth";

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
          src={"/logos/1.webp"}
          alt="Primer Logo"
          width={100}
          height={100}
          className="w-20"
        />
      </div>
      <div className="-tracking-xs text-muted-foreground z-10 text-base leading-6 font-medium">
        “Since adding the AI assistant to our store, our support load has
        dropped by nearly 60% Customers now get instant answers about
        supplements, dosages.”
      </div>
      <div className="flex items-center gap-2 z-10">
        <span className="-tracking-xs text-base leading-6 font-medium">
          — James Finley
        </span>
        <span className="-tracking-xs text-muted-foreground text-base leading-6 font-medium">
          Founder, Primer
        </span>
      </div>
    </div>
  );
};

