import type { StatusCell } from "./comparisonData";

export function ComparisonStatusCell({ value }: { value: StatusCell | string }) {
  if (value === "yes") {
    return (
      <span aria-label="Incluido y top calidad" className="text-base" title="Incluido y top calidad">
        ✅
      </span>
    );
  }
  if (value === "warn") {
    return (
      <span aria-label="Limitado o subcontratado" className="text-base" title="Limitado o subcontratado">
        ⚠️
      </span>
    );
  }
  if (value === "no") {
    return (
      <span aria-label="No incluido" className="text-base" title="No incluido">
        ❌
      </span>
    );
  }
  return <span className="text-sm font-medium text-white/90">{value}</span>;
}
