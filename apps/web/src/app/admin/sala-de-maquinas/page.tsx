"use client";

/**
 * LA SALA DE MÁQUINAS.
 *
 * La pantalla que faltaba. En producción hubo doce trabajos encolados desde
 * junio que nadie ejecutó y nadie vio hasta agosto: los doce estaban en la
 * tabla con su fecha, pero no había ni una pantalla que preguntara qué llevaba
 * parado más de la cuenta.
 *
 * Hay noventa y una pantallas internas. Ésta no añade otra lista de clientes ni
 * otro contador de entregables: enseña UNA cosa, ordenada por lo que lleva más
 * tiempo sin moverse, y para cada línea dice qué hacer. Un panel que informa sin
 * decir qué hacer se lee dos veces y luego se ignora.
 *
 * TRES DECISIONES QUE NO SON ESTÉTICAS:
 *
 *   1. LO QUE NO SE PUDO MEDIR SE DICE, arriba y en rojo. Un panel vacío es
 *      ambiguo: puede significar «todo bien» o «la consulta reventó». La
 *      diferencia es exactamente el fallo que esta pantalla existe para no
 *      repetir.
 *   2. LO QUE SÍ AVANZA TAMBIÉN SE ENSEÑA. Sin ese contraste, tres atascos
 *      parecen un sistema roto y el operador aprende a no creerse el panel.
 *   3. NO HAY BOTONES DE ARREGLAR. Esta pantalla mira. Un panel que además
 *      actúa es un panel que un día actúa por su cuenta.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { NelvyonDsBadge, NelvyonDsButton, NelvyonDsCard, NelvyonDsSectionHeader } from "@/design-system/components";
import { AdminSidebar } from "../_components/AdminSidebar";

type Atasco = {
  tipo: "trabajo" | "aprobacion" | "entregable";
  id: string;
  tenantId: string | null;
  workspaceId: number | null;
  clientId: string | null;
  estado: string;
  paradoDesde: string;
  horasParado: number;
  queHacer: string;
};

type Pulso = {
  medidoEn: string;
  atascos: Atasco[];
  porTipo: Record<string, number>;
  enMovimiento: {
    trabajosCompletadosUltimas24h: number | null;
    entregablesPublicadosUltimas24h: number | null;
  };
  noMedido: Array<{ que: string; porQue: string }>;
};

/** «6 semanas» se entiende; «1.008,4 h» hay que traducirlo mentalmente. */
function cuantoLlevaParado(horas: number): string {
  if (horas < 48) return `${Math.round(horas)} h`;
  const dias = horas / 24;
  if (dias < 21) return `${Math.round(dias)} días`;
  return `${Math.round(dias / 7)} semanas`;
}

/**
 * El color dice cuánto duele, y sólo tiene tres valores a propósito.
 *
 * Una escala de siete tonos obliga a mirar la leyenda; con tres, se lee de un
 * vistazo desde el otro lado de la mesa.
 */
function gravedad(horas: number): { tono: "warning" | "danger"; etiqueta: string } {
  if (horas >= 24 * 7) return { tono: "danger", etiqueta: "olvidado" };
  return { tono: "warning", etiqueta: "atascado" };
}

const TITULO_DE_TIPO: Record<string, string> = {
  trabajo: "Trabajos",
  aprobacion: "Esperando a una persona",
  entregable: "Entregables",
};

