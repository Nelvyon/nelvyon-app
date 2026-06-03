import { cn } from "@/lib/pa/utils";
import Link from "next/link";

export const Logo = ({ className }: { className?: string }) => {
  return (
    <Link
      href="/"
      className={cn("inline-flex items-center gap-2.5", className)}
      aria-label="NELVYON"
    >
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#0084FF]/40 bg-[#0084FF]/10 text-sm font-bold text-[#0084FF]"
        aria-hidden
      >
        N
      </span>
      <span className="text-natural-white text-lg font-semibold tracking-tight">
        NELVYON
      </span>
    </Link>
  );
};
