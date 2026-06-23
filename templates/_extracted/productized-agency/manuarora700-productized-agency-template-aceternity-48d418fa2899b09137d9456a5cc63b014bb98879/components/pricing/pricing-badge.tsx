import { cn } from "@/lib/utils";

interface PricingBadgeProps {
  variant?: "danger" | "success";
  className?: string;
  children: React.ReactNode;
}

export const PricingBadge = ({
  variant = "danger",
  className,
  children,
}: PricingBadgeProps) => {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-full px-4 py-1.5",
        variant === "danger"
          ? "bg-dusty-red/10 text-dusty-red"
          : "text-dusty-green bg-[color-mix(in_oklab,var(--color-dusty-green)_30%,#fff)]",
        className,
      )}
    >
      {children}
    </div>
  );
};

