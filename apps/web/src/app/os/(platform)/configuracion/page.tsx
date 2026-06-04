import { OsPreparedModulePage } from "@/features/os-shell/components/OsPreparedModulePage";

export default function OsConfiguracionPage() {
  return (
    <OsPreparedModulePage
      title="Configuración OS"
      description="Preferencias del workspace, permisos y enlaces operativos. La configuración avanzada sigue en rutas existentes hasta consolidar en 2B."
      relatedLinks={[
        { href: "/os/workspaces/select", label: "Seleccionar workspace" },
        { href: "/settings", label: "Ajustes producto (legacy)" },
        { href: "/os/tenants/activation", label: "Activación tenants" },
      ]}
    />
  );
}
