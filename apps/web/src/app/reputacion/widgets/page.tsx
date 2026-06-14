import { WidgetsClient } from "@/app/reputacion/widgets/WidgetsClient";

export default function WidgetsPage() {
  return (
    <>
      <p className="text-sm text-muted-foreground">
        Widgets y embeds de reseñas para mostrar reputación en tu web o landing.
      </p>
      <WidgetsClient />
    </>
  );
}
