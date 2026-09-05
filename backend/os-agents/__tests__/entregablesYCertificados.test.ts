/**
 * BLOQUE 3 · entregables y certificación por sector.
 *
 * Dos garantías sobre lo que sale hacia el cliente:
 *
 *   - **La marca de origen**: todo lo que genera NELVYON queda marcado como
 *     generado por NELVYON. No es publicidad: es que un texto de IA que circula
 *     sin marca acaba citándose como si lo hubiera escrito una persona.
 *   - **La certificación de sector**: un sector se marca `passed` solo si su
 *     esquema de encargo existe. Marcarlo sin comprobarlo convertiría el panel
 *     de certificación en una lista de deseos.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { embedJsonWatermark, embedTextWatermark, watermarkOsJobResult } from "../watermark";
import { OsSectorCertificationService } from "../OsSectorCertificationService";

const ENTORNO = { ...process.env };

afterEach(() => {
  process.env = { ...ENTORNO };
});

describe("BLOQUE 3 · marca de origen", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "production");
  });

  it("EL CONTROL: un texto largo en producción se marca", () => {
    // Sin esto, una función que no marcara nunca pasaría las pruebas de
    // idempotencia de abajo sin marcar jamás.
    const t = embedTextWatermark("x".repeat(200));
    expect(t).toContain("NELVYON");
  });

  it("marcar dos veces no duplica la firma", () => {
    // Un entregable que pasa por dos servicios acabaría con la firma repetida,
    // y eso se ve como un error de montaje en el documento del cliente.
    const una = embedTextWatermark("x".repeat(200));
    const dos = embedTextWatermark(una);
    expect(dos).toBe(una);
    expect(dos.split("Generado por NELVYON")).toHaveLength(2);
  });

  it("un texto corto no se marca: la firma sería más larga que el contenido", () => {
    expect(embedTextWatermark("hola")).toBe("hola");
  });

  it("fuera de producción no se marca, para no ensuciar las pruebas", () => {
    vi.stubEnv("NODE_ENV", "test");
    const t = "x".repeat(200);
    expect(embedTextWatermark(t)).toBe(t);
  });

  it("el JSON lleva la marca en la raíz, sin tocar el contenido", () => {
    const marcado = embedJsonWatermark({ titulo: "Informe", secciones: [1, 2] }) as Record<
      string,
      unknown
    >;
    expect(marcado._nelvyon_generated).toBe(true);
    expect(marcado.titulo).toBe("Informe");
    expect(marcado.secciones).toEqual([1, 2]);
  });

  it("marcar un JSON dos veces no lo cambia", () => {
    const una = embedJsonWatermark({ a: 1 });
    expect(embedJsonWatermark(una)).toEqual(una);
  });

  it("un array o un nulo se devuelven intactos", () => {
    // Marcar la raíz de un array rompería su forma y el consumidor fallaría al
    // recorrerlo.
    expect(embedJsonWatermark([1, 2])).toEqual([1, 2]);
    expect(embedJsonWatermark(null)).toBeNull();
  });

  it("el resultado de un trabajo marca el CONTENIDO de cada paso", () => {
    // La marca va en la salida de los pasos, no en el envoltorio. Es lo
    // correcto: el envoltorio se queda en la base, y lo que circula -y lo que
    // alguien podria citar como escrito por una persona- es el texto.
    const r = watermarkOsJobResult({
      serviceId: "seo_premium",
      steps: [{ name: "auditoria", data: { output: "y".repeat(200) } }],
    } as never);
    expect(JSON.stringify(r)).toContain("NELVYON");
  });

  it("un resultado sin pasos no revienta", () => {
    const r = watermarkOsJobResult({ serviceId: "seo_premium", steps: [] } as never);
    expect(r.steps).toEqual([]);
  });
});

describe("BLOQUE 3 · certificación por sector", () => {
  function servicio(filas: Array<Record<string, unknown>> = []) {
    const escrituras: Array<{ sql: string; params: unknown[] }> = [];
    const db = {
      query: async (sql: string, params: unknown[] = []) => {
        escrituras.push({ sql, params });
        return { rows: filas } as never;
      },
    } as never;
    return { svc: new OsSectorCertificationService(db), escrituras };
  }

  it("EL CONTROL: se puede escribir una certificación", async () => {
    const { svc, escrituras } = servicio();
    await svc.upsertCertification({
      sectorServiceId: "restaurantes_os",
      status: "passed",
      seedPresent: true,
      agentPresent: true,
      envatoCoverage: 1,
      failureReason: null,
      certifiedAt: new Date(0).toISOString(),
    } as never);
    expect(escrituras.length).toBeGreaterThan(0);
  });

  it("la escritura es idempotente: repetirla no duplica la fila", async () => {
    // Sin `ON CONFLICT`, cada pasada del lote crearía una fila más y el panel
    // contaría el mismo sector varias veces como si fueran sectores distintos.
    const { svc, escrituras } = servicio();
    await svc.upsertCertification({
      sectorServiceId: "restaurantes_os",
      status: "passed",
      seedPresent: true,
      agentPresent: true,
      envatoCoverage: 1,
      failureReason: null,
      certifiedAt: new Date(0).toISOString(),
    } as never);
    expect(escrituras[0]!.sql).toMatch(/ON CONFLICT/i);
    expect(escrituras[0]!.sql).toMatch(/sector_service_id/);
  });

  it("un sector fallido guarda el MOTIVO, no solo el estado", async () => {
    // «Falló» sin decir por qué obliga a reproducirlo para saber qué pasó, y
    // nadie reproduce doscientos sectores.
    const { svc, escrituras } = servicio();
    await svc.upsertCertification({
      sectorServiceId: "roto_os",
      status: "failed",
      seedPresent: false,
      agentPresent: true,
      envatoCoverage: 0,
      failureReason: "Intake schema missing or empty",
      certifiedAt: null,
    } as never);
    expect(JSON.stringify(escrituras[0]!.params)).toContain("Intake schema missing");
  });

  it("un sector fallido no lleva fecha de certificación", async () => {
    // Una fecha en algo que no pasó lo hace parecer certificado en cualquier
    // listado ordenado por fecha.
    const { svc, escrituras } = servicio();
    await svc.upsertCertification({
      sectorServiceId: "roto_os",
      status: "failed",
      seedPresent: false,
      agentPresent: true,
      envatoCoverage: 0,
      failureReason: "sin esquema",
      certifiedAt: null,
    } as never);
    expect(escrituras[0]!.params).toContain(null);
  });
});
