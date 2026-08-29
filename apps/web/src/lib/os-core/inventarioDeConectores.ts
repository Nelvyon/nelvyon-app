/**
 * QUÉ SE PUEDE CONECTAR HOY, DE VERDAD.
 *
 * EL PROBLEMA DEL REGISTRO. `connectorRegistry.ts` declara cuatro estados
 * —`live`, `oauth_ready`, `stub`, `planned`— y los cuatro mezclan cosas que hay
 * que separar para poder decidir. «Live» dice que el adaptador está escrito y
 * las rutas existen. NO dice si hay credenciales, ni si alguna vez se ha hablado
 * con el proveedor de verdad. Un cliente que lee «live» entiende «funciona», y
 * ninguna de las dos cosas que hacen falta para que funcione están comprobadas.
 *
 * LO QUE HACE ESTE FICHERO. Traduce cada conector a los estados con los que se
 * puede decidir algo, y —esto es lo importante— NO se cree la declaración: la
 * contrasta con lo que hay. Un conector no está disponible porque su ficha lo
 * diga, sino porque su adaptador existe, sus rutas existen y sus claves están
 * puestas. Las tres cosas se comprueban.
 *
 * LOS ESTADOS, Y POR QUÉ ESTOS.
 *
 *   AVAILABLE ............. adaptador, rutas y credenciales. Se puede usar ya.
 *   ADAPTER_READY ......... el código está y funciona; falta credencial.
 *   SANDBOX_READY ......... hay entorno de pruebas del proveedor conectado.
 *   MOCK_ONLY ............. hay fichero, pero devuelve datos inventados.
 *   CREDENTIAL_REQUIRED ... sólo falta una clave que alguien tiene que dar.
 *   PROVIDER_REQUIRED ..... hace falta una cuenta, un contrato o una revisión
 *                           del proveedor. No lo desbloquea escribir código.
 *   DECLARED_ONLY ......... está en el registro y no hay nada detrás.
 *
 * Y UNO QUE NO ES UN ESTADO SINO UN HECHO: `verificadoConElProveedor`. Hoy es
 * `false` para los dieciséis, sin excepción, porque nada se ha desplegado y
 * ninguna de estas integraciones ha hablado nunca con la API real. Se declara
 * aparte a propósito: si fuera un estado más, un conector «disponible» taparía
 * que nadie lo ha visto funcionar.
 *
 * POR QUÉ NO SE TOCA `status`. Lo consumen pantallas y pruebas que ya existen.
 * Cambiar el vocabulario de debajo para arreglar el de arriba rompe cosas que
 * funcionan; esta capa se añade al lado y deja la de abajo en paz.
 *
 * COSTE EXTERNO: 0 €. No llama a nada. Lee ficheros y variables de entorno.
 */
import { OS_CONNECTOR_REGISTRY } from "./connectorRegistry";
import type { ConnectorDefinition } from "./types";

export type EstadoDeConector =
  | "AVAILABLE"
  | "ADAPTER_READY"
  | "SANDBOX_READY"
  | "MOCK_ONLY"
  | "CREDENTIAL_REQUIRED"
  | "PROVIDER_REQUIRED"
  | "DECLARED_ONLY";

export interface ConectorInventariado {
  id: string;
  nombre: string;
  categoria: ConnectorDefinition["category"];
  /** Lo que declara el registro. Se conserva para poder contrastarlo. */
  estadoDeclarado: ConnectorDefinition["status"];
  /** Lo que se deduce de lo que hay. Es el que vale. */
  estado: EstadoDeConector;
  /**
   * Nunca ha hablado con la API real del proveedor. Hoy `false` para todos.
   * Va aparte del estado para que «disponible» no tape «nadie lo ha visto».
   */
  verificadoConElProveedor: false;
  /** Qué falta exactamente. Vacío sólo si se puede usar ya. */
  queFalta: string[];
  /** Quién lo desbloquea. Sin esto, un hueco no se puede asignar a nadie. */
  dependeDe: "nadie" | "credencial" | "proveedor" | "codigo";
  claves: string[];
}

