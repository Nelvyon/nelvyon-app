import { redirect } from "next/navigation";

/** Legacy SaaS social auto-publish — redirige al hub C2 Social. */
export default function LegacySaasSocialRedirect() {
  redirect("/social/auto-publish");
}
