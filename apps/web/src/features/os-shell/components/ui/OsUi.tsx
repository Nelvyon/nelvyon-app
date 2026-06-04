"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { ReactNode } from "react";

import { cn } from "@/core/ui/utils";

export function OsEmptyState({
  title = "Sin datos todavía",
  description,
  action,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-white/15 bg-[#0b1428]/60 px-8 py-14 text-center">
      <p className="text-base font-medium text-white/80">{title}</p>
      {description ? <p className="mx-auto mt-2 max-w-md text-sm text-white/45">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

export function OsLoadingBlock({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm text-white/50">
      <Loader2 className="h-5 w-5 animate-spin text-[#0084FF]" aria-hidden />
      {label}
    </div>
  );
}

export function OsErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
      {message}
    </div>
  );
}

export function OsStatusBadge({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "success" | "warning" | "danger" | "info";
}) {
  const tones = {
    neutral: "border-white/15 bg-white/5 text-white/70",
    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    warning: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    danger: "border-red-500/30 bg-red-500/10 text-red-200",
    info: "border-[#0084FF]/40 bg-[#0084FF]/10 text-[#7ec3ff]",
  };
  return (
    <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium", tones[tone])}>
      {label}
    </span>
  );
}

export function OsPageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold text-white">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-sm text-white/55">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export function OsPrimaryButton({
  children,
  href,
  onClick,
  disabled,
  type = "button",
}: {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const cls =
    "inline-flex h-9 items-center justify-center rounded-lg bg-[#0084FF] px-4 text-sm font-medium text-white shadow-[0_0_20px_rgba(0,132,255,0.2)] transition hover:bg-[#0070d6] disabled:opacity-50";
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function OsGhostButton({
  children,
  href,
  onClick,
  disabled,
  type = "button",
}: {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  const cls =
    "inline-flex h-9 items-center justify-center rounded-lg border border-white/15 bg-transparent px-4 text-sm text-white/85 hover:border-white/25 hover:bg-white/5 disabled:opacity-50";
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} className={cls} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

export function OsField({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-white/50">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-white/40">{hint}</span> : null}
    </label>
  );
}

const inputCls =
  "w-full rounded-lg border border-white/15 bg-[#07122a] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-[#0084FF]/60 focus:outline-none focus:ring-1 focus:ring-[#0084FF]/40";

export function OsInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputCls, props.className)} />;
}

export function OsSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(inputCls, props.className)} />;
}

export function OsTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn(inputCls, "min-h-[88px] resize-y", props.className)}
    />
  );
}

export function OsTable({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#0b1428]">
      <table className="w-full min-w-[640px] text-left text-sm">{children}</table>
    </div>
  );
}
