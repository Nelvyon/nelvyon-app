import { ServicePackCatalog } from "@/features/packs/ServicePackCatalog";
import { ProtectedLayout } from "@/core/routing/ProtectedLayout";

export const metadata = {
  title: "Packs de marketing digital · NELVYON",
  description: "Catálogo de packs SEO, ads, redes, email y funnels listos para ejecutar.",
};

export default function PacksCatalogPage() {
  return (
    <ProtectedLayout module="campaigns">
      <ServicePackCatalog />
    </ProtectedLayout>
  );
}
