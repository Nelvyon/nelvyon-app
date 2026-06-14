import { StoreDetailClient } from "@/app/ecommerce/[id]/StoreDetailClient";

export default function StoreDetailPage() {
  return (
    <>
      <p className="text-sm text-muted-foreground">
        Detalle de tienda: productos, analytics de carrito, checkout e integración con Publicidad y Email.
      </p>
      <StoreDetailClient />
    </>
  );
}
