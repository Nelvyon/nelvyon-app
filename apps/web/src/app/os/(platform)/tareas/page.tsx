import { OsPreparedModulePage } from "@/features/os-shell/components/OsPreparedModulePage";

export default function OsTareasPage() {
  return (
    <OsPreparedModulePage
      title="Tareas operativas"
      description="La tabla os_tasks no existe todavía. No se muestran tareas simuladas."
      relatedLinks={[
        { href: "/os/execution", label: "Cola de ejecución OS" },
        { href: "/os/dashboard", label: "Dashboard" },
      ]}
    />
  );
}
