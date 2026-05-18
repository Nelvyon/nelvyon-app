export type MantenimientoAuditStatus = "pass" | "warn" | "fail" | "pending";

export type MantenimientoAuditPriority = "P1" | "P2" | "P3";

/** Web maintenance work types for disclosure badges (no live monitoring or external APIs). */
export type MantenimientoTypeKind =
  | "actualizaciones"
  | "backups"
  | "seguridad"
  | "rendimiento"
  | "uptime"
  | "seo_tecnico"
  | "soporte"
  | "reporting";

export interface MantenimientoPremiumPageSeoConfig {
  title: string;
  description: string;
  canonicalPath?: string;
  siteName?: string;
  keywords?: string[];
  locale?: string;
}

export interface MantenimientoAuditItem {
  id: string;
  label: string;
  status: MantenimientoAuditStatus;
  priority: MantenimientoAuditPriority;
  evidence: string;
  types?: readonly MantenimientoTypeKind[];
}

export type MantenimientoModule =
  | "initial_audit"
  | "updates_patches"
  | "backups_recovery"
  | "security_hardening"
  | "performance_cwv"
  | "uptime_monitoring"
  | "monthly_reporting";

export interface MantenimientoDeliverableSection {
  id: string;
  module: MantenimientoModule;
  title: string;
  intro?: string;
  items: MantenimientoAuditItem[];
}

export interface MantenimientoProjectConfig {
  pageSeo: MantenimientoPremiumPageSeoConfig;
  clientLabel: string;
  projectName: string;
  projectSubtitle: string;
  generatedNote: string;
  sections: MantenimientoDeliverableSection[];
}
