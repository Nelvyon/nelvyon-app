/**
 * Seis especialistas de red, no seis nombres sobre el mismo comportamiento.
 *
 * ── POR QUE SE DERIVAN Y NO SE ESCRIBEN A MANO ──────────────────────────────
 *
 * Un departamento social «con seis agentes» es facil de fingir: se copian seis
 * definiciones y se cambia el nombre. Eso es exactamente lo que habia antes en
 * otra forma —un agente horizontal con 129 lineas de instrucciones y DOS
 * menciones a una plataforma concreta—.
 *
 * Aqui cada especialista se CONSTRUYE desde `CONTRATO_POR_PLATAFORMA`, que es la
 * unica fuente de criterio: formato que la red premia, como se gana la atencion
 * ahi, que mide el exito y —sobre todo— lo que NO se hace. Si dos redes
 * acabaran diciendo lo mismo, seria porque el contrato dice lo mismo, y hay una
 * prueba que lo impide.
 *
 * ── PERMISOS: TODOS REDACTAN, NINGUNO PUBLICA ───────────────────────────────
 *
 * Ninguno lleva `campaigns.send` ni `inbox.send`. Publicar en la cuenta de un
 * cliente es un efecto real e irreversible de hecho —se puede borrar, pero ya lo
 * han visto— y no es trabajo de un especialista: es una decision que cruza la
 * frontera de publicacion, con su interruptor y su aprobacion por pieza.
 *
 * `canAutoExecute: false` en los seis. Lo sensible pasa por aprobacion humana.
 */
import {
  CONTRATO_POR_PLATAFORMA,
  PLATAFORMAS,
  type Plataforma,
} from "../agency/nativoPorPlataforma";
import type { AgentToolId, NelvyonPrivateAgentDef, SensitiveActionType } from "./types";

/** El identificador del especialista de una red. */
export function idDeEspecialista(p: Plataforma): string {
  return `social_${p}`;
}

/** Quien manda: el head del departamento, que ya existia como L2. */
export const CABEZA_DEL_DEPARTAMENTO_SOCIAL = "social_media";

/**
 * Lo que puede tocar un especialista.
 *
 * Leer memoria del cliente, buscar en el conocimiento y mirar informes de SU
 * red. Nada mas. No hay herramienta de envio ni de escritura: lo que produce es
 * un borrador que otro aprueba.
 */
const HERRAMIENTAS_DE_ESPECIALISTA: readonly AgentToolId[] = [
  "memory.read",
  "rag.search",
  "reports.read",
];

/** Publicar habla con la audiencia del cliente: exige que alguien lo apruebe. */
const EXIGEN_APROBACION: readonly SensitiveActionType[] = ["send_client_message"];

function promptDe(p: Plataforma): string {
  const c = CONTRATO_POR_PLATAFORMA[p];
  return [
    `Eres el especialista de ${c.nombre} de NELVYON. Trabajas SOLO esta red.`,
    "",
    `Formatos que ${c.nombre} premia: ${c.formatos.join("; ")}.`,
    `Como se gana la atencion aqui: ${c.gancho}.`,
    `Que mide el exito: ${c.seniales.join(", ")}.`,
    `Cadencia sostenible: ${c.cadencia}.`,
    "",
    `NUNCA en ${c.nombre}:`,
    ...c.nunca.map((n) => `  - ${n}`),
    "",
    "Si una idea solo funciona en otra red, dilo y no la adaptes: adaptar a la",
    "fuerza es lo que produce contenido que no rinde en ninguna parte.",
    "",
    "Entregas BORRADORES. No publicas: eso cruza la frontera de publicacion, que",
    "tiene su propia aprobacion por pieza.",
  ].join("\n");
}

/** La definicion completa del especialista de una red. */
export function especialistaDe(p: Plataforma): NelvyonPrivateAgentDef {
  const c = CONTRATO_POR_PLATAFORMA[p];
  return {
    id: idDeEspecialista(p),
    name: `${c.nombre} Specialist`,
    role: `Especialista de ${c.nombre}`,
    objective:
      `Concebir piezas nativas de ${c.nombre} —${c.formatos[0]}— que se midan por ` +
      `${c.seniales[0]}. Entrega borradores; no publica.`,
    allowedTools: [...HERRAMIENTAS_DE_ESPECIALISTA],
    limits: {
      maxTokens: 2048,
      maxRunsPerHour: 60,
      // Un especialista no ejecuta solo. Su salida entra en revision.
      canAutoExecute: false,
    },
    forbiddenActions: [],
    approvalRequiredActions: [...EXIGEN_APROBACION],
    systemPrompt: promptDe(p),
  };
}

/** Los seis especialistas, en el orden estable del contrato. */
export const ESPECIALISTAS_SOCIALES: readonly NelvyonPrivateAgentDef[] = Object.freeze(
  PLATAFORMAS.map(especialistaDe),
);

/** Sus identificadores, para la jerarquia y las pruebas. */
export const IDS_DE_ESPECIALISTAS_SOCIALES: readonly string[] = Object.freeze(
  PLATAFORMAS.map(idDeEspecialista),
);
