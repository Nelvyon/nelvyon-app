import { redirect } from "next/navigation";

/** Legacy Spanish slug → canonical affiliates module. */
export default function SaasAfiliadosRedirectPage() {
  redirect("/saas/affiliates");
}
