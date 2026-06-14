import { AutomatizacionHubClient } from "@/app/automatizacion/AutomatizacionHubClient";

export default function AutomatizacionHubPage() {
  return (
    <>
      <p className="text-sm text-muted-foreground">
        Automatización: workflows si pasa X haz Y, con conectores CRM, Helpdesk, Publicidad, Email y Ecommerce.
      </p>
      <AutomatizacionHubClient />
    </>
  );
}
