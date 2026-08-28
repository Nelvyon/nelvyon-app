/**
 * LA MIGRACIÓN QUE DECÍA ESTAR PUESTA.
 *
 * Medido, no supuesto. La migración `507_fastapi_runtime_schemas.sql` declara
 * 123 tablas. En la base de datos local existen 14 de ellas; en PRODUCCIÓN
 * faltan 5. Y en las dos, `_migrations` dice que la 507 está aplicada.
 *
 * Las cinco que faltan en producción son:
 *
 *   campaign_recipients          → backend/services/campaign_service.py
 *   funnel_steps                 → backend/services/funnel_builder_service.py
 *   workflow_nodes               → backend/services/workflow_service.py
 *   visual_workflow_executions   → backend/services/workflow_service.py
 *   workflow_trigger_registry    → backend/services/workflow_service.py
 *
 * Los tres servicios hacen SELECT, INSERT, UPDATE y DELETE contra ellas. No son
 * tablas de adorno: son campañas, el constructor de embudos y los workflows
 * visuales, tres cosas que el producto vende.
 *
 * Cómo pasó: `isTolerableConsolidatedMigrationError` recibía la sentencia SQL y
 * la ignoraba —el parámetro se llamaba literalmente `_sql`— y toleraba ocho
 * códigos de error entre los que estaban `42601` (error de sintaxis) y `42P01`
 * (tabla inexistente). Un `CREATE TABLE` que fallaba se saltaba en silencio y
 * la migración se registraba igual.
 *
 * La regla nueva distingue "esto ya estaba hecho" de "esto no se ha hecho".
 */
import { describe, expect, it } from "vitest";

import {
  describirOmision,
  isTolerableConsolidatedMigrationError,
} from "../splitSqlStatements";

/** Error de PostgreSQL tal y como lo entrega `pg`. */
function errorPg(code: string, message = "algo"): unknown {
  return Object.assign(new Error(message), { code });
}

const CREATE_TABLE = "CREATE TABLE IF NOT EXISTS campaign_recipients (id TEXT PRIMARY KEY);";
const ADD_COLUMN = "ALTER TABLE contacts ADD COLUMN nuevo TEXT;";
const CREATE_INDEX = "CREATE INDEX idx_x ON contacts (email);";

describe("un CREATE TABLE que falla NUNCA es tolerable", () => {
  // Ésta es la regresión exacta. Los ocho códigos que la lista vieja toleraba,
  // aplicados a la sentencia que dejó producción sin cinco tablas.
  it.each(["42601", "42701", "42703", "42710", "42830", "42883", "42P01", "42P16", "42P07"])(
    "código %s sobre un CREATE TABLE se rechaza",
    (code) => {
      expect(
        isTolerableConsolidatedMigrationError(errorPg(code), CREATE_TABLE),
        `un CREATE TABLE que falla con ${code} NO puede darse por bueno`,
      ).toBe(false);
    },
  );

  it("tampoco un CREATE SCHEMA ni una vista materializada", () => {
    expect(isTolerableConsolidatedMigrationError(errorPg("42P06"), "CREATE SCHEMA analitica;")).toBe(
      false,
    );
    expect(
      isTolerableConsolidatedMigrationError(
        errorPg("42P07"),
        "CREATE MATERIALIZED VIEW mv_x AS SELECT 1;",
      ),
    ).toBe(false);
  });

  it("un comentario delante no lo disfraza", () => {
    // Una regla que se aplica sobre el texto crudo mide la cabecera, no la
    // sentencia. Es el mismo motivo por el que existe `stripLeadingComments`.
    const conComentario = `-- tabla de destinatarios\n-- añadida en el bloque 5\n${CREATE_TABLE}`;
    expect(isTolerableConsolidatedMigrationError(errorPg("42P01"), conComentario)).toBe(false);
  });

  it("`CREATE TABLEFOO` no cuenta como CREATE TABLE", () => {
    // El límite de palabra importa: sin él, cualquier identificador que empiece
    // por TABLE quedaría bloqueado por accidente.
    expect(
      isTolerableConsolidatedMigrationError(errorPg("42701"), "CREATE TABLESPACE ts LOCATION '/x';"),
    ).toBe(true);
  });
});

describe("un error de sintaxis nunca es deriva", () => {
  it.each([CREATE_TABLE, ADD_COLUMN, CREATE_INDEX])("42601 se rechaza en cualquier sentencia", (sql) => {
    expect(isTolerableConsolidatedMigrationError(errorPg("42601"), sql)).toBe(false);
  });
});

describe("lo que SÍ sigue siendo tolerable: 'esto ya estaba hecho'", () => {
  it("una columna que ya existe", () => {
    expect(isTolerableConsolidatedMigrationError(errorPg("42701"), ADD_COLUMN)).toBe(true);
  });

  it("un índice que ya existe", () => {
    expect(isTolerableConsolidatedMigrationError(errorPg("42710"), CREATE_INDEX)).toBe(true);
  });

  it("EL CONTROL: si nada fuera tolerable, la 507 no podría aplicarse dos veces", () => {
    // Sin este caso, endurecer la regla sería indistinguible de romperla.
    expect(isTolerableConsolidatedMigrationError(errorPg("42P07"), ADD_COLUMN)).toBe(true);
  });
});

describe("lo que dejó de tolerarse, y por qué", () => {
  it("una tabla inexistente en un ALTER ya no se traga", () => {
    // `ALTER TABLE x ADD ...` con la tabla ausente significa que una
    // dependencia no se creó. Saltárselo propaga el agujero.
    expect(isTolerableConsolidatedMigrationError(errorPg("42P01"), ADD_COLUMN)).toBe(false);
  });

  it("una función inexistente tampoco", () => {
    expect(
      isTolerableConsolidatedMigrationError(errorPg("42883"), "SELECT mi_funcion_que_no_existe();"),
    ).toBe(false);
  });

  it("una clave foránea inválida tampoco", () => {
    expect(
      isTolerableConsolidatedMigrationError(
        errorPg("42830"),
        "ALTER TABLE a ADD CONSTRAINT fk FOREIGN KEY (b) REFERENCES c(d);",
      ),
    ).toBe(false);
  });

  it("un código desconocido no se tolera por defecto", () => {
    expect(isTolerableConsolidatedMigrationError(errorPg("XX000"), ADD_COLUMN)).toBe(false);
    expect(isTolerableConsolidatedMigrationError(new Error("sin código"), ADD_COLUMN)).toBe(false);
  });
});

describe("una omisión se puede contar, pero también explicar", () => {
  it("describe código, mensaje y qué sentencia era", () => {
    const d = describirOmision(
      errorPg("42P01", 'relation "intent_events" does not exist'),
      `-- comentario\n${CREATE_TABLE}`,
    );
    expect(d.code).toBe("42P01");
    expect(d.message).toContain("intent_events");
    // La vista previa es de la sentencia, no del comentario que la precede.
    expect(d.preview.startsWith("CREATE TABLE")).toBe(true);
  });

  it("no vuelca la sentencia entera al registro", () => {
    const largo = `CREATE TABLE x (${"col TEXT, ".repeat(200)}fin TEXT);`;
    expect(describirOmision(errorPg("42P01"), largo).preview.length).toBeLessThanOrEqual(120);
  });
});
