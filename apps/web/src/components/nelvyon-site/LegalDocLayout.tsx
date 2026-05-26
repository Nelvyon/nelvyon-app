import type { ReactNode } from "react";

import { MarketingLegalLayout } from "@/components/landing/MarketingLegalLayout";

export function LegalDocLayout({ title, children }: { title: string; children: ReactNode }) {
  return <MarketingLegalLayout title={title}>{children}</MarketingLegalLayout>;
}
