/**
 * EL CEREBRO DE NEGOCIO DE UN CLIENTE.
 *
 * Es lo que un agente lee ANTES de trabajar, en vez de recibir un `brief`
 * armado a mano en una ruta. La diferencia no es cosmética:
 *
 *   - Un `brief` es un texto: el agente tiene que interpretarlo cada vez, y no
 *     puede saber si lo que lee lo dijo el cliente o se lo inventó otro agente.
 *   - El cerebro es una consulta por dimensión: el agente pide `icp` y recibe
 *     un valor con su procedencia, su confianza y su fecha. Si no está, lo
 *     sabe, y puede pedirlo en vez de suponerlo.
 *
 * TRES REGLAS QUE NO SE NEGOCIAN
 *
 * 1. TODA lectura va acotada por `workspace_id`. No hay método que lea sin él.
 * 2. NUNCA se mezcla contexto de dos clientes. Ni para «aprender»: lo que un
 *    cliente cuenta de su negocio es suyo, y usarlo para otro es exactamente lo
 *    que un cliente no espera cuando rellena un formulario.
 * 3. Lo que falta se dice, no se rellena. Un cerebro que devuelve valores por
 *    defecto convierte «no lo sé» en «lo sé», y un agente que trabaja sobre eso
 *    produce trabajo plausible y equivocado.
 */

import {
  dimension,
  dimensionesDeServicio,
  dimensionesImprescindibles,
  esDimensionConocida,
  type Dimension,
} from "./dimensiones";

export type Procedencia =
  | "cliente_intake"
  | "cliente_portal"
  | "nelvyon_humano"
  | "agente_deducido"
  | "medido"
  | "importado";

export interface ValorDeDimension {
  dimension: string;
  valor: Record<string, unknown>;
  procedencia: Procedencia;
  origen: string;
  confianza: number;
  vigenteHasta: Date | null;
  version: number;
  actualizado: Date;
}

/** Lo que un agente recibe: lo que hay, y con qué fiabilidad. */
export interface Cerebro {
  workspaceId: number;
  clientId: string;
  /** Sólo las dimensiones que EXISTEN. Las ausentes no aparecen vacías. */
  dimensiones: Map<string, ValorDeDimension>;
  /** Dimensiones presentes pero caducadas: existen y no son de fiar. */
  caducadas: string[];
}

export interface HuecoDelCerebro {
  dimension: string;
  pregunta: string;
  imprescindible: boolean;
  laAporta: Dimension["laAporta"];
  /** `ausente` = nunca se supo. `caducada` = se supo y ya no vale. */
  motivo: "ausente" | "caducada";
}

export interface EstadoDeCompletitud {
  /** Puede empezarse a trabajar: están todas las imprescindibles y vigentes. */
  listoParaOperar: boolean;
  presentes: number;
  requeridas: number;
  huecos: HuecoDelCerebro[];
  /** Sólo los que le tocan al cliente. Es lo que se le enseña en el portal. */
  huecosDelCliente: HuecoDelCerebro[];
}

export interface AlmacenDelCerebro {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
}

type FilaCerebro = {
  dimension: string;
  valor: Record<string, unknown>;
  procedencia: Procedencia;
  origen: string;
  confianza: string;
  vigente_hasta: string | null;
  version: number;
  updated_at: string;
};

export class ErrorDeCerebro extends Error {
  constructor(
    readonly codigo: "DIMENSION_DESCONOCIDA" | "VALOR_INVALIDO" | "SIN_ALCANCE",
    mensaje: string,
  ) {
    super(mensaje);
    this.name = "ErrorDeCerebro";
  }
}

export class CerebroDeNegocioService {
  constructor(private readonly db: AlmacenDelCerebro) {}

  /**
   * Lee el cerebro entero de un cliente.
   *
   * `workspaceId` es obligatorio y viaja en el WHERE. No existe una variante
   * «global»: un método que puede leer sin inquilino acaba llamándose sin
   * inquilino.
   */
  async leer(workspaceId: number, clientId: string): Promise<Cerebro> {
    if (!Number.isInteger(workspaceId)) {
      throw new ErrorDeCerebro("SIN_ALCANCE", "el cerebro no se lee sin workspace");
    }
    const filas = await this.db.query<FilaCerebro>(
      `SELECT dimension, valor, procedencia, origen, confianza,
              vigente_hasta, version, updated_at
         FROM os_client_brain
        WHERE workspace_id = $1 AND client_id = $2`,
      [workspaceId, clientId],
    );

    const dimensiones = new Map<string, ValorDeDimension>();
    const caducadas: string[] = [];
    const ahora = Date.now();

    for (const f of filas) {
      const vigenteHasta = f.vigente_hasta ? new Date(f.vigente_hasta) : null;
      if (vigenteHasta && vigenteHasta.getTime() < ahora) caducadas.push(f.dimension);
      dimensiones.set(f.dimension, {
        dimension: f.dimension,
        valor: f.valor,
        procedencia: f.procedencia,
        origen: f.origen,
        confianza: Number(f.confianza),
        vigenteHasta,
        version: f.version,
        actualizado: new Date(f.updated_at),
      });
    }

    return { workspaceId, clientId, dimensiones, caducadas };
  }

