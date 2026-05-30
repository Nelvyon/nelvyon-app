import { CasosDeUso } from "../casos-de-uso";
import { ComoFunciona } from "../como-funciona";
import { CtaFinal } from "../cta-final";
import { Hero } from "../hero";
import { HomeSoluciones } from "../home-soluciones";
import { HomeTodoNecesitas } from "../home-todo-necesitas";
import { IntegrationsHub } from "../integrations-hub";
import { PlataformaOs } from "../plataforma-os";

export function AgenforceHomePage() {
  return (
    <main className="nelvyon-home">
      <Hero />
      <IntegrationsHub />
      <HomeTodoNecesitas />
      <PlataformaOs />
      <HomeSoluciones />
      <ComoFunciona />
      <CasosDeUso />
      <CtaFinal
        title="Construye una operación digital con más control"
        subtitle="Centraliza marketing, ventas, CRM, comunicación y reporting con NELVYON."
        primaryLabel="Solicitar información"
      />
    </main>
  );
}
