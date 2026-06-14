import { EcommerceHubClient } from "@/app/ecommerce/EcommerceHubClient";

export default function EcommerceHubPage() {
  return (
    <>
      <p className="text-sm text-muted-foreground">
        Ecommerce: editor de tienda, analytics de carrito y checkout, integrado con Publicidad y campañas Email.
      </p>
      <EcommerceHubClient />
    </>
  );
}
