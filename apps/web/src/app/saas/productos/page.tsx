import { redirect } from "next/navigation";

/** Legacy route — product catalog lives under Store. */
export default function SaasProductosRedirectPage() {
  redirect("/saas/store");
}
