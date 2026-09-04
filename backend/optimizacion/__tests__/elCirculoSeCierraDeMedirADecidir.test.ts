/**
 * El círculo se cierra: de «cómo va» a «y por eso hacemos esto».
 *
 * ── EL HUECO QUE CIERRA ─────────────────────────────────────────────────────
 *
 * `MotorDeResultados` dice si algo mejoró. `MotorDeOptimizacion` dice qué hacer
 * con esa respuesta. Los dos construidos, probados y documentados.
 *
 * Y sin conocerse: `MotorDeOptimizacion` sólo lo importaba su propia vecina de
 * carpeta, y a `MotorDeResultados` no lo importaba nadie en todo el repositorio.
 * El bucle estaba escrito en dos mitades que nunca se tocaron.
 *
 * ── LO QUE MÁS SE PRUEBA AQUÍ ───────────────────────────────────────────────
 *
 * Que la juntura NO fabrique certeza. Es la tentación obvia al unir dos motores:
 * rellenar lo que falta para que salga una decisión bonita. Aquí lo que falta se
 * declara como falta, y el motor responde «no sé» — que es la respuesta correcta
 * y la que ninguno de los dos motores estaba dispuesto a falsear por su cuenta.
 *
 * COSTE EXTERNO: 0 EUR.
 */
import { describe, expect, it } from "vitest";

import { queHacerAhora, situacionDesdeVeredicto } from "../queHacerAhora";
import type { Veredicto } from "../../resultados/MotorDeResultados";

const medido = (lineaBase: number, actual: number, mejora: number): Veredicto => ({
  estado: "medido",
  lineaBase,
  actual,
  mejoraPorcentual: mejora,
  progresoHaciaObjetivo: null,
  cumplido: false,
  accionesEnMedio: 1,
  atribucionMaxima: "coincidencia_temporal",
});

