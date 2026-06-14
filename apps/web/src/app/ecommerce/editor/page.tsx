import { EcommerceEditorClient } from "@/app/ecommerce/editor/EcommerceEditorClient";

export default function EcommerceEditorPage() {
  return (
    <>
      <p className="text-sm text-muted-foreground">
        Editor de tienda ecommerce: catálogo, landing de producto y checkout con Stripe integrado.
      </p>
      <EcommerceEditorClient />
    </>
  );
}
