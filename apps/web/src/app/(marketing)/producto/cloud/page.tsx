import { redirect } from "next/navigation";

// `home-cloud-based-saas.html` se elimino al consolidar en Home 08 y SaaS 02
// y devuelve 404. Sin modulo especifico equivalente, se resuelve a /saas, que
// sirve SaaS 02, igual que los slugs `ia` y `agentes`.
export default function Page() {
  return redirect("/saas");
}
