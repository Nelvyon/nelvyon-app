/**
 * DataStateWrapper — reusable component for loading / error / empty states.
 * Eliminates duplicated loading/error UI across all pages.
 * Fully i18n-aware: all visible text goes through translation system.
 */
import { ReactNode } from "react";
import { Loader2, AlertCircle, RefreshCw, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

interface Props {
  loading: boolean;
  error?: string | null;
  empty?: boolean;
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  emptyAction?: ReactNode;
  onRetry?: () => void;
  children: ReactNode;
  className?: string;
  /** Number of skeleton rows to show while loading */
  skeletonRows?: number;
}

export default function DataStateWrapper({
  loading,
  error,
  empty,
  emptyMessage,
  emptyIcon,
  emptyAction,
  onRetry,
  children,
  className,
  skeletonRows = 3,
}: Props) {
  const { ts } = useI18n();

  if (loading) {
    return (
      <div className={cn("space-y-3", className)}>
        {Array.from({ length: skeletonRows }).map((_, i) => (
          <div key={i} className="animate-pulse flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/5">
            <div className="w-10 h-10 rounded-lg bg-white/10" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-white/10 rounded w-3/4" />
              <div className="h-3 bg-white/5 rounded w-1/2" />
            </div>
            <div className="w-16 h-6 bg-white/10 rounded" />
          </div>
        ))}
        <div className="flex items-center justify-center gap-2 text-zinc-500 text-sm pt-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>{ts("loadingData")}</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-16 gap-4", className)}>
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-400" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-white font-medium">{ts("errorOccurred")}</p>
          <p className="text-sm text-zinc-400 max-w-md">{error}</p>
        </div>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="gap-2 border-white/10 hover:bg-white/5"
          >
            <RefreshCw className="w-4 h-4" />
            {ts("retry")}
          </Button>
        )}
      </div>
    );
  }

  if (empty) {
    return (
      <div className={cn("flex flex-col items-center justify-center py-16 gap-4", className)}>
        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
          {emptyIcon || <Inbox className="w-8 h-8 text-zinc-500" />}
        </div>
        <div className="text-center space-y-1">
          <p className="text-white font-medium">{emptyMessage || ts("noData")}</p>
          <p className="text-sm text-zinc-400">{ts("create")}</p>
        </div>
        {emptyAction}
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="gap-2 border-white/10 hover:bg-white/5"
          >
            <RefreshCw className="w-4 h-4" />
            {ts("refresh")}
          </Button>
        )}
      </div>
    );
  }

  return <>{children}</>;
}