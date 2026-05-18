import { useTheme } from '@/contexts/ThemeContext';
import { hexToRgba } from '@/lib/theme-engine';

function Pulse({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const { colors } = useTheme();
  return (
    <div
      className={`animate-pulse rounded ${className || ''}`}
      style={{ backgroundColor: hexToRgba(colors.textMuted, 0.1), ...style }}
    />
  );
}

/** Skeleton for a standard metric/stat card */
export function SkeletonStatCard() {
  const { colors } = useTheme();
  return (
    <div
      className="rounded-xl p-5 border"
      style={{ backgroundColor: colors.card, borderColor: colors.border }}
    >
      <div className="flex items-center justify-between mb-4">
        <Pulse className="h-3 w-20" />
        <Pulse className="h-8 w-8 rounded-lg" />
      </div>
      <Pulse className="h-7 w-24 mb-2" />
      <Pulse className="h-3 w-16" />
    </div>
  );
}

/** Skeleton for a table row */
export function SkeletonTableRow({ columns = 5 }: { columns?: number }) {
  const { colors } = useTheme();
  return (
    <div
      className="flex items-center gap-4 px-4 py-3 border-b"
      style={{ borderColor: colors.border }}
    >
      {Array.from({ length: columns }).map((_, i) => (
        <Pulse
          key={i}
          className="h-3"
          style={{ width: i === 0 ? '30%' : `${Math.max(8, 20 - i * 3)}%` }}
        />
      ))}
    </div>
  );
}

/** Skeleton for a full table */
export function SkeletonTable({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  const { colors } = useTheme();
  return (
    <div className="rounded-xl border overflow-hidden" style={{ backgroundColor: colors.card, borderColor: colors.border }}>
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-3 border-b" style={{ borderColor: colors.border, backgroundColor: hexToRgba(colors.textMuted, 0.03) }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Pulse key={i} className="h-3" style={{ width: `${Math.max(10, 22 - i * 3)}%` }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonTableRow key={i} columns={columns} />
      ))}
    </div>
  );
}

/** Skeleton for a chart area */
export function SkeletonChart({ height = 200 }: { height?: number }) {
  const { colors } = useTheme();
  return (
    <div
      className="rounded-xl border p-5"
      style={{ backgroundColor: colors.card, borderColor: colors.border }}
    >
      <div className="flex items-center justify-between mb-4">
        <Pulse className="h-4 w-32" />
        <div className="flex gap-2">
          <Pulse className="h-6 w-16 rounded-md" />
          <Pulse className="h-6 w-16 rounded-md" />
        </div>
      </div>
      <div className="flex items-end gap-2" style={{ height }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <Pulse
            key={i}
            className="flex-1 rounded-t"
            style={{ height: `${30 + Math.random() * 60}%` }}
          />
        ))}
      </div>
    </div>
  );
}

/** Skeleton for a card grid (e.g., contacts, deals) */
export function SkeletonCardGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonStatCard key={i} />
      ))}
    </div>
  );
}

/** Skeleton for a full dashboard page */
export function SkeletonDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SkeletonChart />
        <SkeletonChart />
      </div>
      <SkeletonTable rows={5} columns={5} />
    </div>
  );
}

/** Skeleton for a list item */
export function SkeletonListItem() {
  const { colors } = useTheme();
  return (
    <div
      className="flex items-center gap-4 p-4 border-b"
      style={{ borderColor: colors.border }}
    >
      <Pulse className="w-10 h-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Pulse className="h-3.5 w-3/5" />
        <Pulse className="h-2.5 w-2/5" />
      </div>
      <Pulse className="h-6 w-16 rounded-md" />
    </div>
  );
}