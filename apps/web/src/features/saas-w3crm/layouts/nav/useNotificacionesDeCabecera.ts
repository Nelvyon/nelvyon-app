"use client";

/**
 * Notificaciones REALES para la campana de la cabecera.
 *
 * La plantilla W3CRM traia la campana rellena de eventos inventados —«Youtube,
 * a video-sharing website, goes live $500», «Quisque a consequat ante Sit amet
 * magna at volutapt...», «Dr sultads Send you Photo», todo con fecha fija de
 * julio de 2022— y esa cabecera se monta en las 75 pantallas del panel. Un
 * cliente entraba en su cuenta y veia notificaciones de otro producto.
 *
 * Mientras tanto `/api/saas/notifications` existia entero, con contador,
 * marcado de leidas y marcado masivo, y **sin un solo consumidor en la UI**.
 * Esto no anade producto: conecta el que ya estaba construido.
 *
 * Tres estados que se distinguen de verdad, porque confundirlos es como se
 * fabrica un verde falso:
 *
 *   - `cargando`   — todavia no se sabe. No se dibuja «no tienes nada».
 *   - `sin_permiso`— el 403 de `notifications.read`. La campana se OCULTA en
 *                    vez de gritar un error: quien no tiene el permiso no tiene
 *                    por que ver que la funcion existe.
 *   - `error`      — fallo real. Se dice, no se disfraza de bandeja vacia.
 *
 * Una bandeja vacia y una bandeja que no se pudo leer no son lo mismo, y
 * pintarlas igual es exactamente la mentira que el Bloque 4 quito de los
 * healthchecks.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export type NotificacionDeCabecera = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
};

export type EstadoNotificaciones = "cargando" | "listas" | "sin_permiso" | "error";

type Respuesta = { notifications?: unknown };

/** Valida la forma en el borde: un `id` ausente rompe la lista al pulsar. */
function esNotificacion(v: unknown): v is NotificacionDeCabecera {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.title === "string" &&
    typeof o.message === "string" &&
    typeof o.createdAt === "string"
  );
}

export function useNotificacionesDeCabecera() {
  const [estado, setEstado] = useState<EstadoNotificaciones>("cargando");
  const [notificaciones, setNotificaciones] = useState<NotificacionDeCabecera[]>([]);
  const vivo = useRef(true);

  useEffect(() => {
    vivo.current = true;
    return () => {
      vivo.current = false;
    };
  }, []);

  const recargar = useCallback(async () => {
    try {
      const res = await fetch("/api/saas/notifications?unread=true", {
        credentials: "same-origin",
      });
      if (!vivo.current) return;

      if (res.status === 401 || res.status === 403) {
        setEstado("sin_permiso");
        setNotificaciones([]);
        return;
      }
      if (!res.ok) {
        setEstado("error");
        return;
      }

      const body = (await res.json()) as Respuesta;
      if (!vivo.current) return;

      const lista = Array.isArray(body.notifications)
        ? body.notifications.filter(esNotificacion)
        : [];
      setNotificaciones(lista);
      setEstado("listas");
    } catch {
      // Sin red o respuesta ilegible. Se dice; no se pinta bandeja vacia.
      if (vivo.current) setEstado("error");
    }
  }, []);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  const marcarTodasLeidas = useCallback(async () => {
    try {
      const res = await fetch("/api/saas/notifications/read-all", {
        method: "POST",
        credentials: "same-origin",
      });
      if (!res.ok) return;
      if (vivo.current) setNotificaciones([]);
    } catch {
      // Marcar leidas es una comodidad: si falla, la lista se queda como esta.
      // Vaciarla en local igualmente le diria al cliente que se guardo algo que
      // no se guardo.
    }
  }, []);

  return {
    estado,
    notificaciones,
    sinLeer: notificaciones.length,
    recargar,
    marcarTodasLeidas,
  };
}
