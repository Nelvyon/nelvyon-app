import { OsPreparedModulePage } from "@/features/os-shell/components/OsPreparedModulePage";

export default function OsDocumentosPage() {
  return (
    <OsPreparedModulePage
      title="Documentos y entregables"
      description="Los outputs generados (nelvyon_outputs) se consultan desde el dashboard y QA. Un gestor documental unificado llegará en una fase posterior."
      relatedLinks={[
        { href: "/os/dashboard", label: "Dashboard (entregas recientes)" },
        { href: "/os/qa/checklist", label: "Checklist QA OS" },
      ]}
    />
  );
}
