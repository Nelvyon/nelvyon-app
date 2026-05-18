import type { Metadata } from "next";

import { ProtectedLayout } from "@/core/routing/ProtectedLayout";
import { DesignSystemOsPage } from "@/design-system/preview/DesignSystemOsPage";

export const metadata: Metadata = {
  title: "Design System v1 · Operations · NELVYON",
  description: "NELVYON tokens and core primitives — internal OS reference; not a migration of production components.",
  robots: { index: false, follow: false },
};

export default function OsDesignSystemPage() {
  return (
    <ProtectedLayout module="os">
      <DesignSystemOsPage />
    </ProtectedLayout>
  );
}
