import { cn } from "@/lib/pa/utils";

interface PricingBadgeProps {
  className?: string;
  children: React.ReactNode;
}

export const PricingBadge = ({ className, children }: PricingBadgeProps) => {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full border border-[#0084FF]/35 bg-[#0084FF]/15 px-3 py-1 text-xs font-medium text-[#0084FF]",
        className,
      )}
    >
      {children}
    </div>
  );
};
