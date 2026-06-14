import { RecetasClient } from "@/app/automatizacion/recetas/RecetasClient";

export default function RecetasPage() {
  return (
    <>
      <p className="text-sm text-muted-foreground">
        Recetas de automatización: onboarding, carrito, ROAS, tickets urgentes y email de bienvenida.
      </p>
      <RecetasClient />
    </>
  );
}
