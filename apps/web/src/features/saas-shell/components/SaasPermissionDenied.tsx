import { cn } from "@/core/ui/utils";

export function SaasPermissionDenied({
  message,
  className,
}: {
  message: string;
  className?: string;
}) {
  return (
    <p className={cn("rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground", className)}>
      {message}
    </p>
  );
}
