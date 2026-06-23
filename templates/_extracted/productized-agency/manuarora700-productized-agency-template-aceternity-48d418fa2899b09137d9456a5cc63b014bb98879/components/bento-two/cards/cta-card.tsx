import { Button } from "@/components/button";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface CtaCardPatten {
  type: "tile" | "depth" | "image";
  image?: string;
}

const patten: CtaCardPatten[] = [
  // 1st row
  {
    type: "tile",
  },
  {
    type: "tile",
  },
  {
    type: "tile",
  },
  {
    type: "tile",
  },
  {
    type: "tile",
  },
  // 2nd row
  {
    type: "tile",
  },
  {
    type: "tile",
  },
  {
    type: "image",
    image: "/avatar/avatar-1.webp",
  },
  {
    type: "depth",
  },
  {
    type: "tile",
  },
  // 3rd row
  {
    type: "tile",
  },
  {
    type: "image",
    image: "/avatar/avatar-2.webp",
  },
  {
    type: "tile",
  },
  {
    type: "image",
    image: "/avatar/avatar-3.webp",
  },
  {
    type: "depth",
  },
  // 4rd row
  {
    type: "tile",
  },
  {
    type: "depth",
  },
  {
    type: "image",
    image: "/avatar/avatar-4.webp",
  },
  {
    type: "tile",
  },
  {
    type: "tile",
  },
];

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
                  "group-hover:border-transparent group-hover:bg-secondary group-hover:shadow-[inset_var(--shadow-card-md)]",
                )}
              />
            );
          }
          if (item.type === "depth") {
            return (
              <div
                key={`depth-${index}`}
                data-slot="tile-body"
                className="bg-secondary shadow-[inset_var(--shadow-card-md)]"
              />
            );
          }
          return (
            <div
              key={`image-${index}`}
              data-slot="tile-body"
              className="shadow-card-md p-1 transition-all will-change-contents group-hover:p-0"
            >
              <Image
                src={item.image as string}
                alt="avatar"
                className="h-full w-full rounded-lg object-cover will-change-contents"
                width={80}
                height={90}
              />
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-5">
        <span className="-tracking-xs text-lg leading-6 font-medium">
          Get to know our dream team
        </span>
        <div>
          <Button text="Chat with Alex" />
        </div>
      </div>
    </div>
  );
};

