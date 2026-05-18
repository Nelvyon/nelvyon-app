"use client";

interface ErrorBannerProps {
  message: string;
  action?: string;
  actionUrl?: string;
  onDismiss?: () => void;
  variant?: "error" | "warning";
}

export function ErrorBanner({
  message,
  action,
  actionUrl,
  onDismiss,
  variant = "error",
}: ErrorBannerProps) {
  const colors =
    variant === "warning"
      ? {
          border: "border-yellow-900",
          bg: "bg-yellow-950/30",
          text: "text-yellow-300",
          btn: "bg-yellow-600 hover:bg-yellow-500",
        }
      : {
          border: "border-red-900",
          bg: "bg-red-950/30",
          text: "text-red-300",
          btn: "bg-indigo-600 hover:bg-indigo-500",
        };

  return (
    <div className={`rounded-xl border ${colors.border} ${colors.bg} p-5`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className={`text-sm font-medium ${colors.text} mb-1`}>{message}</p>
          {action && actionUrl ? (
            <a
              href={actionUrl}
              className={`inline-block mt-2 px-4 py-1.5 rounded-lg text-xs font-medium text-white transition-colors ${colors.btn}`}
            >
              {action} →
            </a>
          ) : null}
        </div>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="text-zinc-500 hover:text-zinc-300 text-lg leading-none mt-0.5"
            aria-label="Cerrar"
          >
            ×
          </button>
        ) : null}
      </div>
    </div>
  );
}
