import pg from "pg";

import { isSupabaseHost, sanitizeEnvValue } from "./envSanitize";
import { aplicarContexto, inquilinoActual, sentenciasDeContexto } from "./contextoDeInquilino";

// Pool unico de PostgreSQL para la persistencia y los informes del OS.
//
// SOBRE EL ROL DE `DATABASE_URL`
// ------------------------------
// La nota original de MIG 279 exigia aqui la credencial de servicio de Supabase
// «porque se salta RLS». Escrito como requisito, saltarse el aislamiento dejaba
// de parecer deuda: cualquiera que intentara poner un rol acotado creeria estar
// rompiendo el sistema y lo revertiria.
//
// Hoy en produccion ese rol es `postgres` —superusuario— y por eso las 498 tablas
// con RLS y las 1.763 politicas no protegen nada en este runtime. No es un
// requisito: es deuda, con plan de salida escrito en el SSOT
// (`nelvyon_web_app` sin BYPASSRLS para el trafico normal, `nelvyon_web_jobs`
// para lo cross-tenant, credencial de migracion aparte).
//
// Lo unico que sigue siendo cierto de aquella nota: NUNCA la clave anonima.

let dbClientSingleton: DbClient | undefined;

function poolOptions(connectionString: string): pg.PoolConfig {
  const config: pg.PoolConfig = {
    connectionString,
    connectionTimeoutMillis: 10_000,
  };
  // Tamano del pool, ajustable. Es un parametro de operacion legitimo —Railway
  // impone un maximo de conexiones y conviene poder bajarlo— y ademas hace
  // DECISIVA la prueba de contaminacion entre peticiones: con `max=1` las
  // peticiones A, B y A comparten fisicamente la misma conexion, asi que si el
  // contexto sobreviviera al COMMIT se veria seguro. Con el pool por defecto
  // podrian tocar conexiones distintas y la prueba pasaria por suerte.
  const maximo = Number.parseInt(process.env.NELVYON_DB_POOL_MAX ?? "", 10);
  if (Number.isInteger(maximo) && maximo > 0) config.max = maximo;
  try {
    const normalized = connectionString.replace(/^postgresql\+asyncpg:/, "postgresql:");
    const host = new URL(normalized).hostname;
    if (isSupabaseHost(host)) {
      config.ssl = { rejectUnauthorized: false };
    }
  } catch {
    /* keep default pool config */
  }
  return config;
}

export class DbClient {
  private readonly pool: pg.Pool;

  private constructor(connectionString: string) {
    this.pool = new pg.Pool(poolOptions(connectionString));
  }

  static getInstance(): DbClient {
    if (dbClientSingleton) {
      return dbClientSingleton;
    }
    const url = sanitizeEnvValue(process.env.DATABASE_URL);
    if (url.length === 0) {
      throw new Error(
        "DbClient: falta DATABASE_URL. Debe apuntar al PostgreSQL de la aplicacion; "
          + "nunca a la clave anonima.",
      );
    }
    if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && url.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY")) {
      throw new Error(
        "DbClient: DATABASE_URL no puede referenciar la clave anonima "
          + "(NEXT_PUBLIC_SUPABASE_ANON_KEY).");
    }
    dbClientSingleton = new DbClient(url);
    return dbClientSingleton;
  }

  /**
   * Una consulta, con el contexto de inquilino de la peticion en curso.
   *
   * SIN contexto se ejecuta como siempre, contra el pool: es el camino de los
   * crons, las migraciones y el arranque, que no tienen peticion detras.
   *
   * CON contexto se abre una transaccion sobre UNA conexion, se fijan las
   * variables con ambito de transaccion y se ejecuta dentro. El COMMIT las
   * revierte solo.
   *
   * Podria parecer excesivo envolver un SELECT suelto en BEGIN/COMMIT. No lo es:
   * es justo lo que impide que el contexto sobreviva a la peticion. Con
   * `set_config(..., false)` bastaria una sentencia sin transaccion, pero
   * duraria toda la SESION —y las sesiones son conexiones de un pool que se
   * reutilizan—, asi que la peticion siguiente, de otro cliente, heredaria el
   * inquilino del anterior. La fuga la causaria el propio mecanismo de aislarlas.
   */
  async query<T>(sql: string, params?: unknown[]): Promise<T[]> {
    const quien = inquilinoActual();
    if (sentenciasDeContexto(quien).length === 0) {
      const res = await this.pool.query(sql, params);
      return res.rows as T[];
    }
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await aplicarContexto(client, quien);
      const res = await client.query(sql, params);
      await client.query("COMMIT");
      return res.rows as T[];
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

  /**
   * Run work inside a single connection transaction (BEGIN/COMMIT/ROLLBACK).
   * Caller receives a PoolClient bound to that transaction.
   */
  async withTransaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      // El contexto se fija DESPUES del BEGIN y ANTES del trabajo: con ambito de
      // transaccion, hacerlo antes no tendria efecto, y hacerlo despues dejaria
      // las primeras consultas de `fn` sin inquilino —que con RLS activa no da
      // error, devuelve cero filas—.
      await aplicarContexto(client, inquilinoActual());
      const result = await fn(client);
      await client.query("COMMIT");
      return result;
    } catch (err) {
      try {
        await client.query("ROLLBACK");
      } catch {
        /* swallow rollback errors; rethrow original */
      }
      throw err;
    } finally {
      client.release();
    }
  }

  async end(): Promise<void> {
    await this.pool.end();
    dbClientSingleton = undefined;
  }
}
