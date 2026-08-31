/**
 * LO QUE NO SE IMPRIME.
 *
 * POR QUÉ EXISTE. Durante una auditoría de variables de entorno, un script de
 * diagnóstico imprimió `LOCAL_AI_DATABASE_URL` recortada a 60 caracteres. El
 * recorte incluía el usuario y parte de la contraseña. No hubo mala intención
 * ni un fallo de permisos: el script hacía exactamente lo que decía su código,
 * y su código era `console.log(clave + " = " + valor.slice(0, 60))`.
 *
 * EL RECORTE NO PROTEGE NADA. Es la lección concreta. Un secreto truncado sigue
 * siendo material sensible: reduce el espacio de búsqueda de quien lo ataque y,
 * en una cadena de conexión, los primeros caracteres son justo los que traen el
 * usuario y el principio de la contraseña. «Sólo los primeros» es un consuelo,
 * no una defensa.
 *
 * QUÉ OFRECE ESTE MÓDULO. Una forma de decir todo lo útil sobre un secreto sin
 * decir el secreto:
 *
 *   · si está definido o no;
 *   · cuánto mide;
 *   · una huella no reversible, para comparar dos valores sin conocerlos;
 *   · y, sólo si alguien escribe por qué, unos últimos caracteres.
 *
 * Con eso se diagnostica casi todo: «¿está puesta?», «¿es la misma que en el
 * otro entorno?», «¿la han cambiado?». Ninguna de esas preguntas necesita el
 * valor.
 *
 * LO QUE NO HACE. No cifra, no guarda y no rota nada. Y no puede impedir que
 * alguien escriba `console.log(process.env.X)`; eso lo vigila el detector que
 * acompaña a este módulo, porque una biblioteca que hay que acordarse de usar
 * no es una defensa: es una recomendación.
 *
 * COSTE EXTERNO: 0 €.
 */
import { createHash } from "node:crypto";

/**
 * Nombres que casi siempre traen material sensible.
 *
 * Es deliberadamente amplio. Equivocarse por exceso aquí cuesta que una
 * variable inocente se describa en vez de imprimirse, que no cuesta nada;
 * equivocarse por defecto cuesta un secreto en un registro. La asimetría manda.
 */
const NOMBRES_SENSIBLES =
  /(PASS|PASSWD|PASSWORD|SECRET|TOKEN|API_?KEY|_KEY$|^KEY$|CREDENTIAL|PRIVATE|AUTH|BEARER|COOKIE|SESSION|SALT|SIGNATURE|SIGNING|WEBHOOK_SECRET|DSN|DATABASE_URL|_URL$|CONNECTION_STRING|ACCESS|REFRESH)/i;

/**
 * Nombres que contienen una de las palabras de arriba pero NO son secretos.
 *
 * Sin esta lista el clasificador diría que `AUTH_ENABLED` es un secreto, y un
 * detector que señala lo inofensivo acaba desconectado por quien lo sufre.
 */
const EXCEPCIONES =
  /^(AUTH_ENABLED|AUTH_MODE|AUTH_PROVIDER|SESSION_TIMEOUT|SESSION_TTL|COOKIE_DOMAIN|COOKIE_SAMESITE|COOKIE_SECURE|TOKEN_TTL|KEY_ROTATION_DAYS|NEXT_PUBLIC_[A-Z0-9_]*URL|PUBLIC_URL|SITE_URL|BASE_URL|APP_URL|CANONICAL_URL)$/i;

/** ¿El nombre de esta variable sugiere que su valor no debe imprimirse? */
export function esNombreSensible(nombre) {
  if (typeof nombre !== "string" || nombre.length === 0) return false;
  if (EXCEPCIONES.test(nombre)) return false;
  return NOMBRES_SENSIBLES.test(nombre);
}

/**
 * Huella no reversible de un valor.
 *
 * Sirve para responder «¿es el mismo secreto que allí?» sin conocer ninguno de
 * los dos. Se recortan 12 hexadecimales: bastantes para que dos valores
 * distintos no coincidan por accidente, pocos para que no sea el valor.
 *
 * NO es un almacén de contraseñas. Es SHA-256 sin sal ni coste, así que un
 * atacante con un diccionario podría confirmar una conjetura. Para comparar
 * cadenas de conexión largas y aleatorias sirve; para un PIN de cuatro cifras,
 * no serviría, y por eso no se usa nunca sobre valores cortos.
 */
export function huella(valor) {
  if (typeof valor !== "string" || valor.length === 0) return "vacio";
  if (valor.length < 8) return "demasiado_corto_para_huella";
  return createHash("sha256").update(valor, "utf8").digest("hex").slice(0, 12);
}

/**
 * Describe una variable sin revelarla. Es lo que un diagnóstico debe imprimir.
 *
 * `ultimosCaracteres` existe porque a veces hace falta distinguir dos claves a
 * ojo, pero exige `porQue`: si nadie sabe escribir la razón, no hay razón. Y
 * aun con razón se limita a cuatro, y nunca sobre valores cortos.
 */
