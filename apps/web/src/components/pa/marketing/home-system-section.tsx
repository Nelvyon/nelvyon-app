import { Container } from "@/components/pa/container";
import { Header } from "@/components/pa/header";

export function HomeSystemSection() {
  return (
    <section className="w-full border-b border-white/8 pb-16 pt-8 md:pb-20 md:pt-12">
      <Container className="flex flex-col gap-6">
        <Header>Un sistema para ordenar, automatizar y hacer crecer tu negocio</Header>
        <p className="-tracking-xs max-w-3xl text-lg leading-7 font-medium text-white/75">
          NELVYON conecta estrategia, tecnología y ejecución para que marketing, ventas y operación
          trabajen dentro de una misma estructura.
        </p>
      </Container>
    </section>
  );
}
