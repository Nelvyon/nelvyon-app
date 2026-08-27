/**
 * La conexión cross-tenant del lado web. El punto más peligroso del cutover.
 *
 * POR QUÉ EXISTE
 * --------------
 * Tras `WEB_DB_ROLE_CUTOVER`, `DATABASE_URL` apuntará a `nelvyon_web_app`, que
 * NO salta RLS: las políticas deciden fila a fila y una consulta sin contexto de
 * inquilino devuelve CERO FILAS. Eso es lo correcto para las 854 rutas normales.
 *
 * Pero hay 60 rutas que trabajan entre inquilinos por definición y que hoy
 * consultan sin contexto ninguno: los 14 crons, los 6 webhooks, el plano
 * `platform`, el plano `admin`, las superficies públicas. Medido, no supuesto:
 * `test_las_rutas_web_fijan_el_inquilino.py` las tiene inventariadas una a una
 * con su motivo, y son exactamente las que ese guardián declara exentas.
 *
 * Si el cutover se hiciera sin esta conexión, esas 60 rutas no darían error:
 * devolverían cero filas. Un cron que no encuentra nada que hacer, un webhook
 * que no encuentra al inquilino del cuerpo firmado y un panel de plataforma
 * vacío **se parecen mucho a «no había trabajo»**. Es la avería más cara de
 * diagnosticar que puede producir este cambio, y por eso la conexión se escribe
 * ANTES de tocar ninguna credencial.
 *
 * QUÉ LA HACE SEGURA
 * ------------------
 * Este rol SALTA RLS. Su aislamiento depende enteramente del `WHERE` que
 * escriba cada consulta — el mismo contrato que `nelvyon_jobs` en el lado
 * Python. Así que lo único que impide que sea un superusuario mudado de sitio
 * son tres cosas, y las tres son mecanismo y no convención:
 *
 *   1. `DbClient` —el cliente de las 854 rutas— lee ÚNICAMENTE `DATABASE_URL`.
 *      Vigilado por `test_el_cliente_de_las_peticiones_lee_exactamente_una_variable`.
 *
 *   2. Nadie más construye pools. Vigilado por
 *      `test_ningun_fichero_nuevo_construye_su_propio_pool`.
 *
 *   3. LA DE ABAJO, y es nueva: si hay un inquilino en el contexto de la
 *      petición en curso, esta conexión SE NIEGA A TRABAJAR.
 *
 * SOBRE LA TERCERA
 * ----------------
 * Las dos primeras impiden que una ruta *alcance* el módulo. La tercera impide
 * que sirva de algo si lo alcanza. Un contexto de inquilino solo lo fija una
 * frontera de autenticación, así que su presencia significa exactamente «esto es
 * una petición de un cliente concreto» — y una petición de un cliente concreto
 * no tiene ningún motivo legítimo para consultar saltándose el aislamiento.
 *
 * Cierra en falso: lanza. No degrada a la conexión normal, porque degradar en
 * silencio convertiría un fallo de diseño en un resultado plausible.
 *
 * POR QUÉ CAE A `DATABASE_URL` MIENTRAS LA VARIABLE NO EXISTA
 * -----------------------------------------------------------
 * Hoy `DATABASE_URL` es `postgres`, superusuario, y ya salta RLS. Así que
 * mientras `NELVYON_WEB_JOBS_DATABASE_URL` no esté puesta, usar `DATABASE_URL`
 * da EXACTAMENTE el comportamiento de hoy: cero cambio de conducta.
 *
 * Eso es lo que hace este fichero desplegable antes del cutover y reversible
 * después. El día que la variable se ponga, esta conexión se separa sola; el día
 * que se quite, vuelve sola. No hay un momento en que el sistema dependa de que
 * las dos cosas cambien a la vez.
 *
 * LO QUE NO HACE
 * --------------
 * No fija contexto de inquilino, nunca, a propósito: este rol salta RLS y fijar
 * un contexto que no se va a evaluar solo serviría para que alguien creyera que
 * hay una red debajo.
 */
import pg from "pg";

import { sanitizeEnvValue, isSupabaseHost } from "./envSanitize";
import { inquilinoActual } from "./contextoDeInquilino";

let jobsSingleton: DbJobsClient | undefined;

/** Lee un plazo de entorno; si no está o no vale, devuelve el de por defecto. */
function plazo(variable: string, porDefecto: number): number {
  const n = Number.parseInt(process.env[variable] ?? "", 10);
  return Number.isInteger(n) && n > 0 ? n : porDefecto;
}

/**
 * La cadena de conexión cross-tenant, o la normal mientras aquella no exista.
 *
 * Exportada para que la puerta de despliegue pueda decir si el cutover está
 * hecho sin abrir un pool ni imprimir la cadena.
 */
