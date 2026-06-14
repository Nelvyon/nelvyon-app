import { FunnelsBuilderClient } from "@/app/funnels/builder/FunnelsBuilderClient";

export default function FunnelsBuilderPage() {
  return (
    <>
      <p className="text-sm text-muted-foreground">
        Builder de embudos: diseña pasos claros de Anuncio a CRM y mide conversión por campaña.
      </p>
      <FunnelsBuilderClient />
    </>
  );
}
