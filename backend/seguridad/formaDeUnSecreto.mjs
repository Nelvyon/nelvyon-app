/**
 * LA FORMA DE UN SECRETO. Solo texto, sin dependencias de Node.
 *
 * ── POR QUE ESTO VIVE APARTE ────────────────────────────────────────────────
 *
 * Estaba en `loQueNoSeImprime.mjs`, que importa `node:crypto` para la huella.
 * Cuando el registrador del lado web empezo a usar `redactar`, ese `import`
 * entro en el grafo del NAVEGADOR y el build se cayo entero:
 *
 *     Module not found: node:crypto
 *       ../../backend/seguridad/loQueNoSeImprime.mjs
 *       ./src/lib/serverLogger.ts
 *
 * No lo vio ninguna de las 9.511 pruebas —en vitest el modulo resuelve sin
 * problema— y lo caza `next build`, que es exactamente para lo que esta.
 *
 * Y no es solo empaquetado: de verdad son dos cosas distintas. Lo de aqui
 * decide por la FORMA de un texto y puede correr en cualquier sitio; lo que se
 * queda alli describe una variable de entorno del servidor y necesita hashear.
 *
 * COSTE EXTERNO: 0 EUR.
 */

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
/**
 * Nombres que contienen una de las palabras de arriba pero NO son secretos.
 *
 * Sin esta lista el clasificador diría que `AUTH_ENABLED` es un secreto, y un
 * detector que señala lo inofensivo acaba desconectado por quien lo sufre.
 */
const EXCEPCIONES =
  /^(AUTH_ENABLED|AUTH_MODE|AUTH_PROVIDER|SESSION_TIMEOUT|SESSION_TTL|COOKIE_DOMAIN|COOKIE_SAMESITE|COOKIE_SECURE|TOKEN_TTL|KEY_ROTATION_DAYS|NEXT_PUBLIC_[A-Z0-9_]*URL|PUBLIC_URL|SITE_URL|BASE_URL|APP_URL|CANONICAL_URL)$/i;

/** ¿El nombre de esta variable sugiere que su valor no debe imprimirse? */
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
  //
  // EL CUERPO ADMITE `-` Y `_`. La primera version usaba `[A-Za-z0-9]{12,}` y
  // se paraba en el segundo separador, asi que `sk-proj-AAAA...` y
  // `rk_live_ZZZZ...` —las formas REALES de OpenAI y de una clave restringida
  // de Stripe— no llegaban al minimo de doce y pasaban enteras. Se descubrio
  // atacando el redactor con dieciocho formas distintas, no leyendolo.
  [/\b(sk|pk|rk|ak)[-_][A-Za-z0-9_-]{12,}/g, () => "<REDACTADO>"],
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
