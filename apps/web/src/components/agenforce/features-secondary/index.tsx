import React from "react";
import { Container } from "@/components/agenforce/container";
import { cn } from "@/lib/utils";
import { SkeletonOne } from "./skeletons/first";
import { SkeletonTwo } from "./skeletons/second";
import { HumanIcon, IntegrationIcon, WorkflowIcon } from "@/icons";

export const FeaturesSecondary = () => {
  return (
    <section id="producto" className="pt-10 md:pt-20 lg:py-32 relative overflow-hidden bg-white">
      <Container>
        <div className="text-center max-w-2xl mx-auto mb-12 md:mb-16 px-4">
          <p className="mkt-eyebrow">Producto</p>
          <h2 className="mkt-h2 mkt-h2--display fade-in">Software en acción</h2>
          <p className="mkt-lead mt-3">
            CRM, campañas, automatización y reporting dentro de un mismo entorno operativo.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 border-y border-neutral-200 divide-y md:divide-y-0 md:divide-x divide-neutral-200">
          <div>
            <CardContent>
              <h2 className="text-lg font-bold text-neutral-800">CRM y pipeline</h2>
              <CardDescription>
                Visualiza oportunidades, fases comerciales y seguimiento sin hojas dispersas ni herramientas sueltas.
              </CardDescription>
            </CardContent>
            <CardSkeleton>
              <SkeletonOne />
            </CardSkeleton>
          </div>
          <div>
            <CardContent>
              <h2 className="text-lg font-bold text-neutral-800">Campañas centralizadas</h2>
              <CardDescription>
                Coordina marketing digital, comunicación y reporting desde un panel unificado.
              </CardDescription>
            </CardContent>
            <CardSkeleton className="mask-radial-from-50% mask-t-from-50%">
              <SkeletonTwo />
            </CardSkeleton>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mt-10 md:mt-20">
          <div>
            <div className="flex items-center gap-2">
              <WorkflowIcon />
              <h3 className="font-bold text-lg text-neutral-600">Automatización</h3>
            </div>
            <p className="text-neutral-500 text-base mt-2">
              Conecta formularios, CRM, email y WhatsApp con flujos operativos claros.
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <IntegrationIcon />
              <h3 className="font-bold text-lg text-neutral-600">Integraciones</h3>
            </div>
            <p className="text-neutral-500 text-base mt-2">
              Meta, Google, WhatsApp, Stripe y herramientas que ya usas, conectadas a tu operación.
            </p>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <HumanIcon />
              <h3 className="font-bold text-lg text-neutral-600">Reporting</h3>
            </div>
            <p className="text-neutral-500 text-base mt-2">
              Paneles operativos para revisar campañas, pipeline y actividad comercial con continuidad.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
};

export const CardContent = ({ children }: { children: React.ReactNode }) => {
  return <div className="p-4 md:p-8">{children}</div>;
};

export const CardDescription = ({ children }: { children: React.ReactNode }) => {
  return <p className="text-neutral-600 mt-2 max-w-md text-balance">{children}</p>;
};

export const CardSkeleton = ({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) => {
  return (
    <div
      className={cn(
        "relative h-80 sm:h-60 flex flex-col md:h-80 overflow-hidden perspective-distant",
        className,
      )}
    >
      {children}
    </div>
  );
};
