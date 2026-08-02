import { pageContent } from "../content/siteContent";
import { saasShotSrc } from "../content/saasShots";
import { StandardPage } from "./StandardPage";

/** Alias histórico → mismo contenido que hub SaaS / plataforma. */
export function PlatformPage() {
  return (
    <StandardPage
      content={pageContent.plataforma}
      imageSrc={saasShotSrc("dashboard")}
      imageAlt="Dashboard SaaS NELVYON"
      primaryCta={{ label: "Ver SaaS", href: "/producto" }}
      secondaryCta={{ label: "Precios", href: "/precios#saas" }}
    />
  );
}
