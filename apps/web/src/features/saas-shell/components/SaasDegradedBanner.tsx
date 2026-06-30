"use client";

type SaasDegradedBannerProps = {
  reason?: string;
  children?: React.ReactNode;
};

const DEFAULT_MESSAGE =
  "Modo degradado — conecta integraciones o completa la configuración para datos en vivo.";

export function SaasDegradedBanner({ reason, children }: SaasDegradedBannerProps) {
  return (
    <div
      className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
      role="status"
      data-testid="saas-degraded-banner"
    >
      <p className="font-medium text-amber-200">Datos parciales</p>
      <p className="mt-1 text-xs text-amber-100/90">{children ?? reason ?? DEFAULT_MESSAGE}</p>
    </div>
  );
}
