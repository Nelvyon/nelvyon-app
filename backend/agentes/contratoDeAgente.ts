/**
 * EL CONTRATO DE UN AGENTE.
 *
 * «Agente» no puede seguir significando «un prompt con nombre». En el árbol hay
 * 1.994 ficheros bajo `sectors/` y ninguno lee el contexto del cliente: reciben
 * un `brief` armado a mano en la ruta. Eso no es un agente, es una plantilla
 * con parámetros.
 *
 * Un contrato declara lo que hace falta para que alguien —persona o máquina—
 * pueda responder tres preguntas sin abrir el código:
 *
 *   ¿Qué hace este agente y de qué responde?
 *   ¿Qué necesita saber, y qué pasa si no lo sabe?
 *   ¿Hasta dónde puede llegar solo?
 *
 * LO QUE HACE ÚTIL AL CONTRATO, y no decorativo:
 *
 *   - `necesita` se comprueba contra el CEREBRO antes de ejecutar. Un agente al
 *     que le falta contexto imprescindible no se ejecuta con lo que haya: se
 *     para y dice qué le falta. Trabajar sin saber el ICP produce trabajo
 *     plausible y equivocado, que es peor que no producir nada.
 *
 *   - `autonomia` se comprueba contra las consecuencias reales de la acción, en
 *     el momento de actuar. Declarar un nivel no basta.
 *
 *   - `nuncaHace` son prohibiciones absolutas, no consejos. Se comprueban.
 */

import type { CerebroDeNegocioService } from "../cerebro/CerebroDeNegocioService";
import { esDimensionConocida } from "../cerebro/dimensiones";
import { esDepartamentoConocido } from "./departamentos";
import {
  type Consecuencia,
  type NivelDeAutonomia,
  puedeActuar,
  exigeAprobacionHumana,
} from "./autonomia";

/** Qué contexto necesita un agente, y con cuánta certeza. */
export interface ContextoNecesario {
  dimension: string;
  /**
   * `true` = sin esto NO se ejecuta. Es una lista corta a propósito: si todo
   * es imprescindible, ningún agente llega a arrancar nunca.
   */
  imprescindible: boolean;
  /**
   * Confianza mínima. Un agente que va a gastar dinero puede exigir más certeza
   * que uno que redacta un borrador.
   */
  confianzaMinima?: number;
}

export interface ContratoDeAgente {
  id: string;
  /** El papel, en una frase. «Redacta titulares de landing», no «marketing». */
  rol: string;
  /** Qué persigue. Un resultado, no una actividad. */
  objetivo: string;
  /** De qué responde ante el resto de la agencia. */
  responsabilidad: string;
  departamento: string;

  necesita: readonly ContextoNecesario[];
  /** Qué produce. La clave del artefacto en el resultado del pack. */
  produce: string;

  /** Herramientas que puede usar. Vacío = sólo razona sobre lo que se le da. */
  herramientas: readonly string[];
  /** Consecuencias que sus acciones pueden tener. Define su suelo de autonomía. */
  consecuencias: readonly Consecuencia[];
  autonomia: NivelDeAutonomia;

  /** Prohibiciones absolutas. Se comprueban, no se sugieren. */
  nuncaHace: readonly string[];
  /** Cuándo deja de intentarlo y lo pasa a una persona. */
  escalaSi: readonly string[];

  /** Cómo se sabe si su salida es buena. */
  rubrica: readonly string[];
  /** Con qué se mide su trabajo a lo largo del tiempo. */
  kpis: readonly string[];

  /** Tope de tiempo de UNA ejecución. */
  timeoutMs: number;
  /** Reintentos adicionales. 0 = un solo intento. */
  reintentos: number;
  /** `true` si su trabajo exige modelo real y no admite degradación a reglas. */
  exigeIaReal: boolean;
}

export class ErrorDeContrato extends Error {
  constructor(
    readonly codigo:
      | "DEPARTAMENTO_DESCONOCIDO"
      | "DIMENSION_DESCONOCIDA"
      | "AUTONOMIA_INSUFICIENTE"
      | "CONTEXTO_INSUFICIENTE"
      | "CONTRATO_INCOMPLETO",
    mensaje: string,
  ) {
    super(mensaje);
    this.name = "ErrorDeContrato";
  }
}

/**
 * Un contrato mal formado se rechaza al registrarlo, no al ejecutarlo.
 *
 * Descubrir a mitad de un pack que un agente apunta a un departamento que no
 * existe es descubrirlo con el cliente esperando.
 */
