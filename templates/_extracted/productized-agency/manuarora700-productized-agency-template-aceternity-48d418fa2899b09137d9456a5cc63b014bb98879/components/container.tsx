import { cn } from "@/lib/utils";

export const Container = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => {
  return (
    <div
      data-slot="container"
      className={cn(
        "max-w-container mx-auto w-full px-4 sm:px-6 lg:px-8",
        className,
      )}
    >
      {children}
    </div>
  );
};
