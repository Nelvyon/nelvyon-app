"use client";

/**
 * Primitivas de presentación con el marcado y las clases REALES de W3CRM
 * (`card`, `card-header`, `card-title`, `card-body`, `widget-stat`, `badge`,
 * `row`/`col-*` de Bootstrap 5).
 *
 * Reproducen la API de los equivalentes actuales de NELVYON (`DarkCard`,
 * `StatCard`, `KpiTile`, `SaasWidgetHeader`, `SaasAvatarBubble`) para poder
 * sustituir SOLO la capa visual de una pantalla sin tocar su lógica.
 */
import Link from "next/link";
import type { ReactNode } from "react";

/** Equivalente visual de `DarkCard` → tarjeta estándar de W3CRM. */
export function W3crmCard({
  children,
  className = "",
  title,
  action,
}: {
  children: ReactNode;
  className?: string;
  title?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className={`card ${className}`.trim()}>
      {title ? (
        <div className="card-header">
          <h4 className="card-title">{title}</h4>
          {action}
        </div>
      ) : null}
      <div className="card-body">{children}</div>
    </div>
  );
}

/** Cabecera de widget suelta, cuando no hay tarjeta contenedora. */
export function W3crmSectionTitle({ title, action }: { title: ReactNode; action?: ReactNode }) {
  return (
    <div className="d-flex align-items-center justify-content-between mb-3">
      <h4 className="card-title mb-0">{title}</h4>
      {action}
    </div>
  );
}

/** Equivalente de `StatCard` → tarjeta de estadística de W3CRM. */
export function W3crmStatCard({
  label,
  value,
  href,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  href?: string;
  accent?: boolean;
}) {
  const cuerpo = (
    <div className={`card ${accent ? "bg-primary" : ""}`.trim()}>
      <div className="card-body">
        <p className={`mb-1 fs-14 ${accent ? "text-white" : "text-muted"}`}>{label}</p>
        <h2 className={`mb-0 ${accent ? "text-white" : ""}`.trim()}>{value}</h2>
      </div>
    </div>
  );
  return href ? (
    <Link href={href} className="text-decoration-none d-block">
      {cuerpo}
    </Link>
  ) : (
    cuerpo
  );
}

/** Equivalente de `KpiTile` → widget-stat de W3CRM. */
export function W3crmKpiTile({
  icon,
  label,
  value,
  accent = false,
}: {
  icon?: ReactNode;
  label: string;
  value: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className={`widget-stat card ${accent ? "bg-primary" : ""}`.trim()}>
      <div className="card-body p-4">
        <div className="media ai-icon d-flex align-items-center">
          {icon ? (
            <span className={`me-3 ${accent ? "text-white" : "text-primary"}`}>{icon}</span>
          ) : null}
          <div className="media-body">
            <p className={`mb-1 ${accent ? "text-white" : ""}`.trim()}>{label}</p>
            <h4 className={`mb-0 ${accent ? "text-white" : ""}`.trim()}>{value}</h4>
          </div>
        </div>
      </div>
    </div>
  );
}

const TONO_BADGE: Record<string, string> = {
  ok: "badge-success",
  warn: "badge-warning",
  crit: "badge-danger",
  pending: "badge-primary",
};

/** Punto de estado → badge de W3CRM, conservando la misma semántica de estados. */
export function W3crmStatusBadge({ status, label }: { status: string; label: string }) {
  return <span className={`badge ${TONO_BADGE[status] ?? "badge-secondary"} me-2`}>{label}</span>;
}

/** Equivalente de `SaasAvatarBubble` con el patrón de avatar de W3CRM. */
export function W3crmAvatar({ seed, label }: { seed: string; label: string }) {
  const inicial = (label || seed || "?").trim().charAt(0).toUpperCase();
  return (
    <span
      className="avatar avatar-sm rounded-circle bg-primary text-white d-inline-flex align-items-center justify-content-center"
      style={{ width: 36, height: 36, flex: "0 0 36px" }}
      aria-hidden="true"
    >
      {inicial}
    </span>
  );
}

/** Estado vacío con el patrón de la plantilla. */
export function W3crmEmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="text-center py-4">
      <h5 className="mb-1">{title}</h5>
      {description ? <p className="text-muted mb-0 fs-14">{description}</p> : null}
    </div>
  );
}
