import { CrmService } from "./CrmService";

const MAX_SUMMARY_LEN = 50_000;

function outputSummary(output: { result?: unknown }): string {
  const r = output?.result;
  if (typeof r === "string") return r.slice(0, MAX_SUMMARY_LEN);
  try {
    return JSON.stringify(r ?? "").slice(0, MAX_SUMMARY_LEN);
  } catch {
    return "";
  }
}

/**
 * Lo que pasó cuando el registro en CRM no se pudo hacer.
 *
 * No lleva el resumen del agente: puede tener miles de caracteres y contenido
 * del cliente. Para saber qué falló basta con quién, dónde y por qué.
 */
export interface FalloDeRegistroCrm {
  contactId: string;
  userId: string;
  agentId?: string;
  motivo: string;
}

export type SumideroDeFallos = (fallo: FalloDeRegistroCrm) => void;

/**
 * Por defecto se avisa por consola. Es poco, pero es infinitamente más que
 * nada, que es lo que había.
 */
const POR_DEFECTO: SumideroDeFallos = (f) => {
  // eslint-disable-next-line no-console
  console.warn(
    `[crm] no se pudo registrar la salida del agente: contacto=${f.contactId} agente=${f.agentId ?? "?"} motivo=${f.motivo}`,
  );
};

let sumidero: SumideroDeFallos = POR_DEFECTO;

/**
 * Cambia dónde van los fallos. Devuelve la función que lo deja como estaba.
 *
 * Existe para que una prueba pueda comprobar QUE SE AVISA, que es lo único que
 * distingue este arreglo de volver a callarse. Sin un punto observable, la
 * única forma de comprobarlo sería mirar la consola, y eso no es una prueba.
 */
export function observarFallosDeCrm(nuevo: SumideroDeFallos): () => void {
  const anterior = sumidero;
  sumidero = nuevo;
  return () => {
    sumidero = anterior;
  };
}

/**
 * Tras generar salida en `run()`: registra actividad de CRM si el encargo trae
 * `contactId`.
 *
 * NO PROPAGA NUNCA. Lo llaman 189 sitios y el CRM es opcional en todos: que un
 * apunte no se pueda escribir no puede tumbar el trabajo que el cliente pidió.
 * Eso no cambia.
 *
 * LO QUE SÍ CAMBIA, Y POR QUÉ. Antes el `catch` estaba vacío —«CRM opcional»— y
 * metía en el mismo saco dos cosas que no se parecen en nada:
 *
 *   · el CRM no está disponible, que es tolerable y esperado;
 *   · `assertContactOwner` ha dicho que NO, es decir, se ha intentado escribir
 *     sobre un contacto que no es de quien lo pide.
 *
 * Lo segundo está bien impedido —la escritura no ocurre, y la comprobación de
 * propiedad vive en `CrmService`, no aquí— pero se descartaba sin dejar rastro
 * en ninguna parte. Un intento de escribir en un contacto ajeno es justo el
 * suceso que uno quiere poder reconstruir después, y desde 189 sitios de
 * llamada el silencio se multiplica por 189.
 *
 * NO SE INTENTA CLASIFICAR EL MOTIVO. `assertContactOwner` lanza un error
 * deliberadamente genérico —«Contacto no encontrado»— para no revelar si el
 * contacto existe. Deducir la causa del texto sería inventar una certeza que no
 * hay. Se registra lo ocurrido y lo interpreta quien lo lea.
 */
export async function tryLogCrmAgentOutput(
  userId: string,
  input: unknown,
  output: { agentId?: string; result?: unknown },
): Promise<void> {
  let cid = "";
  try {
    // `input` llega sin tipar: puede ser null, un número o cualquier cosa.
    cid = String((input as { contactId?: string } | null | undefined)?.contactId ?? "").trim();
  } catch {
    return;
  }
  // Sin contacto no hay nada que registrar, y no es un fallo: la inmensa
  // mayoría de los encargos no van asociados a un contacto de CRM.
  if (!cid) return;

  try {
    await CrmService.logActivity(cid, userId, "agent_output", outputSummary(output), output.agentId);
  } catch (e) {
    try {
      sumidero({
        contactId: cid,
        userId,
        agentId: output?.agentId,
        motivo: e instanceof Error ? e.message.slice(0, 200) : String(e).slice(0, 200),
      });
    } catch {
      // Si hasta avisar falla, se calla: avisar no puede romper el encargo.
    }
  }
}
