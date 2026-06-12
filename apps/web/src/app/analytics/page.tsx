import { redirect } from "next/navigation";

/** Analytics home merged into dashboard — keep URL for bookmarks. */
export default function AnalyticsOverviewPage() {
  redirect("/dashboard");
}
