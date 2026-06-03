import Link from "next/link";

export const CTACard = () => {
  return (
    <div className="flex w-full flex-col gap-8 rounded-3xl border border-white/10 bg-[#07111F] px-6 py-8 shadow-card-md lg:max-w-lg">
      <div className="flex flex-col gap-3">
        <span className="-tracking-sm text-2xl font-medium leading-8 text-white">
          ¿Necesitas definir el siguiente paso?
        </span>
        <span className="-tracking-xs text-base font-medium leading-6 text-white/75">
          Cuéntanos tu contexto y te proponemos alcance, plan y forma de trabajo
          sin compromiso inicial.
        </span>
      </div>
      <p className="text-sm leading-6 text-white/55">
        Escríbenos desde la sección de{" "}
        <Link href="/contacto" className="font-medium text-[#0084FF] hover:underline">
          contacto
        </Link>{" "}
        o usa el formulario al final de la página.
      </p>
    </div>
  );
};
