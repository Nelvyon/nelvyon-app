/**
 * El puente que faltaba: del Business Brain al prompt del agente.
 *
 * ── EL HUECO QUE CIERRA ─────────────────────────────────────────────────────
 *
 * `backend/cerebro` guarda lo que NELVYON sabe de cada cliente —empresa, ICP,
 * competidores, objetivos, presupuesto, restricciones— con procedencia,
 * confianza y caducidad. Está bien construido y lo consumen el perfil de
 * cliente, el ciclo del cliente y el contrato de agente.
 *
 * Pero NINGÚN agente Premium lo consultaba. Medido: de los 29 servicios
 * vendibles, 2 traían algo que el modelo no puede saber solo. Los otros 27
 * interpolaban `{industry}` y `{targetAudience}` en una plantilla fija y
 * confiaban el resto al modelo.
 *
 * Eso no es un fallo técnico —cada módulo funciona y sus pruebas pasan— sino un
 * hueco en la FRONTERA. Y produce la ilusión de capacidad: el inventario dice
 * que NELVYON conoce al cliente; el prompt dice que le pasa cuatro palabras.
 *
 * ── LAS TRES REGLAS ─────────────────────────────────────────────────────────
 *
 * 1. SÓLO LO QUE EL SERVICIO USA. `dimensionesDeServicio` ya declara qué
 *    necesita cada uno. Meterle a un agente de web el presupuesto de Ads no lo
 *    hace más listo: le añade ruido y le invita a razonar sobre lo que no le
 *    toca.
 *
 * 2. LO QUE FALTA SE NOMBRA. Es la regla que más importa. Un prompt que calla
 *    lo que no sabe invita al modelo a rellenarlo, y un competidor inventado o
 *    un ICP imaginado son peores que un hueco declarado: parecen datos. Aquí
 *    los huecos van escritos, con instrucción explícita de no inventarlos y de
 *    pedirlos.
 *
 * 3. LA PROCEDENCIA VIAJA CON EL DATO. No es lo mismo un objetivo que dijo el
 *    cliente que uno que dedujo un agente. El modelo debe poder tratarlos
 *    distinto, y quien lea la salida debe poder rastrear de dónde salió cada
 *    decisión.
 *
 * ── FALLA CERRADO ───────────────────────────────────────────────────────────
 *
 * Sin cerebro no devuelve un bloque vacío. Un bloque vacío se lee como «no hay
 * restricciones» y es exactamente el peor mensaje posible. Devuelve una
 * declaración explícita de que no se sabe nada de este cliente.
 *
 * COSTE EXTERNO: 0 EUR. Sólo compone texto.
 */
import {
  dimension,
  dimensionesDeServicio,
  type Dimension,
} from "../cerebro/dimensiones";
import type { Cerebro, ValorDeDimension } from "../cerebro/CerebroDeNegocioService";

/** Lo que se le entrega al prompt, separado para poder comprobarlo por partes. */
export interface ContextoDeNegocio {
  /** El bloque de texto listo para interpolar. */
  bloque: string;
  /** Dimensiones que el servicio usa y SÍ se conocen. */
  presentes: string[];
  /** Dimensiones que el servicio usa y NO se conocen (o están caducadas). */
  huecos: string[];
  /** `true` cuando falta alguna imprescindible: quien llame decide si sigue. */
  faltaAlgoImprescindible: boolean;
}

/** Cómo se le explica al modelo de dónde viene un dato. */
const COMO_SE_SUPO: Record<string, string> = {
  cliente_intake: "lo dijo el cliente al contratar",
  cliente_portal: "lo aportó el cliente en su portal",
  nelvyon_humano: "lo estableció un especialista de NELVYON",
  agente_deducido: "lo dedujo un agente — NO está confirmado por el cliente",
  medido: "está MEDIDO sobre datos reales",
  importado: "se importó de un sistema anterior",
};

