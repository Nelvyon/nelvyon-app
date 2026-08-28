/**
 * Arquitectura de proveedores de modelo.
 *
 * El adaptador tenía cableados Ollama y OpenAI con dos bloques `if` casi
 * idénticos. Conectar un tercer proveedor obligaba a tocar `invokeLlm`, que es
 * justo la función que no conviene tocar. Aquí un proveedor es un objeto con
 * cuatro respuestas —¿estoy configurado?, ¿me dejan?, genera, cuánto cuesta— y
 * el adaptador recorre la lista en orden.
 *
 * NINGÚN proveedor de pago queda conectado por esto. `openai` sigue exigiendo
 * `AUTONOMOUS_ALLOW_OPENAI=1`, clave, e interruptor maestro encendido, igual
 * que antes; sin las tres cosas `estaPermitido()` devuelve `false` y nunca sale
 * una petición. Registrar un proveedor nuevo no lo habilita: hay que
 * configurarlo y permitirlo explícitamente.
 */

import type { LlmErrorKind, LlmProviderId } from "../llmProvenance";
import { estimarCosteUsd } from "./pricing";

export interface SolicitudDeGeneracion {
  system: string;
  user: string;
  /** Modelo concreto pedido por el enrutado de calidad. Opcional. */
  modelo?: string;
  /** Milisegundos disponibles, ya recortados contra el presupuesto del SKU. */
  timeoutMs?: number;
  /** Etiqueta para el registro. Nunca contiene datos del cliente. */
  etiqueta: string;
}

export interface ResultadoDeGeneracion {
  content: string;
  tokensEntrada: number;
  tokensSalida: number;
  model: string;
}

export interface ProveedorLlm {
  readonly id: LlmProviderId;
  /** Hay datos suficientes para intentarlo (host, clave...). */
  estaConfigurado(): boolean;
  /** Además de configurado, la política permite usarlo ahora. */
  estaPermitido(): { permitido: boolean; motivo?: string };
  generar(req: SolicitudDeGeneracion): Promise<ResultadoDeGeneracion>;
  /** Coste estimado sin consumir nada. `null` si no hay tarifa conocida. */
  estimarCoste(modelo: string, entrada: number, salida: number): number | null;
}

const registro = new Map<LlmProviderId, ProveedorLlm>();

/** Orden de preferencia. Local primero: es el que no cuesta dinero. */
const ORDEN: readonly LlmProviderId[] = ["ollama", "openai"] as const;

export function registrarProveedor(p: ProveedorLlm): void {
  registro.set(p.id, p);
}

export function obtenerProveedor(id: LlmProviderId): ProveedorLlm | null {
  return registro.get(id) ?? null;
}

/**
 * Proveedores configurados Y permitidos, en orden de preferencia. Si devuelve
 * vacío es que no hay ningún modelo real disponible, y quien llama decide si
 * eso es una degradación permitida o un error.
 */
export function proveedoresDisponibles(): ProveedorLlm[] {
  const fuera: ProveedorLlm[] = [];
  for (const id of ORDEN) {
    const p = registro.get(id);
    if (!p) continue;
    if (!p.estaConfigurado()) continue;
    if (!p.estaPermitido().permitido) continue;
    fuera.push(p);
  }
  // Proveedores registrados desde fuera del orden conocido van detrás.
  for (const [id, p] of registro) {
    if (ORDEN.includes(id)) continue;
    if (p.estaConfigurado() && p.estaPermitido().permitido) fuera.push(p);
  }
  return fuera;
}

export function limpiarRegistroParaPruebas(): void {
  registro.clear();
}

/** Base cómoda: estima el coste con la tabla estática salvo que se sobrescriba. */
export function costePorTabla(
  proveedor: LlmProviderId,
): (modelo: string, entrada: number, salida: number) => number | null {
  return (modelo, entrada, salida) => estimarCosteUsd(proveedor, modelo, entrada, salida);
}

export type { LlmErrorKind, LlmProviderId };
