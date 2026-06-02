import Image from "next/image";
import Link from "next/link";

export interface CardData {
  title: string;
  description: string;
  time: string;
  image: string;
  href: string;
}

export const BlogCard = ({ card }: { card: CardData }) => {
  return (
    <Link
      href={card.href}
      className="border-natural-black/10 flex flex-col gap-4 rounded-3xl border px-3 pt-3 pb-8 transition-colors hover:bg-black/2"
    >
      <div>
        <Image
          src={card.image}
          alt={card.title}
          width={400}
          height={265}
          className="w-full rounded-2xl"
        />
      </div>
      <div className="flex flex-col items-start justify-start gap-4 px-3">
        <div className="-tracking-sm w-full justify-start text-2xl leading-8 font-medium">
          {card.title}
        </div>
        <div className="text-muted-foreground -tracking-xs justify-start text-base leading-6 font-medium">
          {card.description}
        </div>
        <div className="flex items-start justify-between self-stretch">
          <div className="-tracking-xl text-sm leading-4 font-medium underline">
            Read case study
          </div>
          <div className="-tracking-xl text-sm leading-4 font-medium">
            {card.time}
          </div>
        </div>
      </div>
    </Link>
  );
};

