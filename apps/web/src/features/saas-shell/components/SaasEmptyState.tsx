import type { ReactNode } from "react";

export const SAAS_EMPTY_TITLE = "Sin datos todavía";
export const SAAS_EMPTY_DESCRIPTION = "Conecta datos o crea el primer registro.";

export function SaasEmptyState({
  title = SAAS_EMPTY_TITLE,
  description = SAAS_EMPTY_DESCRIPTION,
  action,
  className,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-md border border-dashed border-border bg-muted/30 p-6 text-center ${className ?? ""}`}
      data-testid="saas-empty-state"
    >
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  );
}
