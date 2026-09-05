/**
 * Un entorno tal y como lo LEE el codigo: un mapa de claves a texto.
 *
 * ── POR QUE NO `NodeJS.ProcessEnv` ──────────────────────────────────────────
 *
 * Next.js amplia `NodeJS.ProcessEnv` declarando `NODE_ENV` OBLIGATORIO y de solo
 * lectura. Es correcto para el proceso real —siempre hay un NODE_ENV— pero
 * convierte la firma en una promesa que ninguna de estas funciones necesita:
 * leen `NELVYON_ERP_RELATIONAL_READ` o `OAUTH_CLIENT_ID`, y les da exactamente
 * igual si viene NODE_ENV.
 *
 * El precio de esa promesa de mas eran 272 errores de tipos: toda prueba que
 * pasara un entorno a medida —que es la unica forma de probar una funcion que
 * depende del entorno— dejaba de compilar por no traer un campo que la funcion
 * ni mira.
 *
 * ── QUE NO SE PIERDE ────────────────────────────────────────────────────────
 *
 * `process.env` sigue siendo asignable a esto, asi que el uso real no cambia. Y
 * lo que de verdad importa —que cada clave sea `string | undefined`, es decir
 * que SIEMPRE haya que comprobar si falta— se conserva intacto. No se ha
 * relajado nada: se ha dejado de exigir algo que no hacia falta.
 */
export type Entorno = Record<string, string | undefined>;