export default function SalaDeMaquinasPage() {
  const router = useRouter();
  const [cargando, setCargando] = useState(true);
  const [pulso, setPulso] = useState<Pulso | null>(null);
  const [fallo, setFallo] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setCargando(true);
    setFallo(null);
    const res = await fetch("/api/admin/sala-de-maquinas", { credentials: "same-origin" });

    if (res.status === 401) {
      router.replace(`/auth/login?next=${encodeURIComponent("/admin/sala-de-maquinas")}`);
      return;
    }
    if (!res.ok) {
      // NO se deja el panel anterior en pantalla haciendo como que sigue
      // valiendo: un panel congelado es peor que uno que dice que ha fallado.
      setPulso(null);
      setFallo(
        res.status === 403
          ? "Esta pantalla es sólo para administradores de NELVYON."
          : "No se ha podido medir el pulso del sistema.",
      );
      setCargando(false);
      return;
    }
    setPulso((await res.json()) as Pulso);
    setCargando(false);
  }, [router]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[260px_minmax(0,1fr)]">
        <AdminSidebar />

        <main className="space-y-5">
          {/*
            `subtitle`, no `description`; y el botón fuera, porque este
            encabezado no acepta acciones. Se usa la firma que el componente
            tiene, no la que uno esperaría: inventarse props es cómo un cambio
            de diseño compila y luego no pinta nada.
          */}
          <div className="flex flex-wrap items-end justify-between gap-3">
            <NelvyonDsSectionHeader
              title="Sala de máquinas"
              subtitle="Qué lleva parado más tiempo del que debería, en todos los clientes."
              className="flex-1 border-b-0 pb-0"
            />
            <NelvyonDsButton variant="secondary" onClick={() => void cargar()} disabled={cargando}>
              {cargando ? "Midiendo…" : "Volver a medir"}
            </NelvyonDsButton>
          </div>

          {fallo ? (
            <NelvyonDsCard>
              <p className="text-sm font-medium text-destructive">{fallo}</p>
            </NelvyonDsCard>
          ) : null}

          {/*
            LO QUE NO SE PUDO MEDIR, arriba del todo.
            Un panel vacío es ambiguo: puede ser «todo bien» o «la consulta
            reventó». Esa ambigüedad es el fallo original.
          */}
          {pulso && pulso.noMedido.length > 0 ? (
            <NelvyonDsCard>
              <h2 className="text-sm font-semibold text-destructive">
                Hay {pulso.noMedido.length} cosa(s) que NO se han podido mirar
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Lo de abajo está incompleto. No es que no haya nada: es que no se ha podido ver.
              </p>
              <ul className="mt-2 space-y-1 text-xs">
                {pulso.noMedido.map((n) => (
                  <li key={n.que}>
                    <span className="font-medium">{n.que}</span>
                    <span className="text-muted-foreground"> — {n.porQue}</span>
                  </li>
                ))}
              </ul>
            </NelvyonDsCard>
          ) : null}

          {pulso ? (
            <div className="grid gap-4 sm:grid-cols-3">
              <NelvyonDsCard>
                <p className="text-xs uppercase text-muted-foreground">Parado ahora mismo</p>
                <p className="mt-1 text-3xl font-semibold">{pulso.atascos.length}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {Object.entries(pulso.porTipo)
                    .map(([t, n]) => `${n} ${TITULO_DE_TIPO[t] ?? t}`)
                    .join(" · ") || "nada"}
                </p>
              </NelvyonDsCard>

              {/* El contraste. Sin esto, tres atascos parecen un sistema roto. */}
              <NelvyonDsCard>
                <p className="text-xs uppercase text-muted-foreground">Trabajos hechos (24 h)</p>
                <p className="mt-1 text-3xl font-semibold">
                  {pulso.enMovimiento.trabajosCompletadosUltimas24h ?? "no se sabe"}
                </p>
              </NelvyonDsCard>
              <NelvyonDsCard>
                <p className="text-xs uppercase text-muted-foreground">Entregables entregados (24 h)</p>
                <p className="mt-1 text-3xl font-semibold">
                  {pulso.enMovimiento.entregablesPublicadosUltimas24h ?? "no se sabe"}
                </p>
              </NelvyonDsCard>
            </div>
          ) : null}

          {pulso && pulso.atascos.length === 0 && pulso.noMedido.length === 0 ? (
            <NelvyonDsCard>
              <p className="text-sm">
                No hay nada parado. Se ha mirado todo y no hay nada que llevara
                más tiempo del debido.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Medido a las {new Date(pulso.medidoEn).toLocaleTimeString("es-ES")}.
              </p>
            </NelvyonDsCard>
          ) : null}

          {pulso && pulso.atascos.length > 0 ? (
            <NelvyonDsCard>
              <h2 className="text-sm font-semibold">Lo que lleva más tiempo parado, primero</h2>
              <ul className="mt-3 divide-y divide-border">
                {pulso.atascos.map((a) => {
                  const g = gravedad(a.horasParado);
                  return (
                    <li key={`${a.tipo}-${a.id}`} className="py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <NelvyonDsBadge tone={g.tono}>{g.etiqueta}</NelvyonDsBadge>
                        <span className="font-medium">{cuantoLlevaParado(a.horasParado)}</span>
                        <span className="text-sm text-muted-foreground">{a.estado}</span>
                      </div>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">
                        {TITULO_DE_TIPO[a.tipo] ?? a.tipo} · {a.id}
                        {a.tenantId ? ` · inquilino ${a.tenantId}` : ""}
                        {a.workspaceId !== null ? ` · workspace ${a.workspaceId}` : ""}
                      </p>
                      {/* Qué hacer. Un panel que informa sin decir qué hacer se ignora. */}
                      <p className="mt-1 text-sm">{a.queHacer}</p>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-xs text-muted-foreground">
                Medido a las {new Date(pulso.medidoEn).toLocaleTimeString("es-ES")}.
              </p>
            </NelvyonDsCard>
          ) : null}
        </main>
      </div>
    </div>
  );
}
