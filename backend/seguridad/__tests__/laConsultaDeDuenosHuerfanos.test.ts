/**
 * LA CONSULTA QUE BUSCA DUEÑOS SIN SU WORKSPACE PREGUNTA LO CORRECTO.
 *
 * POR QUÉ SE PRUEBA UN SQL. Porque es la parte que puede equivocarse en
 * silencio. Una consulta mal escrita no da error: devuelve «ninguno» tan
 * tranquila, y entonces el informe dice que todo está bien sin haber mirado.
 *
 * Son tres cosas las que tienen que estar, y cada una tiene su forma de fallar:
 *
 *   1. CORRELACIONAR POR `workspace_id` **Y** POR `user_id`. Si sólo se
 *      correlaciona por workspace, cualquier workspace con un miembro
 *      cualquiera pasaría por bueno aunque su dueño no esté entre ellos — que
 *      es exactamente el caso que se busca.
 *
 *   2. EXIGIR `status = 'active'`. Una pertenencia `pending` o `inactive` no da
 *      acceso: `nelvyon_user_in_workspace()` filtra por activa. Contarla como
 *      buena escondería al dueño afectado.
 *
 *   3. SER UN `NOT EXISTS`, no un `LEFT JOIN … IS NULL` mal cerrado ni un
 *      `NOT IN` —que con un solo `NULL` en la subconsulta devuelve cero filas
 *      siempre, y en silencio—.
 *
 * NO SE COMPRUEBA CONTRA POSTGRESQL: eso ya lo hace el script cuando se ejecuta.
 * Esto fija la FORMA de la pregunta, que es lo que se rompe al editarla.
 *
 * COSTE EXTERNO: 0 €. No abre ninguna conexión.
 */
import { describe, expect, it } from "vitest";

import { SQL_DUENOS_SIN_PERTENENCIA } from "../../../scripts/duenos-sin-su-workspace.mjs";

/** Sin saltos ni espacios de más, para poder buscar frases enteras. */
const sql = SQL_DUENOS_SIN_PERTENENCIA.replace(/\s+/g, " ").trim();

describe("la consulta correlaciona por las dos claves", () => {
  it("LA REGLA: compara el workspace Y el usuario dueño", () => {
    expect(sql).toMatch(/m\.workspace_id = w\.id/);
    expect(sql, "sin esto, un workspace con cualquier miembro pasaría por bueno").toMatch(
      /m\.user_id = w\.user_id/,
    );
  });

  it("exige que la pertenencia esté activa", () => {
    // Una `pending` no da acceso; contarla como buena escondería al afectado.
    expect(sql).toMatch(/m\.status = 'active'/);
  });

  it("usa NOT EXISTS y no NOT IN", () => {
    // `NOT IN` con un solo NULL en la subconsulta devuelve cero filas SIEMPRE,
    // y sin dar ningún error. Es la forma más silenciosa de romper esto.
    expect(sql).toMatch(/NOT EXISTS/i);
    expect(sql).not.toMatch(/NOT IN/i);
  });
});

describe("la consulta trae lo necesario para decidir", () => {
  it("devuelve el id, el estado, la fecha y cuántos miembros hay", () => {
    // Sin la fecha no se puede saber si el workspace es anterior al arreglo del
    // camino de código —que es lo que distingue «fila heredada» de «el defecto
    // sigue vivo»—.
    for (const campo of ["w.id", "w.status", "w.created_at", "miembros"]) {
      expect(sql, `falta ${campo}`).toContain(campo);
    }
  });

  it("EL CONTROL: no es una consulta que devuelva todos los workspaces", () => {
    // Una consulta sin `WHERE` devolvería los tres y el informe diría que los
    // tres están rotos. Falso positivo total, y del que más asusta.
    expect(sql).toMatch(/WHERE/i);
  });
});
