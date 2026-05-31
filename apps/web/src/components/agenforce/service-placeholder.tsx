import { NELVYON_BLUE } from "./marketing-brand";

type ServicePlaceholderProps = {
  label: string;
  compact?: boolean;
};

export function ServicePlaceholder({ label, compact = false }: ServicePlaceholderProps) {
  return (
    <div
      className={`nelvyon-service-placeholder${compact ? " nelvyon-service-placeholder--compact" : ""}`}
      aria-hidden
    >
      <span className="nelvyon-service-placeholder__accent" style={{ background: NELVYON_BLUE }} />
      <span className="nelvyon-service-placeholder__label">{label}</span>
    </div>
  );
}
