import { ReglasClient } from "@/app/automatizacion/reglas/ReglasClient";

export default function ReglasPage() {
  return (
    <>
      <p className="text-sm text-muted-foreground">
        Reglas CRM: si pasa X en deals o contactos, ejecuta Y automáticamente.
      </p>
      <ReglasClient />
    </>
  );
}
