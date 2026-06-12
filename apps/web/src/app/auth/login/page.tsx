import { redirect } from "next/navigation";

type SearchParams = { next?: string };

type Props = {
  searchParams: Promise<SearchParams>;
};

export default async function AuthLoginAliasPage({ searchParams }: Props) {
  const sp = await searchParams;
  const next = sp?.next?.trim();
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }
  redirect("/login");
}
