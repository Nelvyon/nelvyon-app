import { redirect } from "next/navigation";

/** Legacy social monitoring — redirige al hub C2 Social. */
export default function LegacySocialMonitoringRedirect() {
  redirect("/social/monitoring");
}
