import { redirect } from "next/navigation";

/** Legacy helpdesk detail — redirige al inbox unificado. */
export default async function LegacyHelpdeskDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/inbox/tickets/${id}`);
}
