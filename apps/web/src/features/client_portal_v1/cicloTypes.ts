/**
 * Los tipos del ciclo del cliente, en el lado del navegador.
 *
 * Son un espejo de `backend/portal/CicloDelClienteService.ts`. Están duplicados
 * a propósito: el portal se compila para el navegador y no puede importar del
 * backend, y una copia declarada es más honesta que un `any` que finge saber lo
 * que llega.
 *
 * LO QUE CAMBIA respecto del backend: las fechas viajan por JSON, así que aquí
 * son cadenas. Tiparlas como `Date` sería mentir sobre lo que hay en memoria,
 * y `new Date(x)` sobre una cadena que ya se creía `Date` es el fallo silencioso
 * que sigue.
 */

export interface HuecoDelCliente {
  dimension: string;
  /** La pregunta tal cual se le hace al cliente. Se enseña literal. */
  pregunta: string;
  imprescindible: boolean;
  /** `ausente` = nunca se supo. `caducada` = se supo y ya no vale. */
  motivo: "ausente" | "caducada";
}

export interface ConexionPendiente {
  proveedor: string;
  estado: string;
  /** Para qué hace falta. Sin esto, pedir un acceso parece un capricho. */
  paraQue: string;
  servicios: string[];
  conectadaEn: string | null;
}

export interface SolicitudDeServicio {
  id: string;
  serviceId: string;
  estado: string;
  motivo: string | null;
  precioCents: number | null;
  moneda: string | null;
  creada: string;
}

export interface ResumenDelCiclo {
  serviciosActivos: string[];
  solicitudes: SolicitudDeServicio[];
  loQueFalta: {
    datos: HuecoDelCliente[];
    conexiones: ConexionPendiente[];
  };
  listoParaOperar: boolean;
}