/**
 * Qué claves de entorno están puestas.
 *
 * Se inyecta para poder probarlo. Leer `process.env` directamente haría que la
 * prueba dependiera de la máquina donde corre, que es exactamente cómo una
 * comprobación pasa en el portátil de uno y falla en el de otro.
 */
export type LectorDeEntorno = (clave: string) => string | undefined;

const entornoReal: LectorDeEntorno = (k) =>
  typeof process !== "undefined" ? process.env?.[k] : undefined;

/**
 * Conectores cuyo desbloqueo NO depende de escribir código.
 *
 * No se deduce del registro: se declara, porque la diferencia entre «falta una
 * clave» y «hace falta que un proveedor apruebe una cuenta de desarrollador»
 * no está escrita en ningún sitio del árbol y confundirlas manda a alguien a
 * buscar una variable de entorno que no existe.
 */
const NECESITAN_PROVEEDOR: Record<string, string> = {
  "google-ads": "token de desarrollador y cuenta MCC aprobada por Google",
  "hubspot-crm": "aplicación registrada en HubSpot",
  "salesforce-crm": "org de Salesforce y aplicación conectada",
  klaviyo: "cuenta de Klaviyo con acceso a su API",
  mailchimp: "cuenta de Mailchimp con clave de API",
  whatsapp: "número verificado y aprobación de plantillas por Meta",
  "amazon-ses": "salida del sandbox de SES, que la aprueba AWS",
};

/**
 * SI UN ADAPTADOR LLAMA DE VERDAD AL PROVEEDOR, SE COMPRUEBA. NO SE DECLARA.
 *
 * La primera versión de esto era una lista escrita a mano con tres conectores
 * que yo daba por simulados —tiktok, linkedin y semrush— porque el registro los
 * marca como `stub`. Al mirar los ficheros, los once adaptadores llaman a la API
 * real de su proveedor, cada uno contra su dominio: `business-api.tiktok.com`,
 * `api.linkedin.com`, `api.semrush.com`. Lo que les falta no es código: son
 * credenciales.
 *
 * Es decir: `stub` en el registro estaba diciendo «no funciona» de siete
 * conectores escritos enteros, y una lista mía escrita encima habría repetido
 * el error con más autoridad.
 *
 * De ahí que sea un predicado inyectado: en el navegador no hay disco y se
 * asume que sí llama; en la prueba se lee el fichero y se comprueba. Lo que
 * decide es la prueba, que es la que puede mirar.
 */
export type ComprobadorDeLlamadaReal = (rutaDelAdaptador: string) => boolean;

/**
 * Comprueba un conector contra lo que hay.
 *
 * `existeFichero` y `existeRuta` se inyectan porque este módulo se carga en el
 * navegador, donde no hay sistema de ficheros. En el navegador se pasa una
 * función que devuelve lo que declara el registro; en la prueba, una que mira
 * el disco de verdad — que es donde importa que coincidan.
 */
