"use client";

import { RoundedGridPattern } from "@/components/pa/bento-one/cards/rounded-grid-pattern";
import React from "react";

export const Metrics = () => {
  return (
    <div className="flex h-full flex-col justify-between gap-16 p-8">
      <div className="absolute inset-0">
        <RoundedGridPattern />
      </div>
      <div className="z-10 flex flex-col gap-3">
        <span className="-tracking-xl flex text-4xl leading-12 font-medium">Operacion centralizada</span>
        <span className="text-muted-foreground -tracking-xs text-lg leading-6.5 font-medium">
          Marketing, ventas y automatizacion en una sola capa operativa
        </span>
      </div>
      <div className="z-10">
        <span className="-tracking-xs text-muted-foreground text-base leading-6">
          Ejecutamos con roadmap claro, responsables definidos y revisiones
          periodicas orientadas a resultados.
        </span>
      </div>
    </div>
  );
};

