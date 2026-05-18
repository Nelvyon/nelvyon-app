/**
 * UXFeedback — Shared UX feedback components for all NELVYON flows.
 *
 * Provides:
 * - SuccessToast: Consistent success feedback with action context
 * - ErrorMessage: User-friendly error display with retry option
 * - ConfirmDialog: Confirmation for destructive actions
 * - LoadingOverlay: Contextual loading states
 * - EmptyState: Consistent empty state with action CTA
 */
import React from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Loader2, Inbox, RefreshCw, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ── Success Feedback ──
interface SuccessFeedbackProps {
  message: string;
  detail?: string;
  className?: string;
}

export function SuccessFeedback({ message, detail, className }: SuccessFeedbackProps) {
  return (
    <div className={cn("flex items-start gap-3 p-3 rounded-xl bg-emerald-500/[0.06] border border-emerald-500/10", className)}>
      <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-xs font-semibold text-emerald-300">{message}</p>
        {detail && <p className="text-[10px] text-emerald-400/60 mt-0.5">{detail}</p>}
      </div>
    </div>
  );
}

// ── Error Message ──
interface ErrorMessageProps {
  error: string;
  detail?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorMessage({ error, detail, onRetry, className }: ErrorMessageProps) {
  return (
    <div className={cn("flex items-start gap-3 p-3 rounded-xl bg-red-500/[0.06] border border-red-500/10", className)}>
      <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="text-xs font-semibold text-red-300">{error}</p>
        {detail && <p className="text-[10px] text-red-400/60 mt-0.5">{detail}</p>}
      </div>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}
          className="border-red-500/20 text-red-400 hover:bg-red-500/10 h-7 text-[10px] shrink-0">
          <RefreshCw className="w-3 h-3 mr-1" /> Reintentar
        </Button>
      )}
    </div>
  );
}

// ── Warning Message ──
interface WarningMessageProps {
  message: string;
  detail?: string;
  className?: string;
}

export function WarningMessage({ message, detail, className }: WarningMessageProps) {
  return (
    <div className={cn("flex items-start gap-3 p-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/10", className)}>
      <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-xs font-semibold text-amber-300">{message}</p>
        {detail && <p className="text-[10px] text-amber-400/60 mt-0.5">{detail}</p>}
      </div>
    </div>
  );
}

// ── Loading Overlay ──
interface LoadingOverlayProps {
  message?: string;
  className?: string;
}

export function LoadingOverlay({ message = "Cargando...", className }: LoadingOverlayProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16", className)}>
      <Loader2 className="w-8 h-8 text-violet-500 animate-spin mb-3" />
      <p className="text-sm text-zinc-400">{message}</p>
    </div>
  );
}

// ── Empty State ──
interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({ icon: Icon = Inbox, title, description, actionLabel, onAction, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 rounded-xl bg-[#0A0E13] border border-white/[0.04]", className)}>
      <Icon className="w-10 h-10 text-zinc-700 mb-3" />
      <p className="text-sm text-zinc-500 mb-1">{title}</p>
      {description && <p className="text-[10px] text-zinc-600 mb-4 text-center max-w-sm">{description}</p>}
      {actionLabel && onAction && (
        <Button size="sm" onClick={onAction} className="bg-violet-600 hover:bg-violet-700 text-white text-xs">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

// ── Confirm Dialog (inline) ──
interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
  className?: string;
}

export function ConfirmDialog({
  title, message, confirmLabel = "Confirmar", cancelLabel = "Cancelar",
  variant = "danger", onConfirm, onCancel, className,
}: ConfirmDialogProps) {
  const variantStyles = {
    danger: { bg: "bg-red-500/[0.06]", border: "border-red-500/10", btn: "bg-red-600 hover:bg-red-700", icon: AlertTriangle, iconColor: "text-red-400" },
    warning: { bg: "bg-amber-500/[0.06]", border: "border-amber-500/10", btn: "bg-amber-600 hover:bg-amber-700", icon: AlertTriangle, iconColor: "text-amber-400" },
    info: { bg: "bg-blue-500/[0.06]", border: "border-blue-500/10", btn: "bg-blue-600 hover:bg-blue-700", icon: AlertCircle, iconColor: "text-blue-400" },
  };
  const style = variantStyles[variant];
  const VIcon = style.icon;

  return (
    <div className={cn("p-4 rounded-xl border", style.bg, style.border, className)}>
      <div className="flex items-start gap-3">
        <VIcon className={cn("w-5 h-5 mt-0.5 shrink-0", style.iconColor)} />
        <div className="flex-1">
          <p className="text-sm font-bold text-white mb-1">{title}</p>
          <p className="text-xs text-zinc-400 mb-3">{message}</p>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={onConfirm} className={cn("text-white text-xs h-8", style.btn)}>
              {confirmLabel}
            </Button>
            <Button size="sm" variant="outline" onClick={onCancel}
              className="border-white/10 text-zinc-400 h-8 text-xs">
              {cancelLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Rate Limit Warning ──
export function RateLimitWarning({ message, className }: { message: string; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2 p-3 rounded-xl bg-amber-500/[0.06] border border-amber-500/10", className)}>
      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
      <p className="text-xs text-amber-300">{message}</p>
    </div>
  );
}