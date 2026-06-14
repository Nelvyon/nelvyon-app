import { redirect } from "next/navigation";

/** Legacy helpdesk dashboard — redirige al inbox unificado. */
export default function LegacyHelpdeskRedirect() {
  redirect("/inbox/tickets");
}
