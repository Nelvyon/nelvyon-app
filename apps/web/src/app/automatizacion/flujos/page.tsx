import { FlujosClient } from "@/app/automatizacion/flujos/FlujosClient";

export default function FlujosPage() {
  return (
    <>
      <p className="text-sm text-muted-foreground">
        Flujos de automatización: crea workflows visuales si pasa X, haz Y.
      </p>
      <FlujosClient />
    </>
  );
}
