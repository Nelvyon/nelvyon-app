"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, Inbox, Plus } from "lucide-react";
import Link from "next/link";
import { ReactNode, useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/core/ui/button";
import { cn } from "@/core/ui/utils";

export const space = {
  xs: "p-1 gap-1",
  sm: "p-2 gap-2",
  md: "p-4 gap-4",
  lg: "p-6 gap-6",
  xl: "p-8 gap-8",
  xxl: "p-12 gap-12",
} as const;

const pageMotion = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
};

export function DashboardPageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      animate={pageMotion.animate}
      className="space-y-6 font-[family-name:var(--font-inter,Inter,var(--font-dm-sans,DM_Sans),system-ui,sans-serif)]"
      exit={pageMotion.exit}
      initial={pageMotion.initial}
      transition={pageMotion.transition}
    >
      {children}
    </motion.div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <motion.div
      animate={{ opacity: [0.45, 0.85, 0.45] }}
      className={cn("rounded-lg bg-muted", className)}
      transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

export function SkeletonMetricGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div className="rounded-xl border border-border bg-card p-6 shadow-card" key={i}>
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-4 h-8 w-28" />
          <Skeleton className="mt-3 h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 6, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="border-b border-border bg-muted/40 px-4 py-3">
        <div className="flex gap-4">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton className="h-3 flex-1" key={i} />
          ))}
        </div>
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div className="flex gap-4 border-b border-border px-4 py-4 last:border-0" key={r}>
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton className="h-4 flex-1" key={c} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonList({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4" key={i}>
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyIllustration() {
  return (
    <svg aria-hidden className="mx-auto h-24 w-24 text-muted-foreground/40" fill="none" viewBox="0 0 120 120">
      <rect height="72" rx="12" stroke="currentColor" strokeWidth="2" width="88" x="16" y="24" />
      <path d="M32 48h56M32 64h40M32 80h48" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
      <circle cx="88" cy="36" fill="currentColor" opacity="0.3" r="8" />
    </svg>
  );
}

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  icon,
}: {
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  icon?: ReactNode;
}) {
  return (
    <motion.div
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 px-6 py-16 text-center"
      initial={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.35 }}
    >
      {icon ?? <EmptyIllustration />}
      <h3 className="mt-6 text-lg font-semibold tracking-tight text-foreground">{title}</h3>
      {description ? <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p> : null}
      {actionLabel && (actionHref || onAction) ? (
        actionHref ? (
          <Button asChild className="mt-6 transition-transform hover:scale-[1.02]" size="sm">
            <Link href={actionHref}>
              <Plus className="mr-2 h-4 w-4" />
              {actionLabel}
            </Link>
          </Button>
        ) : (
          <Button className="mt-6 transition-transform hover:scale-[1.02]" onClick={onAction} size="sm" type="button">
            <Plus className="mr-2 h-4 w-4" />
            {actionLabel}
          </Button>
        )
      ) : null}
    </motion.div>
  );
}

export type MetricItem = {
  label: string;
  value: string | number;
  trend?: number;
  trendLabel?: string;
};

export function MetricCard({ label, value, trend, trendLabel }: MetricItem) {
  const up = trend != null && trend >= 0;
  const TrendIcon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <motion.div
      className="group rounded-xl border border-border bg-card p-6 shadow-card transition-all duration-200 hover:border-primary/30 hover:shadow-elevated"
      whileHover={{ y: -2 }}
    >
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-foreground">{value}</p>
      {trend != null ? (
        <p
          className={cn(
            "mt-2 flex items-center gap-1 text-xs font-medium",
            up ? "text-[hsl(var(--success))]" : "text-destructive",
          )}
        >
          <TrendIcon aria-hidden className="h-3.5 w-3.5" />
          {Math.abs(trend).toFixed(1)}%
          {trendLabel ? <span className="font-normal text-muted-foreground">· {trendLabel}</span> : null}
        </p>
      ) : null}
    </motion.div>
  );
}

export function MetricGrid({ items, loading }: { items: MetricItem[]; loading?: boolean }) {
  if (loading) return <SkeletonMetricGrid count={items.length || 4} />;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((m) => (
        <MetricCard key={m.label} {...m} />
      ))}
    </div>
  );
}

function EliteTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; name: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-elevated">
      <p className="font-medium text-foreground">{label}</p>
      {payload.map((p) => (
        <p className="mt-1 text-muted-foreground" key={p.name}>
          {p.name}: <span className="font-semibold text-foreground">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

export function EliteAreaChart({
  data,
  dataKey,
  xKey = "name",
  color = "hsl(var(--primary))",
  height = 280,
}: {
  data: Record<string, unknown>[];
  dataKey: string;
  xKey?: string;
  color?: string;
  height?: number;
}) {
  const chartData = useMemo(() => data, [data]);
  if (!chartData.length) {
    return (
      <div className="flex h-[280px] items-center justify-center rounded-xl border border-dashed border-border bg-card/30">
        <p className="text-sm text-muted-foreground">Sin datos para mostrar</p>
      </div>
    );
  }
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-card" style={{ height }}>
      <ResponsiveContainer height="100%" width="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="eliteFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
          <XAxis axisLine={false} dataKey={xKey} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} tickLine={false} />
          <YAxis axisLine={false} stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} tickLine={false} width={36} />
          <Tooltip content={<EliteTooltip />} />
          <Area dataKey={dataKey} fill="url(#eliteFill)" stroke={color} strokeWidth={2} type="monotone" />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DashboardListShell({
  loading,
  empty,
  emptyTitle,
  emptyDescription,
  emptyActionLabel,
  onEmptyAction,
  skeleton,
  children,
}: {
  loading?: boolean;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  skeleton?: ReactNode;
  children: ReactNode;
}) {
  if (loading) return <>{skeleton ?? <SkeletonTable />}</>;
  if (empty) {
    return (
      <EmptyState
        actionLabel={emptyActionLabel}
        description={emptyDescription}
        icon={<Inbox className="mx-auto h-16 w-16 text-muted-foreground/35" strokeWidth={1.25} />}
        onAction={onEmptyAction}
        title={emptyTitle ?? "Nada por aquí todavía"}
      />
    );
  }
  return <>{children}</>;
}

export function EliteModal({
  open,
  title,
  onClose,
  children,
  wide,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
        >
          <motion.button
            animate={{ opacity: 1 }}
            aria-label="Cerrar"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            onClick={onClose}
            type="button"
          />
          <motion.div
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className={cn(
              "relative z-10 max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-border bg-background p-6 shadow-elevated",
              wide ? "max-w-2xl" : "max-w-lg",
            )}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: "spring", damping: 28, stiffness: 360 }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
              <button
                className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                onClick={onClose}
                type="button"
              >
                ✕
              </button>
            </div>
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
