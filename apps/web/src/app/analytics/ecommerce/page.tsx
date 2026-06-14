import { AnalyticsEcommerceClient } from "@/app/analytics/ecommerce/AnalyticsEcommerceClient";

export default function AnalyticsEcommercePage() {
  return (
    <>
      <p className="text-sm text-muted-foreground">
        Analytics ecommerce: carrito, checkout, conversión e integración con Publicidad y Email.
      </p>
      <AnalyticsEcommerceClient />
    </>
  );
}
