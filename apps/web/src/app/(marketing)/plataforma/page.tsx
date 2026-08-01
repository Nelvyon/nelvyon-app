import type { Metadata } from "next";
import { redirect } from "next/navigation";

/** Legacy URL — prefer next.config redirect; keep page as safety net. */
export const metadata: Metadata = {
  title: "SaaS B2B | NELVYON",
  alternates: { canonical: "/producto" },
};

export default function Page() {
  redirect("/producto");
}
