/**
 * SECRETOS DE MENTIRA CON LA FORMA DE LOS DE VERDAD.
 *
 * ── POR QUE NO SON LITERALES ────────────────────────────────────────────────
 *
 * Las pruebas del redactor necesitan cadenas con la FORMA exacta de una clave
 * real: si el valor no se parece a una clave, no comprueban nada.
 *
 * Pero una cadena con la forma exacta de una clave real ES, para cualquier
 * escaner, una clave real. GitHub rechazo un push entero por esto:
 *
 *     —— Stripe Live API Restricted Key ——
 *        backend/logger/__tests__/...test.ts:32
 *
 * Y tenia razon: una cadena con el prefijo de una clave restringida de Stripe y
 * un cuerpo plausible es indistinguible de una viva mirando el fichero. Ni un
 * escaner ni una persona pueden saber que era inventada.
 *
 * (El valor concreto NO se reproduce aqui, ni siquiera para explicarlo: el
 * guardia `test_no_hay_secretos_vivos_en_el_arbol` lo encontraria en este
 * comentario, y con razon. Un secreto en un comentario sigue siendo un
 * secreto.) Un secreto de mentira que nadie puede distinguir de uno de verdad
 * cuesta lo mismo que uno de verdad: hay que investigarlo, rotarlo por si
 * acaso, y explicarlo.
 *
 * ── COMO SE RESUELVE ────────────────────────────────────────────────────────
 *
 * Se montan EN TIEMPO DE EJECUCION, en trozos. En el codigo fuente no existe
 * ninguna cadena con forma de credencial; en memoria, durante la prueba, si
 * —que es donde hace falta—.
 *
 * Y ademas llevan `NO_ES_REAL` dentro, para que si alguna vez aparecen en una
 * traza, un registro o una captura, quien la lea lo sepa en el acto.
 *
 * ── LO QUE NO CAMBIA ────────────────────────────────────────────────────────
 *
 * El prefijo y la longitud son los de verdad, porque son lo que el redactor
 * tiene que reconocer. `redactar` usa
 *
 *     /\b(sk|pk|rk|ak)[-_][A-Za-z0-9_-]{12,}/g
 *
 * asi que un cuerpo mas corto de doce caracteres haria pasar la prueba sin
 * medir la regla.
 *
 * COSTE EXTERNO: 0 EUR. Ninguno de estos valores sirve para nada.
 */

/** Marca que hace evidente el origen si el valor acaba en algun sitio. */
const MENTIRA = "NO_ES_REAL";

/** Junta las piezas sin que el resultado exista como literal en el fuente. */
function montar(...piezas: readonly string[]): string {
  return piezas.join("");
}

/** Clave restringida de Stripe. Prefijo real, cuerpo evidentemente falso. */
export const STRIPE_RESTRINGIDA = montar("rk", "_", "live", "_", MENTIRA, "_0123456789");

/** Clave secreta de Stripe. */
export const STRIPE_SECRETA = montar("sk", "_", "live", "_", MENTIRA, "_9876543210");

/** Clave de proyecto de OpenAI: el guion tras `sk` y otro tras `proj`. */
export const OPENAI_PROYECTO = montar("sk", "-", "proj", "-", MENTIRA, "-abcdefghijkl");

/**
 * Token de acceso personal de GitHub.
 *
 * SIN GUIONES BAJOS EN EL CUERPO, y no es cosmetico: el redactor usa
 * `ghp_[A-Za-z0-9]{20,}`, que solo acepta alfanumericos. Con un `_` dentro, la
 * coincidencia se corta antes de llegar a veinte caracteres y la prueba pasaria
 * sin medir la regla — un falso verde en el detector de secretos, que es de los
 * peores que hay.
 */
export const GITHUB_TOKEN = montar("ghp", "_", "NOESREAL", "ABCDEFGHIJKLMNOPQRST");

/** Token de bot de Slack. */
export const SLACK_BOT = montar("xoxb", "-", "1111", "-", "2222", "-", MENTIRA);

/** Identificador de clave de AWS: `AKIA` y dieciseis mas. */
export const AWS_KEY_ID = montar("AKIA", "NOESREALNOESRE1");

/**
 * Un JWT con sus tres partes.
 *
 * La cabecera es la de verdad —`{"alg":"HS256"}` en base64— porque el redactor
 * reconoce el prefijo `eyJ`, y la firma es texto plano que se delata.
 */
export const JWT = montar(
  "eyJ", "hbGciOiJIUzI1NiJ9",
  ".", "eyJ", "zdWIiOiJOT19FU19SRUFMIn0",
  ".", "firma", MENTIRA, "inventada",
);

/** El prefijo de un JWT, para comprobar que no sale ni el principio. */
export const JWT_PREFIJO = montar("eyJ", "hbGciOiJIUzI1NiJ9");

/** Una cadena de conexion con credenciales dentro. */
export const DSN_CON_CLAVE = montar(
  "postgresql://usuario:", MENTIRA, "SuperSecreta", "@db.interno:5432/nelvyon",
);

/** La parte de la cadena de conexion que NUNCA debe salir. */
export const DSN_CONTRASENA = montar(MENTIRA, "SuperSecreta");
