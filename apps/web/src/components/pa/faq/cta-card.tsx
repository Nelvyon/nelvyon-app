import Link from "next/link";

export const CTACard = () => {
  return (
    <div className="bg-natural-white flex flex-col gap-8 rounded-3xl px-6 py-8 shadow-card-md w-full lg:max-w-lg">
      <div className="flex flex-col gap-3">
        <span className="font-medium text-2xl leading-8 -tracking-sm">
          ¿Necesitas definir el siguiente paso?
        </span>
        <span className="font-medium text-muted-foreground text-base -tracking-xs leading-6">
          Cuéntanos tu contexto y te proponemos alcance, plan y forma de trabajo
          sin compromiso inicial.
        </span>
      </div>
      <p className="text-muted-foreground text-sm leading-6">
        Escríbenos desde la sección de{" "}
        <Link href="/contacto" className="text-[#0084FF] font-medium hover:underline">
          contacto
        </Link>{" "}
        o usa el formulario al final de la página.
      </p>
    </div>
  );
};