export function cadenaDeTrabajos(): { url: string; separada: boolean } {
  const privilegiada = sanitizeEnvValue(process.env.NELVYON_WEB_JOBS_DATABASE_URL);
  if (privilegiada.length > 0) return { url: privilegiada, separada: true };
  const normal = sanitizeEnvValue(process.env.DATABASE_URL);
  if (normal.length === 0) {
    throw new Error(
      "DbJobsClient: no hay NELVYON_WEB_JOBS_DATABASE_URL ni DATABASE_URL. "
        + "El trabajo entre inquilinos no tiene por donde conectarse.",
    );
  }
  return { url: normal, separada: false };
}

function opcionesDePool(connectionString: string): pg.PoolConfig {
  const config: pg.PoolConfig = {
    connectionString,
    // Los mismos tres plazos que `DbClient`, y por los mismos motivos: un cron
    // desbocado retiene su conexión igual que una petición desbocada. El de
    // sentencia es MÁS generoso a propósito —un barrido nocturno legítimo tarda
    // más que un panel— y sigue estando acotado, que es lo que importa.
    connectionTimeoutMillis: plazo("NELVYON_DB_CONNECTION_TIMEOUT_MS", 10_000),
    statement_timeout: plazo("NELVYON_JOBS_STATEMENT_TIMEOUT_MS", 300_000),
    idle_in_transaction_session_timeout: plazo("NELVYON_DB_IDLE_TX_TIMEOUT_MS", 60_000),
  };
  // Deliberadamente pequeño. Los trabajos de fondo compiten por el mismo
  // PostgreSQL que las peticiones de los clientes, y un barrido no debe poder
  // agotar el pool del panel. Medido en el Bloque 8: con el pool a 2 y dos
  // consultas de 2 s, una consulta trivial esperó 1803 ms.
  const maximo = Number.parseInt(process.env.NELVYON_JOBS_POOL_MAX ?? "", 10);
  config.max = Number.isInteger(maximo) && maximo > 0 ? maximo : 4;
  try {
    const normalized = connectionString.replace(/^postgresql\+asyncpg:/, "postgresql:");
    if (isSupabaseHost(new URL(normalized).hostname)) {
      config.ssl = { rejectUnauthorized: false };
    }
  } catch {
    /* se queda con la configuración por defecto */
  }
  return config;
}

/** Solo para las pruebas: mirar los plazos sin abrir un pool. */
export function opcionesDePoolDeTrabajosParaPruebas(connectionString: string): pg.PoolConfig {
  return opcionesDePool(connectionString);
}

/**
 * Lanza si esta llamada viene de una petición con inquilino.
 *
 * Se comprueba en CADA consulta y no solo al construir el cliente: el cliente es
 * un singleton que vive todo el proceso, así que comprobarlo una vez al
 * arrancar no diría nada sobre quién lo usa después.
 */
function exigirQueNoHayaInquilino(operacion: string): void {
  const quien = inquilinoActual();
  if (quien?.tenantId || quien?.workspaceId != null || quien?.userId) {
    throw new Error(
      `DbJobsClient.${operacion}: hay un inquilino en el contexto de esta peticion `
        + `(${quien.tenantId ?? quien.userId ?? `ws:${quien.workspaceId}`}). `
        + "Esta conexion salta RLS y es SOLO para trabajo entre inquilinos: crons, "
        + "webhooks y los planos platform/admin. Una peticion de un cliente concreto "
        + "debe usar `DbClient`, que si queda sujeto a las politicas.",
    );
  }
}

export class DbJobsClient {
  private readonly pool: pg.Pool;

  /** `true` si de verdad hay una conexión separada; `false` si cae a `DATABASE_URL`. */
  readonly separada: boolean;

  private constructor(connectionString: string, separada: boolean) {
    this.pool = new pg.Pool(opcionesDePool(connectionString));
    this.separada = separada;
  }

  static getInstance(): DbJobsClient {
    if (jobsSingleton) return jobsSingleton;
    const { url, separada } = cadenaDeTrabajos();
    jobsSingleton = new DbJobsClient(url, separada);
    return jobsSingleton;
  }

  /** Una consulta entre inquilinos. El aislamiento lo da el `WHERE`, no RLS. */
  async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    exigirQueNoHayaInquilino("query");
    const res = await this.pool.query(sql, params);
    return res.rows as T[];
  }

  /** Una transacción entre inquilinos. Sin contexto: este rol salta RLS. */
  async withTransaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    exigirQueNoHayaInquilino("withTransaction");
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await fn(client);
      await client.query("COMMIT");
      return result;
    } catch (err) {
      try {
        await client.query("ROLLBACK");
      } catch {
        /* se propaga el error original, no el del rollback */
      }
      throw err;
    } finally {
      client.release();
    }
  }

  async end(): Promise<void> {
    await this.pool.end();
    jobsSingleton = undefined;
  }
}

/** Reinicia el singleton. Solo para las pruebas. */
export function reiniciarClienteDeTrabajosParaPruebas(): void {
  jobsSingleton = undefined;
}