export function validarContrato(c: ContratoDeAgente): void {
  const falta = (campo: string): never => {
    throw new ErrorDeContrato("CONTRATO_INCOMPLETO", `${c.id}: falta ${campo}`);
  };

  if (!c.id?.trim()) falta("id");
  if (!c.rol?.trim() || c.rol.trim().length < 10) falta("un rol que se entienda");
  if (!c.objetivo?.trim() || c.objetivo.trim().length < 10) falta("un objetivo");
  if (!c.responsabilidad?.trim()) falta("responsabilidad");
  if (!c.produce?.trim()) falta("qué produce");
  if (c.rubrica.length === 0) falta("una rúbrica: sin ella nadie sabe si su salida es buena");
  if (c.kpis.length === 0) falta("KPIs");
  if (c.timeoutMs <= 0) falta("un timeout mayor que cero");

  if (!esDepartamentoConocido(c.departamento)) {
    throw new ErrorDeContrato(
      "DEPARTAMENTO_DESCONOCIDO",
      `${c.id}: el departamento "${c.departamento}" no existe`,
    );
  }

  for (const n of c.necesita) {
    if (!esDimensionConocida(n.dimension)) {
      throw new ErrorDeContrato(
        "DIMENSION_DESCONOCIDA",
        `${c.id}: necesita "${n.dimension}", que no es una dimensión del cerebro`,
      );
    }
    if (n.confianzaMinima !== undefined && (n.confianzaMinima < 0 || n.confianzaMinima > 1)) {
      falta(`una confianza mínima entre 0 y 1 para "${n.dimension}"`);
    }
  }

  // El nivel declarado tiene que soportar sus propias consecuencias. Un agente
  // que declara L2 y puede gastar dinero es un agente que gastará dinero sin que
  // nadie lo haya autorizado.
  const v = puedeActuar(c.autonomia, c.consecuencias);
  if (!v.permitido) {
    throw new ErrorDeContrato("AUTONOMIA_INSUFICIENTE", `${c.id}: ${v.motivo}`);
  }
}

// ── Registro ────────────────────────────────────────────────────────────────

const REGISTRO = new Map<string, ContratoDeAgente>();

export function registrarAgente(c: ContratoDeAgente): void {
  validarContrato(c);
  REGISTRO.set(c.id, c);
}

export function contrato(id: string): ContratoDeAgente | null {
  return REGISTRO.get(id) ?? null;
}

export function agentesRegistrados(): ContratoDeAgente[] {
  return [...REGISTRO.values()];
}

export function agentesDe(departamento: string): ContratoDeAgente[] {
  return agentesRegistrados().filter((a) => a.departamento === departamento);
}

export function limpiarRegistroParaPruebas(): void {
  REGISTRO.clear();
}

// ── Preparar una ejecución ──────────────────────────────────────────────────

export type Preparacion =
  | {
      listo: true;
      contexto: Record<string, unknown>;
      procedencias: Record<string, { procedencia: string; confianza: number }>;
      /** Contexto opcional que falta. No impide ejecutar; se registra. */
      faltaOpcional: string[];
    }
  | { listo: false; motivo: string; faltaImprescindible: string[] };

/**
 * Lee del cerebro lo que el agente declaró necesitar y decide si puede ejecutar.
 *
 * Ésta es la función que convierte el contrato en algo que sirve. Sin ella, un
 * contrato es documentación: se escribe, se lee y no cambia nada.
 */
export async function prepararEjecucion(
  c: ContratoDeAgente,
  cerebro: CerebroDeNegocioService,
  workspaceId: number,
  clientId: string,
): Promise<Preparacion> {
  const contexto: Record<string, unknown> = {};
  const procedencias: Record<string, { procedencia: string; confianza: number }> = {};
  const faltaImprescindible: string[] = [];
  const faltaOpcional: string[] = [];

  const leido = await cerebro.paraAgente(workspaceId, clientId);

  for (const n of c.necesita) {
    const valor = leido.contexto[n.dimension];
    const proc = leido.procedencias[n.dimension];
    const suficiente =
      valor !== undefined &&
      proc !== undefined &&
      proc.confianza >= (n.confianzaMinima ?? 0);

    if (suficiente) {
      contexto[n.dimension] = valor;
      procedencias[n.dimension] = proc;
      continue;
    }
    if (n.imprescindible) faltaImprescindible.push(n.dimension);
    else faltaOpcional.push(n.dimension);
  }

  if (faltaImprescindible.length > 0) {
    return {
      listo: false,
      faltaImprescindible,
      motivo:
        `${c.id} no puede ejecutar: le falta ${faltaImprescindible.join(", ")}. ` +
        `Trabajar sin eso produciría algo plausible y equivocado.`,
    };
  }

  return { listo: true, contexto, procedencias, faltaOpcional };
}

/**
 * ¿Puede este agente hacer ESTA acción concreta?
 *
 * Se comprueba en el momento de actuar y no sólo al registrar el contrato,
 * porque las consecuencias reales dependen de los argumentos: el mismo agente
 * que redacta un correo puede estar a punto de enviarlo.
 */
export function puedeHacer(
  c: ContratoDeAgente,
  consecuenciasDeLaAccion: readonly Consecuencia[],
): { permitido: boolean; exigeAprobacion: boolean; motivo?: string } {
  const v = puedeActuar(c.autonomia, consecuenciasDeLaAccion);
  return {
    permitido: v.permitido,
    exigeAprobacion: exigeAprobacionHumana(consecuenciasDeLaAccion),
    motivo: v.permitido ? undefined : v.motivo,
  };
}
