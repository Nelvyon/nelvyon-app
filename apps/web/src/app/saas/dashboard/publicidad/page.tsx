import { redirect } from "next/navigation";

/** Legacy SaaS publicidad — redirige al hub unificado C1. */
export default function LegacySaasPublicidadRedirect() {
  redirect("/publicidad");
}