/** Convierte el valor guardado en algo legible sin inventarse nada. */
function renderizar(d: Dimension, v: ValorDeDimension): string | null {
  const val = v.valor ?? {};
  const texto = (x: unknown): string => (typeof x === "string" ? x.trim() : "");

  switch (d.forma) {
    case "texto":
      return texto(val.texto) || null;
    case "booleano":
      return typeof val.valor === "boolean" ? (val.valor ? "sí" : "no") : null;
    case "lista": {
      const items = Array.isArray(val.items) ? val.items.map(texto).filter(Boolean) : [];
      return items.length ? items.join(", ") : null;
    }
    case "personas": {
      const p = Array.isArray(val.personas) ? val.personas : [];
      const l = p
        .map((x) => {
          const o = (x ?? {}) as Record<string, unknown>;
          const partes = [texto(o.nombre), texto(o.rol)].filter(Boolean).join(" — ");
          const dolor = texto(o.dolor);
          return dolor ? `${partes} (le duele: ${dolor})` : partes;
        })
        .filter(Boolean);
      return l.length ? l.join(" · ") : null;
    }
    case "competidores": {
      const c = Array.isArray(val.competidores) ? val.competidores : [];
      const l = c
        .map((x) => {
          const o = (x ?? {}) as Record<string, unknown>;
          const hueco = texto(o.hueco);
          return hueco ? `${texto(o.nombre)} (hueco: ${hueco})` : texto(o.nombre);
        })
        .filter(Boolean);
      return l.length ? l.join(" · ") : null;
    }
    case "ubicaciones": {
      const u = Array.isArray(val.ubicaciones) ? val.ubicaciones : [];
      const l = u
        .map((x) => {
          const o = (x ?? {}) as Record<string, unknown>;
          return [texto(o.nombre), texto(o.ciudad), texto(o.pais)].filter(Boolean).join(", ");
        })
        .filter(Boolean);
      return l.length ? l.join(" · ") : null;
    }
    case "objetivos": {
      const o = Array.isArray(val.objetivos) ? val.objetivos : [];
      const l = o
        .map((x) => {
          const y = (x ?? {}) as Record<string, unknown>;
          const m = texto(y.metrica);
          const v2 = texto(y.valorObjetivo);
          const p = texto(y.plazo);
          if (!m) return "";
          return [m, v2 && `objetivo ${v2}`, p && `plazo ${p}`].filter(Boolean).join(", ");
        })
        .filter(Boolean);
      return l.length ? l.join(" · ") : null;
    }
    case "presupuesto": {
      const moneda = texto(val.moneda) || "EUR";
      const cents = typeof val.mensualCents === "number" ? val.mensualCents : null;
      if (cents === null) return null;
      return `${(cents / 100).toLocaleString("es-ES")} ${moneda}/mes`;
    }
    case "mapa": {
      const claves = Object.keys(val).filter((k) => k !== "__proto__");
      return claves.length ? claves.map((k) => `${k}: ${String(val[k])}`).join(" · ") : null;
    }
    default:
      return null;
  }
}

/**
 * El contexto de negocio de un cliente, acotado a lo que ESTE servicio usa.
 *
 * `cerebro === null` no es un error: es un cliente del que aún no se sabe nada,
 * y se dice con esas palabras.
 */
export function contextoDeNegocio(
  serviceId: string,
  cerebro: Cerebro | null,
): ContextoDeNegocio {
  const necesarias = dimensionesDeServicio(serviceId);

  if (!cerebro) {
    return {
      bloque:
        "CONTEXTO DE NEGOCIO: no hay ninguno registrado para este cliente.\n" +
        "NO inventes datos de su empresa, su mercado, sus competidores ni sus " +
        "objetivos. Trabaja sólo con lo que venga en el brief y di explícitamente " +
        "qué información hace falta pedirle.",
      presentes: [],
      huecos: necesarias.map((d) => d.id),
      faltaAlgoImprescindible: necesarias.some((d) => d.imprescindible),
    };
  }

  const caducadas = new Set(cerebro.caducadas);
  const lineas: string[] = [];
  const presentes: string[] = [];
  const huecos: string[] = [];

  for (const d of necesarias) {
    const v = cerebro.dimensiones.get(d.id);
    const legible = v ? renderizar(d, v) : null;

    if (!v || legible === null || caducadas.has(d.id)) {
      huecos.push(d.id);
      continue;
    }
    presentes.push(d.id);
    const como = COMO_SE_SUPO[v.procedencia] ?? v.procedencia;
    // La confianza se dice sólo cuando NO es alta: decirla siempre convierte el
    // bloque en ruido y hace que se deje de leer justo cuando importa.
    const fiabilidad = v.confianza < 0.7 ? `, confianza ${v.confianza.toFixed(2)}` : "";
    lineas.push(`- ${d.id}: ${legible}  [${como}${fiabilidad}]`);
  }

  const partes: string[] = [];
  if (lineas.length) {
    partes.push("CONTEXTO DE NEGOCIO REAL DE ESTE CLIENTE:", ...lineas);
  } else {
    partes.push(
      "CONTEXTO DE NEGOCIO: se conoce al cliente, pero ninguna de las " +
        "dimensiones que este servicio usa está registrada todavía.",
    );
  }

  if (huecos.length) {
    const imprescindibles = huecos.filter((id) => dimension(id)?.imprescindible);
    partes.push(
      "",
      "LO QUE NO SE SABE, y NO debes inventar:",
      ...huecos.map((id) => `- ${id}: ${dimension(id)?.pregunta ?? id}`),
      "",
      avisoDeImprescindibles(imprescindibles),
    );
  }

  return {
    bloque: partes.join("\n"),
    presentes,
    huecos,
    faltaAlgoImprescindible: huecos.some((id) => dimension(id)?.imprescindible === true),
  };
}

/** El aviso cambia de tono según lo que falte: no es lo mismo un detalle que un pilar. */
function avisoDeImprescindibles(imprescindibles: string[]): string {
  if (imprescindibles.length === 0) {
    return (
      "Trabaja con lo que hay. Donde falte un dato, dilo en la entrega y propón " +
      "cómo obtenerlo — no lo rellenes con un supuesto plausible."
    );
  }
  return (
    `FALTAN DATOS IMPRESCINDIBLES (${imprescindibles.join(", ")}). No los ` +
    "inventes bajo ninguna circunstancia: nombra explícitamente que faltan, " +
    "entrega lo que sí pueda hacerse sin ellos, y pide el resto."
  );
}
