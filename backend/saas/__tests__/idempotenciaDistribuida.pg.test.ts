/**
 * BLOQUE 4 · idempotencia entre instancias, contra PostgreSQL real.
 *
 * La versión en memoria deduplica mientras el proceso siga en pie y solo haya
 * uno. En cuanto hay dos instancias —o una que se reinicia entre dos entregas
 * del mismo webhook— deja de deduplicar, y `dispatchWebhookIn` vuelve a lanzar
 * los workflows del inquilino: correos, llamadas a integraciones, lo que el
 * flujo haga.
 *
 * **«Idempotente dentro de un proceso» no es idempotente.** El proveedor
 * reintenta contra el balanceador, no contra un proceso concreto.
 *
 * Estas pruebas van contra la base de verdad porque la garantía la da la base:
 * un `INSERT ... ON CONFLICT DO NOTHING` sobre una clave única. Con un doble de
 * base no se demostraría nada — un doble acepta cualquier SQL y no tiene
 * restricciones.
 *
 * Se salta sin `NELVYON_B4_DSN`.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
  claimWebhookInIdempotency,
  reclamarEntregaPersistente,
  resetWebhookInIdempotencyForTests,
  soltarEntregaPersistente,
} from "../webhookInIdempotency";

const DSN = process.env.NELVYON_B4_DSN;
const describeSiHayPg = DSN ? describe : describe.skip;

let pool: import("pg").Pool;

// Par de inquilinos propio de este fichero: los ficheros corren en paralelo
// contra la misma base y compartirlos hace que unos borren lo de otros.
const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaac01";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbc01";

/**
 * Una «instancia» de NELVYON: su propia conexión a la base.
 *
 * Dos de estas son dos procesos distintos a efectos de lo que se mide: no
 * comparten memoria, solo la base.
 */
function instancia() {
  return {
    query: async <T>(sql: string, params?: unknown[]): Promise<T[]> => {
      const r = await pool.query(sql, params as never[]);
      return r.rows as T[];
    },
  };
}

