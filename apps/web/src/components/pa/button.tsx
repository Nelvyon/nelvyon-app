"use client";

import { cn } from "@/lib/pa/utils";
import Link from "next/link";

export const Button = ({
  text = "Solicitar informacion",
  href = "/contacto",
  containerClassName,
  variant = "default",
}: {
  text?: string;
  href?: string;
  containerClassName?: string;
  variant?: "default" | "primary";
}) => {
  if (variant === "primary") {
    return (
      <Link
        href={href}
        className={cn(
          "inline-flex w-fit items-center justify-center rounded-xl bg-[#0084FF] px-6 py-3 text-sm font-medium text-white transition hover:bg-[#0071db]",
          containerClassName,
        )}
      >
        {text}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className={cn(
        "group relative flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-white/20 bg-black py-2 pr-4 pl-11 tracking-tight",
        containerClassName,
      )}
    >
      <Box />
      <div className="absolute -inset-px rounded-lg bg-white/20 transition-[clip-path] duration-400 ease-out [clip-path:inset(0_100%_0_0)] group-hover:[clip-path:inset(0_0%_0_0)]" />
      <span className="inline-block text-white transition-transform duration-400 group-hover:-translate-x-8">
        {text}
      </span>
    </Link>
  );
};

const Box = () => {
  return (
    <div
      data-slot="button-box"
      className="bg-primary absolute inset-y-0 left-1 z-40 my-auto flex size-8 flex-col items-center justify-center gap-px rounded-[5px] transition-all duration-400 ease-out group-hover:left-[calc(100%-2.3rem)] group-hover:rotate-180 group-hover:transform"
    >
      <BubblesGroup />
    </div>
  );
};
const BubblesGroup = () => {
  return (
    <div className={cn("flex flex-col gap-px")}>
      <div className="flex gap-px">
        <Bubble />
        <Bubble />
        <Bubble highlight />
        <Bubble />
        <Bubble />
      </div>
      <div className="flex gap-px">
        <Bubble />
        <Bubble />
        <Bubble />
        <Bubble highlight />
        <Bubble />
      </div>
      <div className="flex gap-px">
        <Bubble highlight />
        <Bubble highlight />
        <Bubble highlight />
        <Bubble highlight />
        <Bubble highlight />
      </div>
      <div className="flex gap-px">
        <Bubble />
        <Bubble />
        <Bubble />
        <Bubble highlight />
        <Bubble />
      </div>
      <div className="flex gap-px">
        <Bubble />
        <Bubble />
        <Bubble highlight />
        <Bubble />
        <Bubble />
      </div>
    </div>
  );
};

const Bubble = ({ highlight }: { highlight?: boolean }) => {
  return (
    <span
      className={cn(
        "inline-block size-0.75 shrink-0 rounded-full bg-white/25",
        highlight && "bg-white duration-200 ease-linear",
      )}
    />
  );
};
