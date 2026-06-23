import { redirect } from "next/navigation";

export default function TerminosRedirect() {
  redirect("/legal/terms");
}
