import { redirect } from "next/navigation";

/** Legacy CRM — redirige al módulo Revenue unificado. */
export default function LegacyCrmDashboardRedirect() {
  redirect("/crm/clients");
}
