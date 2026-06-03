import { Container } from "@/components/pa/container";
import { Header } from "@/components/pa/header";

export function HomeSystemSection() {
  return (
    <section className="w-full py-16 md:py-24">
      <Container className="flex flex-col gap-6">
        <Header>Un sistema para ordenar, automatizar y hacer crecer tu negocio</Header>
        <p className="text-muted-foreground -tracking-xs max-w-3xl text-lg leading-7 font-medium">
          NELVYON combina SaaS, servicios de marketing, automatización e IA para que una empresa
          pueda centralizar captación, ventas, comunicación y operación digital en un solo entorno.
        </p>
      </Container>
    </section>
  );
}
