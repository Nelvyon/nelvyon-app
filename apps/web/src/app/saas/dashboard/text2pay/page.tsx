import { redirectLegacyF62Module } from "@/lib/saas/legacyF62Redirects";

export default function LegacyRedirectPage() {
  redirectLegacyF62Module("text2pay");
}
