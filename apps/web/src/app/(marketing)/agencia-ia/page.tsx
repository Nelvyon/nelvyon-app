import { redirect } from "next/navigation";

// `home-ai-startup.html` se elimino al consolidar en Home 08 y SaaS 02 y
// devuelve 404. Es la pagina de la agencia: se resuelve a /agencia, que sirve
// `about.html`.
export default function Page() {
  return redirect("/agencia");
}