  /**
   * Una dimensión concreta. Devuelve `null` si no existe o si caducó: para
   * quien la lee, un dato caducado y uno ausente valen lo mismo — ninguno de
   * los dos sirve para decidir.
   */
  async leerDimension(
    workspaceId: number,
    clientId: string,
    id: string,
  ): Promise<ValorDeDimension | null> {
    const cerebro = await this.leer(workspaceId, clientId);
    if (cerebro.caducadas.includes(id)) return null;
    return cerebro.dimensiones.get(id) ?? null;
  }

  /**
   * Guarda una dimensión. Si ya había un valor, el anterior va al histórico
   * ANTES de sobrescribir: un cerebro que se sobrescribe no permite explicar
   * por qué se decidió algo el mes pasado.
   */
  async escribir(params: {
    workspaceId: number;
    clientId: string;
    dimension: string;
    valor: Record<string, unknown>;
    procedencia: Procedencia;
    origen: string;
    confianza?: number;
  }): Promise<{ version: number }> {
    const def = dimension(params.dimension);
    if (!def) {
      throw new ErrorDeCerebro(
        "DIMENSION_DESCONOCIDA",
        `"${params.dimension}" no está en el catálogo de dimensiones`,
      );
    }
    validarForma(def, params.valor);

    const confianza = params.confianza ?? confianzaPorProcedencia(params.procedencia);
    const vigenteHasta =
      def.caducaEnDias === null
        ? null
        : new Date(Date.now() + def.caducaEnDias * 86_400_000).toISOString();

    // El valor anterior al histórico. Va antes del UPSERT, en la misma
    // secuencia, para que no exista un instante en el que se haya perdido.
    await this.db.query(
      `INSERT INTO os_client_brain_history
         (workspace_id, client_id, dimension, valor, procedencia, origen,
          confianza, version, reemplazado_por, valido_desde)
       SELECT workspace_id, client_id, dimension, valor, procedencia, origen,
              confianza, version, $4, updated_at
         FROM os_client_brain
        WHERE workspace_id = $1 AND client_id = $2 AND dimension = $3`,
      [params.workspaceId, params.clientId, params.dimension, params.origen],
    );

    const filas = await this.db.query<{ version: number }>(
      `INSERT INTO os_client_brain
         (workspace_id, client_id, dimension, valor, procedencia, origen,
          confianza, vigente_hasta, version)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8::timestamptz, 1)
       ON CONFLICT (workspace_id, client_id, dimension) DO UPDATE
         SET valor = EXCLUDED.valor,
             procedencia = EXCLUDED.procedencia,
             origen = EXCLUDED.origen,
             confianza = EXCLUDED.confianza,
             vigente_hasta = EXCLUDED.vigente_hasta,
             version = os_client_brain.version + 1,
             updated_at = NOW()
       RETURNING version`,
      [
        params.workspaceId,
        params.clientId,
        params.dimension,
        JSON.stringify(params.valor),
        params.procedencia,
        params.origen,
        confianza,
        vigenteHasta,
      ],
    );
    return { version: filas[0]?.version ?? 1 };
  }

  /**
   * QUÉ LE FALTA A ESTE CLIENTE PARA QUE PODAMOS TRABAJAR.
   *
   * Es la función que hace útil todo lo demás. Responde a la pregunta que el
   * portal tiene que contestar —«¿qué necesita NELVYON de mí?»— y la que el
   * agente de activación necesita para perseguir lo que falta.
   *
   * Se calcula contra las dimensiones que ese SERVICIO usa, no contra las 28:
   * pedirle a un cliente de SEO su presupuesto de publicidad es ruido, y el
   * ruido es lo que hace que un onboarding no se termine.
   */
  async completitud(
    workspaceId: number,
    clientId: string,
    serviceId?: string,
  ): Promise<EstadoDeCompletitud> {
    const cerebro = await this.leer(workspaceId, clientId);
    // Sin servicio se exigen sólo las imprescindibles: no se le puede reprochar
    // a un cliente que le falte algo que ningún servicio suyo usa.
    const requeridas = serviceId
      ? dimensionesDeServicio(serviceId)
      : dimensionesImprescindibles();

    const huecos: HuecoDelCerebro[] = [];
    let presentes = 0;

    for (const def of requeridas) {
      const tiene = cerebro.dimensiones.has(def.id);
      const caducada = cerebro.caducadas.includes(def.id);
      if (tiene && !caducada) {
        presentes += 1;
        continue;
      }
      huecos.push({
        dimension: def.id,
        pregunta: def.pregunta,
        imprescindible: def.imprescindible,
        laAporta: def.laAporta,
        motivo: caducada ? "caducada" : "ausente",
      });
    }

    // Listo para operar = no falta NINGUNA imprescindible. Las opcionales
    // mejoran el trabajo; las imprescindibles lo hacen imposible.
    const listoParaOperar = !huecos.some((h) => h.imprescindible);

    return {
      listoParaOperar,
      presentes,
      requeridas: requeridas.length,
      huecos,
      huecosDelCliente: huecos.filter((h) => h.laAporta === "cliente"),
    };
  }