export function inventariar(
  c: ConnectorDefinition,
  opciones: {
    leerEntorno?: LectorDeEntorno;
    existeAdaptador?: (ruta: string) => boolean;
    existeRuta?: (prefijo: string) => boolean;
    haceLlamadaReal?: ComprobadorDeLlamadaReal;
  } = {},
): ConectorInventariado {
  const leer = opciones.leerEntorno ?? entornoReal;
  const hayAdaptador = c.servicePath
    ? (opciones.existeAdaptador?.(c.servicePath) ?? true)
    : false;
  const hayRutas = c.apiRoutePrefix ? (opciones.existeRuta?.(c.apiRoutePrefix) ?? true) : false;
  const llamaDeVerdad = c.servicePath
    ? (opciones.haceLlamadaReal?.(c.servicePath) ?? true)
    : false;

  const clavesQueFaltan = c.envKeys.filter((k) => {
    const v = leer(k);
    return !v || v.trim().length === 0;
  });

  const queFalta: string[] = [];
  let estado: EstadoDeConector;
  let dependeDe: ConectorInventariado["dependeDe"];

  const proveedor = NECESITAN_PROVEEDOR[c.id];

  if (!hayAdaptador) {
    // Sin adaptador no hay nada que credencialar. El orden importa: preguntar
    // primero por las claves diría «falta una clave» de algo que ni existe.
    estado = proveedor ? "PROVIDER_REQUIRED" : "DECLARED_ONLY";
    dependeDe = proveedor ? "proveedor" : "codigo";
    queFalta.push(proveedor ? `el adaptador, y antes ${proveedor}` : "el adaptador: no hay código detrás");
  } else if (!llamaDeVerdad) {
    estado = "MOCK_ONLY";
    dependeDe = "codigo";
    queFalta.push("el adaptador existe pero devuelve datos simulados: sus cifras no son del proveedor");
    if (clavesQueFaltan.length > 0) queFalta.push(`claves: ${clavesQueFaltan.join(", ")}`);
  } else if (clavesQueFaltan.length > 0) {
    // El caso normal en local: el código está, las claves no. Distinguir aquí
    // «falta una clave» de «hace falta que un proveedor apruebe algo» es lo que
    // evita que alguien pierda una tarde buscando una variable de entorno que
    // nunca va a existir hasta que Google apruebe una cuenta.
    estado = proveedor ? "PROVIDER_REQUIRED" : hayRutas ? "CREDENTIAL_REQUIRED" : "ADAPTER_READY";
    dependeDe = proveedor ? "proveedor" : "credencial";
    if (proveedor) queFalta.push(proveedor);
    queFalta.push(`claves sin poner: ${clavesQueFaltan.join(", ")}`);
    if (!hayRutas && c.apiRoutePrefix) queFalta.push(`las rutas ${c.apiRoutePrefix} no existen`);
  } else if (!hayRutas && c.apiRoutePrefix) {
    estado = "ADAPTER_READY";
    dependeDe = "codigo";
    queFalta.push(`el adaptador está pero las rutas ${c.apiRoutePrefix} no existen`);
  } else {
    estado = "AVAILABLE";
    dependeDe = "nadie";
  }

  return {
    id: c.id,
    nombre: c.name,
    categoria: c.category,
    estadoDeclarado: c.status,
    estado,
    // NUNCA `true` mientras no se despliegue. Es una constante de tipo, no un
    // valor: para cambiarla hay que tocar este fichero a conciencia.
    verificadoConElProveedor: false,
    queFalta,
    dependeDe,
    claves: c.envKeys,
  };
}

export function inventarioDeConectores(
  opciones: Parameters<typeof inventariar>[1] = {},
): ConectorInventariado[] {
  return OS_CONNECTOR_REGISTRY.map((c) => inventariar(c, opciones));
}

/** Los que se pueden usar hoy sin que nadie haga nada. */
export function conectoresUsablesHoy(
  opciones: Parameters<typeof inventariar>[1] = {},
): ConectorInventariado[] {
  return inventarioDeConectores(opciones).filter((c) => c.estado === "AVAILABLE");
}

/** Recuento por estado, para no tener que contarlos a ojo. */
export function recuentoDeConectores(
  opciones: Parameters<typeof inventariar>[1] = {},
): Record<EstadoDeConector, number> {
  const base: Record<EstadoDeConector, number> = {
    AVAILABLE: 0,
    ADAPTER_READY: 0,
    SANDBOX_READY: 0,
    MOCK_ONLY: 0,
    CREDENTIAL_REQUIRED: 0,
    PROVIDER_REQUIRED: 0,
    DECLARED_ONLY: 0,
  };
  for (const c of inventarioDeConectores(opciones)) base[c.estado] += 1;
  return base;
}

export const CONECTORES_CON_PROVEEDOR = NECESITAN_PROVEEDOR;
