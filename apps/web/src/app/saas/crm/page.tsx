import { redirect } from "next/navigation";

/** CRM legacy SaaS shell — redirige al módulo Revenue unificado. */
export default function SaasCrmRedirectPage() {
  redirect("/crm");
}
