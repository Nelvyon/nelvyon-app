import { OsPreparedModulePage } from "@/features/os-shell/components/OsPreparedModulePage";

export default function OsPipelinePage() {
  return (
    <OsPreparedModulePage
      title="Pipeline comercial interno"
      description="Aquí vivirá el pipeline de operación NELVYON (deals internos). saas_deals y os_deals aún no están implementados; las tablas legacy (deals, crm_deals, pipeline_deals) no se muestran en este shell hasta la fase de unificación."
      dataNote="Ver docs/PHASE_1C_SAAS_DEALS_PLAN.md para el plan de migración (sin mezclar con SaaS cliente)."
      relatedLinks={[
        { href: "/os/dashboard", label: "Volver al dashboard" },
        { href: "/os", label: "Hub operaciones legacy" },
      ]}
    />
  );
}
