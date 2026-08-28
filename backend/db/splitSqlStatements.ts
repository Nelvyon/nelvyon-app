import { createHash } from "node:crypto";

/** Split SQL into statements, respecting quoted strings and dollar quotes. */
export function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let buf = "";
  let i = 0;

  while (i < sql.length) {
    const ch = sql[i];

    if (ch === "-" && sql[i + 1] === "-") {
      const nl = sql.indexOf("\n", i);
      if (nl === -1) {
        buf += sql.slice(i);
        break;
      }
      buf += sql.slice(i, nl + 1);
      i = nl + 1;
      continue;
    }

    if (ch === "$") {
      const match = sql.slice(i).match(/^\$([a-zA-Z0-9_]*)\$/);
      if (match) {
        const tag = match[0];
        buf += tag;
        i += tag.length;
        const end = sql.indexOf(tag, i);
        if (end === -1) {
          throw new Error("Unclosed dollar-quoted string in migration SQL");
        }
        buf += sql.slice(i, end + tag.length);
        i = end + tag.length;
        continue;
      }
    }

    if (ch === "'") {
      buf += ch;
      i += 1;
      while (i < sql.length) {
        if (sql[i] === "'") {
          buf += sql[i];
          i += 1;
          if (sql[i] === "'") {
            buf += sql[i];
            i += 1;
            continue;
          }
          break;
        }
        buf += sql[i];
        i += 1;
      }
      continue;
    }

    if (ch === '"') {
      buf += ch;
      i += 1;
      while (i < sql.length) {
        if (sql[i] === '"') {
          buf += sql[i];
          i += 1;
          if (sql[i] === '"') {
            buf += sql[i];
            i += 1;
            continue;
          }
          break;
        }
        buf += sql[i];
        i += 1;
      }
      continue;
    }

    if (ch === ";") {
      pushStatement(statements, buf);
      buf = "";
      i += 1;
      continue;
    }

    buf += ch;
    i += 1;
  }

  pushStatement(statements, buf);
  return statements;
}

function pushStatement(statements: string[], raw: string): void {
  const stmt = stripLeadingComments(raw).trim();
  if (stmt.length > 0) {
    statements.push(stmt);
  }
}

function stripLeadingComments(sql: string): string {
  let s = sql.trimStart();
  for (;;) {
    if (s.startsWith("--")) {
      const nl = s.indexOf("\n");
      if (nl === -1) return "";
      s = s.slice(nl + 1).trimStart();
      continue;
    }
    break;
  }
  return s;
}

type PgError = { code?: string; message?: string };

/**
 * QUE PUEDE SALTARSE LA MIGRACION CONSOLIDADA, Y QUE NO.
 *
 * La version anterior de esta funcion recibia el SQL y lo IGNORABA (el
 * parametro se llamaba `_sql`), y toleraba ocho codigos de error entre los que
 * estaban `42601` (error de sintaxis) y `42P01` (tabla inexistente). El efecto
 * medido, no supuesto:
 *
 *   - En la base local, la 507 declara 123 tablas y creo 14. Consta aplicada.
 *   - En PRODUCCION, de esas 123 faltan 5: `campaign_recipients`,
 *     `funnel_steps`, `workflow_nodes`, `visual_workflow_executions` y
 *     `workflow_trigger_registry`. La 507 tambien consta aplicada.
 *
 * Esas cinco no son tablas de adorno: `campaign_service.py`,
 * `funnel_builder_service.py` y `workflow_service.py` hacen SELECT, INSERT,
 * UPDATE y DELETE contra ellas. Campañas, constructor de embudos y workflows
 * visuales llevan rotos en produccion desde entonces, y `_migrations` decia que
 * todo estaba aplicado.
 *
 * La regla correcta distingue dos cosas que la lista plana confundia:
 *
 *   TOLERABLE   "esto ya estaba hecho" — deriva de idempotencia sobre un
 *               esquema heredado. La sentencia no tenia nada que hacer.
 *   INTOLERABLE "esto no se ha hecho" — la sentencia debia crear algo y no lo
 *               creo. Saltarselo deja la base incompleta y el registro miente.
 *
 * Por eso ahora el tipo de sentencia manda sobre el codigo de error: un
 * `CREATE TABLE` que falla NUNCA es tolerable, falle por lo que falle.
 */

/** "Ya existia": la sentencia no tenia trabajo que hacer. */
const DERIVA_IDEMPOTENTE: ReadonlySet<string> = new Set([
  "42701", // duplicate_column   — ADD COLUMN de una columna que ya esta
  "42710", // duplicate_object   — indice o restriccion que ya existe
  "42P07", // duplicate_table    — la tabla ya existe
  "42P06", // duplicate_schema
  "42723", // duplicate_function
]);

/**
 * Sentencias cuyo fallo deja la base incompleta. Ninguna es tolerable, con
 * ningun codigo: si un `CREATE TABLE` no crea la tabla, la migracion no esta
 * aplicada por mucho que `_migrations` diga lo contrario.
 */
const SENTENCIAS_QUE_DEBEN_CUMPLIRSE = /^\s*CREATE\s+(TABLE|SCHEMA|MATERIALIZED\s+VIEW)\b/i;

export function isTolerableConsolidatedMigrationError(err: unknown, sql: string): boolean {
  const code = (err as PgError).code ?? "";

  // Un error de sintaxis nunca es deriva: es una sentencia rota.
  if (code === "42601") return false;

  // Sin comentarios delante, para que la regla mida la sentencia y no su
  // cabecera. Es el mismo motivo por el que existe `stripLeadingComments`.
  if (SENTENCIAS_QUE_DEBEN_CUMPLIRSE.test(stripLeadingComments(sql))) return false;

  return DERIVA_IDEMPOTENTE.has(code);
}

/** Para poder informar de que se salto y por que, en vez de solo contar. */
export type SentenciaOmitida = { id: string; code: string; message: string; preview: string };

/**
 * Identidad estable de una sentencia. Se calcula sobre la sentencia ENTERA
 * normalizada, no sobre su vista previa: dos indices sobre la misma tabla
 * pueden coincidir en los primeros 120 caracteres, y con la vista previa como
 * identidad se solapaban en una sola entrada — asi una de las dos quedaba sin
 * vigilar. Medido: 56 omisiones producian 55 identidades.
 */
export function idDeSentencia(sql: string): string {
  const normalizada = stripLeadingComments(sql).replace(/\s+/g, " ").trim();
  return createHash("sha256").update(normalizada).digest("hex").slice(0, 16);
}

/** Resumen de una sentencia omitida, sin volcar el SQL entero al registro. */
export function describirOmision(err: unknown, sql: string): SentenciaOmitida {
  const e = err as PgError;
  return {
    id: idDeSentencia(sql),
    code: e.code ?? "",
    message: (e.message ?? "").slice(0, 200),
    preview: stripLeadingComments(sql).replace(/\s+/g, " ").slice(0, 120),
  };
}
