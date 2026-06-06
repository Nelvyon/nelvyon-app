import { PortalProtectedLayout } from "@/features/client_portal_v1/components/PortalProtectedLayout";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <PortalProtectedLayout>{children}</PortalProtectedLayout>;
}
