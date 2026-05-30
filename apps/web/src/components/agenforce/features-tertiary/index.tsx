import React from "react";
import { Container } from "@/components/agenforce/container";
import { cn } from "@/lib/utils";
import { SkeletonOne } from "./skeletons/first";
import { SkeletonTwo } from "./skeletons/second";
import { SkeletonThree } from "./skeletons/third";
import { SkeletonFour } from "./skeletons/four";

export const FeaturesTertiary = () => {
  return (
    <section className="pt-10 md:pt-20 lg:py-32 relative overflow-hidden bg-[#f8faff] border-t border-[#e5edf8]">
      <Container>
        <div className="text-center max-w-2xl mx-auto mb-12 md:mb-16 px-4">
          <p className="mkt-eyebrow">Operación</p>
          <h2 className="mkt-h2 mkt-h2--display fade-in">Control y continuidad</h2>
          <p className="mkt-lead mt-3">
            Visibilidad, permisos y seguimiento para equipos que necesitan operar con criterio.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 border-y border-neutral-200 divide-neutral-200">
          <div className="md:border-r border-b border-neutral-200">
            <CardContent>
              <h2 className="text-lg font-bold text-neutral-800">Historial operativo</h2>
              <CardDescription>
                Registro de acciones, cambios y actividad comercial para revisión periódica del equipo.
              </CardDescription>
            </CardContent>
            <CardSkeleton>
              <SkeletonOne />
            </CardSkeleton>
          </div>
          <div className="border-b border-neutral-200">
            <CardContent>
              <h2 className="text-lg font-bold text-neutral-800">Accesos por rol</h2>
              <CardDescription>
                Define quién gestiona campañas, CRM, reporting y configuración dentro de la plataforma.
              </CardDescription>
            </CardContent>
            <CardSkeleton className="mask-radial-from-20% ">
              <SkeletonTwo />
            </CardSkeleton>
          </div>
          <div className="md:border-r border-neutral-200">
            <CardContent>
              <h2 className="text-lg font-bold text-neutral-800">Cola de revisión</h2>
              <CardDescription>
                Envía borradores de campañas y comunicaciones a revisión humana antes de publicar.
              </CardDescription>
            </CardContent>
            <CardSkeleton className="mask-radial-from-20% mask-r-from-50%">
              <SkeletonThree />
            </CardSkeleton>
          </div>
          <div>
            <CardContent>
              <h2 className="text-lg font-bold text-neutral-800">Reglas de marca</h2>
              <CardDescription>
                Aplica criterios de tono, mensajes y políticas antes de activar flujos o contenidos.
              </CardDescription>
            </CardContent>
            <CardSkeleton>
              <SkeletonFour />
            </CardSkeleton>
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
