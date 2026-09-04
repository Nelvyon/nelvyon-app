/**
 * LO QUE UN AGENTE TENDRÍA QUE EMITIR para que ocho comprobaciones funcionen.
 *
 * ── DE DÓNDE VIENE ESTO ─────────────────────────────────────────────────────
 *
 * Ocho de las comprobaciones del motor no pueden dispararse hoy. No están rotas:
 * esperan una FICHA —cuántas páginas, en qué paso aparece el precio, qué
 * contraste tiene el texto— y el agente devuelve prosa.
 *
 * La respuesta fácil era «hace falta un modelo real, así que no se puede hacer
 * nada». No es verdad. Lo único que hace falta de un modelo real es comprobar
 * que EMITE esta forma. Todo lo demás —qué campos, qué significa cada uno,
 * cuándo pasa, cuándo falla, qué hacer si llega a medias o mal formado— se
 * puede definir y probar aquí, gratis.
 *
 * Este fichero es el contrato. Lo que queda bloqueado se llama, con su nombre:
 * `PROVIDER_REAL_OUTPUT_VERIFICATION`.
 *
 * ── POR QUÉ UN CONTRATO Y NO UNOS CUANTOS CAMPOS ────────────────────────────
 *
 * Sin un sitio donde esté escrito qué se espera, cada agente inventaría su
 * forma, las comprobaciones seguirían sin dispararse y nadie sabría por qué. Un
 * campo que se llama `pages` en un agente y `paginas` en la comprobación es
 * exactamente el fallo que ya costó ocho comprobaciones muertas.
 *
 * ── TODO ES OPCIONAL, Y ESO NO ES DEBILIDAD ─────────────────────────────────
 *
 * Un agente que no emita la ficha sigue funcionando: la comprobación devuelve
 * «no se pudo comprobar», que es honesto. Hacerla obligatoria convertiría cada
 * respuesta imperfecta de un modelo en una entrega perdida.
 */

/** Una página del plan, con la búsqueda que quiere ganar. */
export type PaginaPlanificada = {
  /** Qué búsqueda o intención quiere resolver ESTA página. */
  objetivo?: string;
  url?: string;
  titulo?: string;
};

/** Un campo del formulario, con si es obligatorio. */
export type CampoDeFormulario = {
  nombre?: string;
  obligatorio?: boolean;
};

/**
 * La ficha que acompaña a la prosa.
 *
 * Cada campo lleva la comprobación que lo lee. Si un campo deja de leerlo nadie,
 * sobra; si una comprobación lee algo que no está aquí, no puede dispararse.
 */
export type FichaDeLaPieza = {
  /** `canibalizacion`: dos páginas con el mismo objetivo se quitan fuerza. */
  paginas?: PaginaPlanificada[];

  /** `una-idea-por-pantalla`: más de una llamada principal y no gana ninguna. */
  ctasPrincipales?: string[];

  /** `formulario-pide-lo-justo`: cada obligatorio de más cuesta conversiones. */
  camposDelFormulario?: CampoDeFormulario[];

  /** `se-puede-leer-lo-que-pone`: ratio de contraste. Por debajo de 4,5 cuesta. */
  contrasteTextoFondo?: number;

  /** `el-precio-no-aparece-tarde`: en qué paso, de cuántos. */
  pasoDondeApareceElPrecio?: number;
  pasosDelProceso?: number;

  /** `gastos-de-envio-sin-sorpresas`: dónde se enseñan. */
  cuandoSeMuestranGastosDeEnvio?: string;

  /** `cualificacion-explicada`: con qué se separa un lead bueno de uno malo. */
  criteriosDeCualificacion?: string[];

  /** `empieza-por-lo-que-el-cliente-queria`: por dónde arranca el informe. */
  primeraSeccion?: string;
};

/** Qué comprobación lee cada campo. Es la fuente para no perder el hilo. */
export const QUIEN_LEE_CADA_CAMPO: Readonly<Record<keyof FichaDeLaPieza, string>> = {
  paginas: "canibalizacion",
  ctasPrincipales: "una-idea-por-pantalla",
  camposDelFormulario: "formulario-pide-lo-justo",
  contrasteTextoFondo: "se-puede-leer-lo-que-pone",
  pasoDondeApareceElPrecio: "el-precio-no-aparece-tarde",
  pasosDelProceso: "el-precio-no-aparece-tarde",
  cuandoSeMuestranGastosDeEnvio: "gastos-de-envio-sin-sorpresas",
  criteriosDeCualificacion: "cualificacion-explicada",
  primeraSeccion: "empieza-por-lo-que-el-cliente-queria",
};

