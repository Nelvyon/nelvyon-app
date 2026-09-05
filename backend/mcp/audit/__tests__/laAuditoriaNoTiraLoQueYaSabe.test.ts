/**
 * La auditoria guarda lo que ya tenia en la mano, y no confunde gratis con no se sabe.
 *
 * ── QUE PASABA ──────────────────────────────────────────────────────────────
 *
 * `McpAuditRecord` llega con agente, usuario, decision, riesgo, identificador de
 * aprobacion y las dos trazas. `persist` escribia SIETE campos y tiraba el
 * resto. No es que faltara la informacion: es que no se escribia.
 *
 * Sin eso no se puede reconstruir una ejecucion de punta a punta. Se podia
 * responder «que herramienta y con que resultado», pero no «que agente, con que
 * permiso, en que intento, con que aprobacion y a que coste».
 *
 * ── LA DISTINCION DEL COSTE ─────────────────────────────────────────────────
 *
 * `null` es NO SE SABE. `0` es que fue gratis. Son afirmaciones distintas, y
 * convertir la primera en la segunda es inventarse que algo no costo nada. Hay
 * una prueba dedicada porque es exactamente el atajo que se toma sin pensar.
 *
 * COSTE EXTERNO: 0 EUR. La base es un doble que registra lo que se le pide.
 */
import { describe, expect, it } from "vitest";

import { McpAuditService } from "../McpAuditService";
import { consultaFalsa } from "../../../db/__tests__/consultaFalsa";
import type { McpAuditRecord } from "../../types";

const REGISTRO: McpAuditRecord = {
  toolCallId: "call-1",
  tenantId: "t1",
  userId: "u1",
  agentId: "social_instagram",
  toolName: "docs_read",
  risk: "low",
  decision: "allowed",
  durationMs: 42,
  ok: true,
  requestId: "req-1",
  traceId: "trace-1",
  argsHash: "abc123",
  approvalId: "apr-9",
  attempt: 3,
};

/** Los parametros con los que se llamo al INSERT. */
async function parametrosDe(registro: McpAuditRecord): Promise<unknown[]> {
  const query = consultaFalsa([[]]);
  await new McpAuditService({ query } as never).persist(registro);
  const llamada = query.mock.calls.find((c) => /INSERT INTO saas_mcp_tool_audit/i.test(String(c[0])));
  expect(llamada, "no se escribio ninguna fila de auditoria").toBeDefined();
  return llamada![1] as unknown[];
}

describe("no se tira lo que ya se sabe", () => {
  it("EL CONTROL: se escribe una fila", async () => {
    // Sin este control, un `persist` que no escribiera nada pasaria todas las
    // comprobaciones de abajo por ausencia.
    const params = await parametrosDe(REGISTRO);
    expect(params.length).toBeGreaterThan(7);
  });

  it("el agente, el usuario y la decision llegan a la fila", async () => {
    const params = await parametrosDe(REGISTRO);
    expect(params, "no se guarda que agente lo hizo").toContain("social_instagram");
    expect(params, "no se guarda quien lo pidio").toContain("u1");
    expect(params, "no se guarda la decision de politica").toContain("allowed");
  });

  it("las trazas llegan, que es por donde se reconstruye", async () => {
    const params = await parametrosDe(REGISTRO);
    expect(params, "sin traza no se puede reconstruir la ejecucion").toContain("trace-1");
    expect(params).toContain("req-1");
  });

  it("la aprobacion llega: hay que poder decir con permiso de quien", async () => {
    const params = await parametrosDe(REGISTRO);
    expect(params).toContain("apr-9");
  });

  it("el numero de intento llega", async () => {
    // Sin esto, algo que funciono a la tercera y algo que funciono a la primera
    // dejan exactamente la misma fila.
    const params = await parametrosDe(REGISTRO);
    expect(params, "no se distingue un reintento de una ejecucion limpia").toContain(3);
  });
});

describe("gratis y no se sabe no son lo mismo", () => {
  it("sin coste conocido se guarda NULL, no cero", async () => {
    // El atajo que se toma sin pensar. Un cero afirma que fue gratis; un NULL
    // dice la verdad, que es que nadie lo midio.
    const params = await parametrosDe({ ...REGISTRO, costEstimateUsd: undefined });
    expect(params[params.length - 1], "un coste desconocido se guardo como 0").toBeNull();
  });

  it("un coste de CERO se guarda como cero, no como desconocido", async () => {
    // La otra mitad: si un 0 legitimo se convirtiera en NULL, se perderia la
    // afirmacion de que algo salio gratis de verdad.
    const params = await parametrosDe({ ...REGISTRO, costEstimateUsd: 0 });
    expect(params[params.length - 1], "un cero real se guardo como desconocido").toBe(0);
  });

  it("un coste conocido se guarda tal cual", async () => {
    const params = await parametrosDe({ ...REGISTRO, costEstimateUsd: 0.0125 });
    expect(params[params.length - 1]).toBe(0.0125);
  });
});