export function describir(nombre, valor, opciones = {}) {
  const sensible = esNombreSensible(nombre);
  if (valor === undefined || valor === null) return `${nombre}: UNDEFINED`;

  // Un objeto convertido con `String()` da «[object Object]», que no informa de
  // nada y ademas oculta si dentro habia un secreto. Se serializa primero.
  const v =
    typeof valor === "object" ? JSON.stringify(valor) ?? "" : String(valor);
  if (v.length === 0) return `${nombre}: UNDEFINED`;

  // SEGUNDA BARRERA, Y LA QUE DE VERDAD IMPORTA.
  //
  // Clasificar por el NOMBRE es una heuristica: acierta con `DB_PASSWORD` y
  // falla con `config_value`, `dato`, `linea` o cualquier nombre inocente que
  // resulte contener una cadena de conexion. Ese caso apareció de inmediato:
  // una tabla de configuración con las columnas `key` y `value`, donde el
  // nombre no dice nada y el valor podría serlo todo.
  //
  // Así que lo que se va a imprimir pasa SIEMPRE por `redactar`, que mira la
  // FORMA del valor y no su etiqueta. El nombre decide si se resume; la forma
  // decide si, aun resumido, hay que tachar algo.
  if (!sensible) {
    const limpio = redactar(v);
    // Si la forma delató un secreto, se deja de tratar como valor público: se
    // describe igual que si el nombre lo hubiera anunciado.
    if (limpio !== v) {
      return `${nombre}: DEFINED longitud=${v.length} huella=${huella(v)} (la forma del valor parecia un secreto)`;
    }
    return `${nombre}: ${limpio}`;
  }

  const partes = [`DEFINED`, `longitud=${v.length}`, `huella=${huella(v)}`];
  const { ultimosCaracteres, porQue } = opciones;
  if (ultimosCaracteres) {
    if (!porQue || String(porQue).trim().length < 10) {
      throw new Error(
        `describir(${nombre}): pedir ultimosCaracteres exige una razon escrita en porQue.`,
      );
    }
    if (v.length >= 24) partes.push(`termina_en=${v.slice(-Math.min(4, ultimosCaracteres))}`);
    else partes.push("termina_en=<valor demasiado corto para mostrar cola>");
  }
  return `${nombre}: ${partes.join(" ")}`;
}

/**
 * Formas de secreto que se reconocen dentro de un texto cualquiera.
 *
 * Se aplica a lo que ya está escrito —un mensaje de error, la salida de un
 * proceso, una traza— donde no hay nombre de variable al que mirar. Aquí se
 * reconoce la FORMA, no el nombre.
 */
const FORMAS = [
  // Cadena de conexion con credenciales: postgres://usuario:clave@host
  [/\b([a-z][a-z0-9+.-]*:\/\/)([^:/@\s]+):([^@\s]+)@/gi, (m, esq, usr) => `${esq}${usr}:<REDACTADO>@`],
  // Cabecera Authorization
  [/\b(authorization\s*[:=]\s*)(bearer\s+)?[A-Za-z0-9._~+/=-]{8,}/gi, (m, p, b) => `${p}${b ?? ""}<REDACTADO>`],
  // Cookie completa
  [/\b(cookie\s*[:=]\s*)[^\s;]{8,}/gi, (m, p) => `${p}<REDACTADO>`],
  // Claves con prefijo conocido: sk-, pk_, rk_, ghp_, xoxb-, AKIA…
  [/\b(sk|pk|rk|ak)[-_][A-Za-z0-9]{12,}/g, () => "<REDACTADO>"],
  [/\bghp_[A-Za-z0-9]{20,}/g, () => "<REDACTADO>"],
  [/\bxox[baprs]-[A-Za-z0-9-]{10,}/g, () => "<REDACTADO>"],
  [/\bAKIA[0-9A-Z]{12,}/g, () => "<REDACTADO>"],
  // JSON Web Token
  [/\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, () => "<REDACTADO>"],
  // asignacion `clave_sensible=valor` en texto plano
  [
    /\b([A-Z0-9_]*(?:PASSWORD|PASSWD|SECRET|TOKEN|API_?KEY|CREDENTIAL)[A-Z0-9_]*)(\s*[:=]\s*)(?!<REDACTADO>)\S{4,}/gi,
    (m, k, sep) => `${k}${sep}<REDACTADO>`,
  ],
];

/**
 * Quita de un texto todo lo que parezca un secreto.
 *
 * Es una red, no una garantía: reconoce las formas que se han visto, y un
 * secreto con una forma nueva pasaría. Por eso el orden correcto es no
 * imprimirlo (`describir`), y esto queda para lo que uno no escribió.
 */
export function redactar(texto) {
  if (typeof texto !== "string" || texto.length === 0) return texto;
  let salida = texto;
  for (const [expresion, reemplazo] of FORMAS) salida = salida.replace(expresion, reemplazo);
  return salida;
}

/**
 * Un `console.log` que no puede filtrar por accidente.
 *
 * Pasa todo por `redactar` antes de escribir. No sustituye a `describir` —lo
 * correcto sigue siendo no llevar el secreto hasta aquí— pero convierte el
 * descuido en un `<REDACTADO>` en vez de en un incidente.
 */
export function imprimirSeguro(...trozos) {
  const linea = trozos
    .map((t) => (typeof t === "string" ? t : JSON.stringify(t)))
    .join(" ");
  // eslint-disable-next-line no-console
  console.log(redactar(linea));
}

/** Describe un mapa entero de variables sin imprimir ninguna sensible. */
export function describirTodas(mapa) {
  return Object.keys(mapa ?? {})
    .sort()
    .map((k) => describir(k, mapa[k]));
}
