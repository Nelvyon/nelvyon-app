import { redirect } from "next/navigation";

/** Legacy social scheduler — redirige al hub C2 Social. */
export default function LegacySocialSchedulerRedirect() {
  redirect("/social/scheduler");
}
