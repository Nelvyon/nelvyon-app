import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** Legacy route — redirect to unified SaaS integraciones hub. */
export default async function IntegrationsDashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const params = new URLSearchParams();

  const success = sp.success;
  const error = sp.error;
  if (typeof success === "string") params.set("oauth_success", success);
  if (typeof error === "string") params.set("oauth_error", error);

  const q = params.toString();
  redirect(q ? `/saas/integraciones?${q}` : "/saas/integraciones");
}