/**
 * Saca la ficha de lo que devolvió el agente, sin romperse con lo que venga.
 *
 * ── POR QUÉ NO VALIDA, FILTRA ───────────────────────────────────────────────
 *
 * Un modelo devuelve lo que le da la gana: un número donde iba una lista, la
 * lista a medias, un objeto vacío. Rechazar la respuesta entera por un campo mal
 * puesto perdería los otros siete, y perder trabajo bueno por un campo malo es
 * peor que no tener la ficha.
 *
 * Así que cada campo se acepta o se descarta por separado. Lo que no llega con
 * la forma correcta simplemente no está — y su comprobación dirá «no se pudo
 * comprobar», que es exactamente la verdad.
 */
export function fichaDe(resultado: unknown): FichaDeLaPieza {
  const ficha: FichaDeLaPieza = {};
  if (!resultado || typeof resultado !== "object" || Array.isArray(resultado)) return ficha;
  const r = resultado as Record<string, unknown>;

  if (Array.isArray(r.paginas)) {
    const paginas = r.paginas.filter(
      (x): x is PaginaPlanificada => Boolean(x) && typeof x === "object" && !Array.isArray(x),
    );
    if (paginas.length > 0) ficha.paginas = paginas;
  }

  const listaDeTextos = (v: unknown): string[] | undefined => {
    if (!Array.isArray(v)) return undefined;
    const items = v.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
    // Una lista vacía NO se descarta: «cero criterios de cualificación» es
    // justamente lo que una de las comprobaciones quiere detectar.
    return v.length === 0 || items.length > 0 ? items : undefined;
  };

  const ctas = listaDeTextos(r.ctasPrincipales);
  if (ctas !== undefined) ficha.ctasPrincipales = ctas;

  const criterios = listaDeTextos(r.criteriosDeCualificacion);
  if (criterios !== undefined) ficha.criteriosDeCualificacion = criterios;

  if (Array.isArray(r.camposDelFormulario)) {
    const campos = r.camposDelFormulario.filter(
      (x): x is CampoDeFormulario => Boolean(x) && typeof x === "object" && !Array.isArray(x),
    );
    if (campos.length > 0) ficha.camposDelFormulario = campos;
  }

  const numero = (v: unknown): number | undefined =>
    typeof v === "number" && Number.isFinite(v) ? v : undefined;

  const contraste = numero(r.contrasteTextoFondo);
  if (contraste !== undefined) ficha.contrasteTextoFondo = contraste;

  // Los dos del precio van JUNTOS. Uno solo no dice nada —«paso 4» sin saber de
  // cuántos— y la comprobación ya lo exige, pero dejarlo pasar a medias aquí
  // haría creer que la ficha trae ese dato.
  const paso = numero(r.pasoDondeApareceElPrecio);
  const total = numero(r.pasosDelProceso);
  if (paso !== undefined && total !== undefined && total > 0) {
    ficha.pasoDondeApareceElPrecio = paso;
    ficha.pasosDelProceso = total;
  }

  if (typeof r.cuandoSeMuestranGastosDeEnvio === "string" && r.cuandoSeMuestranGastosDeEnvio.trim()) {
    ficha.cuandoSeMuestranGastosDeEnvio = r.cuandoSeMuestranGastosDeEnvio.trim();
  }
  if (typeof r.primeraSeccion === "string" && r.primeraSeccion.trim()) {
    ficha.primeraSeccion = r.primeraSeccion.trim();
  }

  return ficha;
}

/** Qué campos de la ficha llegaron y cuáles no, para poder decirlo. */
export function queTraeLaFicha(ficha: FichaDeLaPieza): {
  presentes: string[];
  ausentes: string[];
} {
  const claves = Object.keys(QUIEN_LEE_CADA_CAMPO) as Array<keyof FichaDeLaPieza>;
  const presentes = claves.filter((c) => ficha[c] !== undefined);
  return {
    presentes,
    ausentes: claves.filter((c) => ficha[c] === undefined),
  };
}
