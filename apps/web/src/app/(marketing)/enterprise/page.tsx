import { redirect } from "next/navigation";

// `home-business-intelligence.html` se elimino al consolidar en Home 08 y
// SaaS 02 y devuelve 404. El plan enterprise vive en la pagina de precios: se
// resuelve a /precios, que sirve `pricing.html`.
export default function Page() {
  return redirect("/precios");
}
