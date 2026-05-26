import type { StatusCell } from "./comparisonData";

export function ComparisonStatusCell({ value }: { value: StatusCell | string }) {
  if (value === "yes") {
    return (
      <span aria-label="Incluido" className="text-lg text-[#22C55E]" title="Incluido">
        ✅
      </span>
    );
  }
  if (value === "warn") {
    return (
      <span aria-label="Limitado" className="text-lg text-[#EAB308]" title="Limitado">
        ⚠️
      </span>
    );
  }
  if (value === "no") {
    return (
      <span aria-label="No incluido" className="text-lg text-[#EF4444]" title="No incluido">
        ❌
      </span>
    );
  }
  return <span className="text-sm font-medium text-white/90">{value}</span>;
}
