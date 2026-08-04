import { redirect } from "next/navigation";

// `AIOR_NELVYON_ROUTES` ya redirige /producto -> /www/saas.html antes de llegar
// aqui, pero el destino que habia escrito (`home-saas-product-showcase.html`)
// se elimino al consolidar en Home 08 y SaaS 02 y devuelve 404. Se apunta al
// mismo destino vigente para que el comportamiento no dependa de esa redireccion.
export default function Page() {
  return redirect("/www/saas.html");
}
