import { redirect } from "next/navigation";

// `home-ai-writer-tool.html` se elimino al consolidar en Home 08 y SaaS 02 y
// devuelve 404. Es una pagina de servicio de contenidos: se resuelve a
// /servicios, que sirve `features.html`.
export default function Page() {
  return redirect("/servicios");
}
