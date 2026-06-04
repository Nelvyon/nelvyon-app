import { OsPreparedModulePage } from "@/features/os-shell/components/OsPreparedModulePage";

export default function OsIaPage() {
  return (
    <OsPreparedModulePage
      title="IA y agentes"
      description="Los agentes sectoriales y el catálogo de ejecución ya existen fuera de este shell. Esta sección agrupará la operación IA interna sin duplicar el CRM SaaS."
      relatedLinks={[
        { href: "/os/agents", label: "Catálogo de agentes OS" },
        { href: "/os/execution", label: "Ejecución" },
        { href: "/os", label: "Hub operaciones" },
      ]}
    />
  );
}