describe("de medir a decidir", () => {
  // ── LA JUNTURA NO INVENTA ─────────────────────────────────────────────────

  it("una métrica de RATIO no tiene muestra conocida, y se dice", () => {
    // Un 3 % puede venir de 3 conversiones sobre 100 o de 3.000 sobre 100.000.
    // Fingir una muestra para sacar una decisión bonita es exactamente el fallo
    // que los dos motores están escritos para evitar.
    const s = situacionDesdeVeredicto("seo_premium", "tasa_conversion", medido(2, 3, 50), "2026-09-04");
    expect(s.lineaBase!.muestra).toBe(0);
    expect(s.historial[0].muestra).toBe(0);
  });

  it("una métrica de RECUENTO sí tiene muestra: el valor ES la observación", () => {
    const s = situacionDesdeVeredicto("seo_premium", "leads", medido(40, 60, 50), "2026-09-04");
    expect(s.lineaBase!.muestra).toBe(40);
    expect(s.historial[0].muestra).toBe(60);
  });

  it("sin medición no hay línea base, y por tanto no hay nada que decidir", () => {
    const sin: Veredicto = {
      estado: "desconocido",
      motivo: "sin_linea_base",
      explicacion: "no hay nada anterior con lo que comparar",
    };
    const s = situacionDesdeVeredicto("seo_premium", "leads", sin, "2026-09-04");
    expect(s.lineaBase).toBeNull();
    expect(s.historial).toHaveLength(0);
  });

  // ── EL BUCLE ENTERO ───────────────────────────────────────────────────────

  it("LA REGLA: un objetivo medido produce una decisión de verdad", async () => {
    // Muestra por encima del mínimo que exige la política de `seo_premium`
    // —200 sesiones orgánicas—. Con menos, el motor responde `esperar_datos` y
    // tiene razón: cualquier diferencia sería ruido.
    const db = baseCon({
      objetivos: [{ id: "obj-1", metrica: "sesiones", direccion: "subir" }],
      lineaBase: 400,
      actual: 620,
    });

    const r = await queHacerAhora(db, { workspaceId: 7, clientId: CLI, serviceId: "seo_premium" });

    expect(r).toHaveLength(1);
    expect(r[0].metrica).toBe("sesiones");
    // Sin esto la prueba pasaria en vacio: si el doble no encajara con las
    // consultas reales del motor, el veredicto seria `desconocido` y la
    // decision seguiria siendo "truthy".
    expect(r[0].veredicto.estado, "el doble no encaja con las consultas reales").toBe("medido");
    expect(r[0].decision.queHacer).not.toBe("esperar_datos");
    expect(r[0].decision.queHacer, "midió y no decidió nada").toBeTruthy();
    expect(r[0].decision.porQue, "una decisión sin porqué está adivinada").toBeTruthy();
  });

  it("y la decisión NO se ejecuta: sólo se propone", async () => {
    // Un módulo que decide Y ejecuta es un módulo que no se puede leer sin
    // miedo. Aquí lo único que sale es una recomendación.
    const db = baseCon({
      objetivos: [{ id: "obj-1", metrica: "leads", direccion: "subir" }],
      lineaBase: 40,
      actual: 60,
    });

    const r = await queHacerAhora(db, { workspaceId: 7, clientId: CLI, serviceId: "seo_premium" });

    expect(Object.keys(r[0])).toEqual(["objetivoId", "metrica", "veredicto", "decision"]);
  });

  it("sin objetivos declarados no se inventa ninguno", async () => {
    const db = baseCon({ objetivos: [], lineaBase: null, actual: null });
    const r = await queHacerAhora(db, { workspaceId: 7, clientId: CLI, serviceId: "seo_premium" });
    expect(r).toHaveLength(0);
  });

  it("un objetivo sin línea base devuelve «no se sabe», no un cero", async () => {
    // Un motor que siempre da un veredicto acaba inventándolo, y un informe con
    // cifras inventadas es peor que uno que dice «todavía no se puede saber».
    const db = baseCon({
      objetivos: [{ id: "obj-1", metrica: "leads", direccion: "subir" }],
      lineaBase: null,
      actual: 60,
    });

    const r = await queHacerAhora(db, { workspaceId: 7, clientId: CLI, serviceId: "seo_premium" });

    expect(r[0].veredicto.estado).toBe("desconocido");
    expect(r[0].decision.queHacer).toBe("esperar_datos");
  });
});

const CLI = "3f1a2b4c-5d6e-4f70-8a91-b2c3d4e5f607";

/**
 * Base falsa que reconoce por forma las consultas del motor de resultados.
 * Responder por forma y no por orden es lo que permite que estas pruebas
 * sobrevivan a que el motor añada una consulta.
 */
function baseCon(datos: {
  objetivos: Array<{ id: string; metrica: string; direccion: string }>;
  lineaBase: number | null;
  actual: number | null;
}) {
  return {
    async query<T>(sql: string): Promise<T[]> {
      const s = sql.replace(/\s+/g, " ");
      if (s.includes("FROM os_objetivos")) {
        return datos.objetivos.map((o) => ({
          id: o.id, metrica: o.metrica, direccion: o.direccion,
          valor_objetivo: null, unidad: null, plazo: null, estado: "activo",
        })) as T[];
      }
      if (s.includes("FROM os_mediciones")) {
        const filas: unknown[] = [];
        if (datos.lineaBase !== null) {
          filas.push({
            valor: String(datos.lineaBase), es_linea_base: true, fuente: "google_analytics",
            hasta: "2026-08-01T00:00:00Z", desde: "2026-07-01T00:00:00Z", metrica: "leads",
          });
        }
        if (datos.actual !== null) {
          filas.push({
            valor: String(datos.actual), es_linea_base: false, fuente: "google_analytics",
            hasta: "2026-09-01T00:00:00Z", desde: "2026-08-01T00:00:00Z", metrica: "leads",
          });
        }
        return filas as T[];
      }
      if (s.includes("FROM os_acciones")) return [{ n: "1" }] as T[];
      return [] as T[];
    },
  };
}