  /**
   * El cerebro en la forma que un agente consume: un objeto plano con sólo las
   * dimensiones vigentes y de confianza suficiente.
   *
   * `confianzaMinima` existe para que un agente que va a gastar dinero pueda
   * exigir más certeza que uno que redacta un borrador.
   */
  async paraAgente(
    workspaceId: number,
    clientId: string,
    opciones: { serviceId?: string; confianzaMinima?: number } = {},
  ): Promise<{
    contexto: Record<string, unknown>;
    procedencias: Record<string, { procedencia: Procedencia; confianza: number }>;
    faltan: string[];
  }> {
    const minima = opciones.confianzaMinima ?? 0;
    const cerebro = await this.leer(workspaceId, clientId);
    const relevantes = opciones.serviceId
      ? new Set(dimensionesDeServicio(opciones.serviceId).map((d) => d.id))
      : null;

    const contexto: Record<string, unknown> = {};
    const procedencias: Record<string, { procedencia: Procedencia; confianza: number }> = {};
    const faltan: string[] = [];

    for (const [id, v] of cerebro.dimensiones) {
      if (relevantes && !relevantes.has(id)) continue;
      if (cerebro.caducadas.includes(id)) {
        faltan.push(id);
        continue;
      }
      if (v.confianza < minima) {
        faltan.push(id);
        continue;
      }
      contexto[id] = v.valor;
      procedencias[id] = { procedencia: v.procedencia, confianza: v.confianza };
    }

    if (relevantes) {
      for (const id of relevantes) {
        if (!(id in contexto) && !faltan.includes(id)) faltan.push(id);
      }
    }

    return { contexto, procedencias, faltan };
  }
}

/**
 * Confianza por defecto según de dónde venga el dato.
 *
 * Lo que dice el cliente sobre su propio negocio es lo más fiable que hay. Lo
 * que deduce un agente es una hipótesis hasta que se mide. Ponerlos al mismo
 * nivel es cómo una suposición acaba tratada como un hecho.
 */
export function confianzaPorProcedencia(p: Procedencia): number {
  switch (p) {
    case "cliente_intake":
    case "cliente_portal":
      return 1.0;
    case "medido":
      return 0.95;
    case "nelvyon_humano":
      return 0.9;
    case "importado":
      return 0.85;
    case "agente_deducido":
      return 0.6;
  }
}

/**
 * Un valor tiene que tener la forma que su dimensión declara. Sin esto, el
 * cerebro sería `os_clients` otra vez: un sitio donde cabe cualquier cosa y
 * quien lo lee tiene que adivinar.
 */
export function validarForma(def: Dimension, valor: Record<string, unknown>): void {
  const falla = (esperado: string): never => {
    throw new ErrorDeCerebro(
      "VALOR_INVALIDO",
      `la dimensión "${def.id}" es de forma "${def.forma}" y espera ${esperado}`,
    );
  };
  const lista = (k: string): void => {
    if (!Array.isArray(valor[k])) falla(`{ ${k}: [...] }`);
  };

  switch (def.forma) {
    case "texto":
      if (typeof valor.texto !== "string" || valor.texto.trim().length === 0) {
        falla("{ texto: string no vacío }");
      }
      break;
    case "lista":
      lista("items");
      break;
    case "personas":
      lista("personas");
      break;
    case "competidores":
      lista("competidores");
      break;
    case "ubicaciones":
      lista("ubicaciones");
      break;
    case "objetivos":
      lista("objetivos");
      break;
    case "presupuesto":
      if (typeof valor.moneda !== "string") falla("{ moneda: string, ... }");
      break;
    case "booleano":
      if (typeof valor.valor !== "boolean") falla("{ valor: boolean }");
      break;
    case "mapa":
      // Cualquier objeto vale, pero un objeto: no una cadena disfrazada.
      if (typeof valor !== "object" || valor === null || Array.isArray(valor)) {
        falla("un objeto");
      }
      break;
  }
}

export { esDimensionConocida };
