export function NarrativeStep({
  label,
  title,
}: {
  label: string;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-[#0084FF]/40 bg-[#0084FF]/10 text-xs font-semibold text-[#0084FF]">
        {label}
      </span>
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white/55">{title}</span>
    </div>
  );
}