describeSiHayPg("BLOQUE 4 · idempotencia entre instancias", () => {
  beforeAll(async () => {
    const { Pool } = await import("pg");
    pool = new Pool({ connectionString: DSN, max: 8 });
  });

  afterAll(async () => {
    await pool?.end();
  });

  beforeEach(async () => {
    resetWebhookInIdempotencyForTests();
    await pool.query("DELETE FROM erp_idempotency_keys WHERE tenant_id = ANY($1::text[])", [[A, B]]);
  });

  it("EL CONTROL: la primera entrega se reclama", async () => {
    // Sin esto, una implementación que devolviera `false` siempre pasaría todas
    // las pruebas de duplicado y descartaría TODOS los webhooks en silencio,
    // que es peor que procesarlos dos veces.
    expect(await reclamarEntregaPersistente(instancia(), A, "stripe", "evt-1")).toBe(true);
  });

  it("la segunda entrega del mismo evento NO se reclama", async () => {
    const uno = instancia();
    expect(await reclamarEntregaPersistente(uno, A, "stripe", "evt-1")).toBe(true);
    expect(await reclamarEntregaPersistente(uno, A, "stripe", "evt-1")).toBe(false);
  });

  it("OTRA INSTANCIA tampoco la reclama", async () => {
    // El caso que la versión en memoria no cubre. Dos conexiones distintas,
    // ninguna memoria compartida: exactamente dos procesos de NELVYON detrás de
    // un balanceador.
    expect(await reclamarEntregaPersistente(instancia(), A, "stripe", "evt-1")).toBe(true);
    expect(await reclamarEntregaPersistente(instancia(), A, "stripe", "evt-1")).toBe(false);
  });

  it("tras REINICIAR el proceso sigue sin reclamarse", async () => {
    // Un despliegue, un reinicio por memoria, un contenedor que se recicla. La
    // memoria local desaparece; la base no.
    expect(await reclamarEntregaPersistente(instancia(), A, "stripe", "evt-1")).toBe(true);

    resetWebhookInIdempotencyForTests();   // se pierde toda la memoria local
    expect(claimWebhookInIdempotency(A, "stripe", "evt-1")).toBeNull(); // la memoria ya no sabe nada

    expect(await reclamarEntregaPersistente(instancia(), A, "stripe", "evt-1")).toBe(false);
  });

  it("OCHO entregas CONCURRENTES producen exactamente UNA reclamación", async () => {
    // La carrera real: el proveedor reintenta y varias instancias procesan a la
    // vez.
    const intentos = await Promise.all(
      Array.from({ length: 8 }, () => reclamarEntregaPersistente(instancia(), A, "stripe", "evt-carrera")),
    );
    expect(intentos.filter(Boolean)).toHaveLength(1);
  });

  it("las reclamaciones CONCEDIDAS coinciden con las filas creadas", async () => {
    // Esta es la que de verdad distingue el arreglo.
    //
    // La prueba de arriba, por si sola, NO caia al sustituir el
    // `INSERT ... ON CONFLICT` por un comprobar-y-despues-insertar: se
    // comprobo, y una mutacion que no cae no certifica nada. El motivo es que
    // la carrera puede no darse segun como el pool reparta las conexiones.
    //
    // La propiedad que no depende de la suerte del planificador es esta: la
    // funcion debe devolver `true` EXACTAMENTE tantas veces como filas creo. Un
    // comprobar-y-despues-insertar puede devolver `true` ocho veces y crear una
    // sola fila -el ON CONFLICT se traga las otras siete- y eso es justo la
    // mentira que importa: ocho procesos creyendo que les toca procesar.
    const CUANTAS = 12;
    const intentos = await Promise.all(
      Array.from({ length: CUANTAS }, () =>
        reclamarEntregaPersistente(instancia(), A, "stripe", "evt-coherencia"),
      ),
    );
    const concedidas = intentos.filter(Boolean).length;

    const filas = await pool.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM erp_idempotency_keys
        WHERE tenant_id = $1 AND idem_key = $2`,
      [A, "evt-coherencia"],
    );
    const creadas = Number(filas.rows[0]!.n);

    expect(creadas, "no se creo la fila").toBe(1);
    expect(
      concedidas,
      `${concedidas} procesos creyeron que les tocaba, pero solo hay ${creadas} fila(s)`,
    ).toBe(creadas);
  });

  it("EL AISLAMIENTO: la misma clave en otro inquilino SÍ se reclama", async () => {
    // Si la clave no llevara el inquilino, un evento de A bloquearía el evento
    // de B con el mismo identificador del proveedor — y B perdería su webhook.
    expect(await reclamarEntregaPersistente(instancia(), A, "stripe", "evt-1")).toBe(true);
    expect(await reclamarEntregaPersistente(instancia(), B, "stripe", "evt-1")).toBe(true);
  });

  it("la misma clave desde otra FUENTE sí se reclama", async () => {
    // Dos proveedores pueden usar el mismo formato de identificador. Colisionar
    // entre fuentes descartaría entregas legítimas.
    expect(await reclamarEntregaPersistente(instancia(), A, "stripe", "1001")).toBe(true);
    expect(await reclamarEntregaPersistente(instancia(), A, "paddle", "1001")).toBe(true);
  });

  it("soltar la reclamación deja que el REINTENTO vuelva a entrar", async () => {
    // Cuando el procesamiento falla, el reintento del proveedor tiene que poder
    // entrar. Sin soltar, la entrega quedaría marcada para siempre y el evento
    // se perdería sin que nadie lo notase.
    const uno = instancia();
    expect(await reclamarEntregaPersistente(uno, A, "stripe", "evt-1")).toBe(true);
    expect(await reclamarEntregaPersistente(uno, A, "stripe", "evt-1")).toBe(false);

    await soltarEntregaPersistente(uno, A, "stripe", "evt-1");
    expect(await reclamarEntregaPersistente(uno, A, "stripe", "evt-1")).toBe(true);
  });

  it("soltar la reclamación de A no toca la de B", async () => {
    await reclamarEntregaPersistente(instancia(), A, "stripe", "evt-1");
    await reclamarEntregaPersistente(instancia(), B, "stripe", "evt-1");

    await soltarEntregaPersistente(instancia(), A, "stripe", "evt-1");

    // A vuelve a poder entrar; B sigue reclamada.
    expect(await reclamarEntregaPersistente(instancia(), A, "stripe", "evt-1")).toBe(true);
    expect(await reclamarEntregaPersistente(instancia(), B, "stripe", "evt-1")).toBe(false);
  });

  it("una entrega SIN clave se deja pasar en vez de descartarse", async () => {
    // No todos los proveedores mandan identificador. Descartar en silencio lo
    // que no se puede deduplicar perdería eventos reales.
    expect(await reclamarEntregaPersistente(instancia(), A, "stripe", "   ")).toBe(true);
    expect(await reclamarEntregaPersistente(instancia(), A, "stripe", "")).toBe(true);
  });

  it("una clave larguísima no revienta ni colisiona con otra distinta", async () => {
    const larga = "x".repeat(400);
    const otra = `${"x".repeat(127)}DIFERENTE`;
    expect(await reclamarEntregaPersistente(instancia(), A, "stripe", larga)).toBe(true);
    expect(await reclamarEntregaPersistente(instancia(), A, "stripe", otra)).toBe(true);
  });
});
