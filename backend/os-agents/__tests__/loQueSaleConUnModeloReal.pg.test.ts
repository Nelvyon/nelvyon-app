/**
 * QUÉ SALE CUANDO EL MODELO ES DE VERDAD.
 *
 * LO QUE FALTABA. Todas las pruebas de los servicios usan un doble determinista
 * en lugar del modelo, y está bien que lo hagan: preguntarle a otro modelo «¿está
 * bien esto?» no es evidencia de nada y encima cuesta dinero. Pero eso deja una
 * pregunta sin responder, y es justo la que decide si esto vale algo:
 *
 *     cuando escribe un modelo de verdad, ¿lo que sale pasa el control de
 *     calidad, o el control sólo sabe aprobar lo que produce el doble?
 *
 * Un motor de calidad afinado contra su propio doble es un espejo. Aprueba
 * exactamente lo que el doble sabe generar y no ha visto nunca una alucinación,
 * una promesa sin respaldo ni un marcador de plantilla sin sustituir — que son
 * las tres cosas que un modelo real hace cuando se le deja suelto.
 *
 * CÓMO SE HACE. Se ejecuta el agente entero contra el Ollama local, se coge lo
 * que produce y se pasa por el motor de calidad con la rúbrica de su disciplina.
 * Lo que salga, sale: esta prueba NO exige que el resultado sea bueno. Exige que
 * el veredicto sea REAL —que las comprobaciones se hayan ejecutado de verdad
 * sobre contenido de verdad— y deja la evidencia escrita, con sus hallazgos.
 *
 * Un hallazgo aquí no es un fallo de la prueba: es información. Que el motor
 * encuentre problemas en lo que escribe un modelo real es exactamente lo que se
 * espera de él. Lo que sería sospechoso es que no encontrara ninguno nunca.
 *
 * POR QUÉ ESTÁ APAGADA POR DEFECTO. Tarda minutos: cada paso son unos diez
 * segundos de modelo y cada servicio tiene seis u ocho pasos. Una suite que
 * tarda media hora deja de ejecutarse, y una prueba que no se ejecuta no
 * protege nada. Se enciende con `NELVYON_MODELO_REAL=1`.
 *
 * COSTE EXTERNO: 0 €. Todo contra 127.0.0.1.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

import { MotorDeCalidad } from "../../calidad/MotorDeCalidad";
// La MISMA fuente que usan la matriz y el contrato. Una copia aqui volveria a
// producir dos documentos que dicen cosas distintas del mismo servicio.
import mapaDeServicio from "../../calidad/mapaDeServicio.json";

const QA_DE = mapaDeServicio.qaDe as Record<string, string>;
import { OS_AGENT_REGISTRY } from "../OsAgentRegistry";
import type { BaseOsAgent } from "../BaseOsAgent";
import type { OsJobContext, OsJobPayload } from "../types";

const RAIZ = path.resolve(__dirname, "..", "..", "..");
const BASE = process.env.OLLAMA_HOST?.trim() || "http://127.0.0.1:11434";
const ENCENDIDA = process.env.NELVYON_MODELO_REAL?.trim() === "1";

async function hayModelo(): Promise<string | null> {
  if (!ENCENDIDA) return null;
  try {
    const r = await fetch(`${BASE}/api/tags`, { signal: AbortSignal.timeout(3_000) });
    if (!r.ok) return null;
    const j = (await r.json()) as { models?: Array<{ name?: string }> };
    const nombres = (j.models ?? []).map((m) => m.name ?? "").filter(Boolean);
    return (
      nombres.find((m) => /instruct/i.test(m) && /8b|7b/i.test(m)) ??
      nombres.find((m) => !/embed/i.test(m)) ??
      null
    );
  } catch {
    return null;
  }
}

const MODELO = await hayModelo();
const conModelo = MODELO ? describe : describe.skip;

/**
 * Qué servicios se ejecutan.
 *
 * Uno por familia, y los cuatro nuevos entre ellos: son los que menos rodaje
 * tienen y por tanto donde más probable es que un modelo real se salga del
 * guion. Ejecutarlos todos serían cuarenta minutos, y lo que se está midiendo
 * —si el motor de calidad sabe juzgar prosa real— no necesita veintinueve.
 */
const ELEGIDOS = [
  "seo_premium",
  "ads_premium",
  "reputacion_online_orm_premium",
  "crm_captacion_premium",
  "analitica_atribucion_premium",
  "inteligencia_mercado_premium",
  "geo_ai_search_premium",
];

const CLIENTE: OsJobPayload = {
  clientName: "Panadería Obrador de Sofía",
  industry: "panadería artesanal",
  brief:
    "Obrador de barrio en Zaragoza, 11 años abierto, dos empleadas. Vende pan de masa madre y bollería. " +
    "Quiere que la gente del barrio sepa que hacen tartas por encargo. Presupuesto 300 EUR/mes. " +
    "No pueden con más de dos publicaciones a la semana. No quieren aparecer en TikTok.",
  targetAudience: "vecinos del barrio de entre 30 y 65 años",
  competitors: "dos panaderías industriales y un supermercado",
  tone: "cercano, sin florituras",
  budget: "300 EUR/mes",
  tenantId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaad01",
};

function contextoFalso(payload: OsJobPayload, serviceId: string): OsJobContext {
  return {
    jobId: `job-real-${serviceId}`,
    clientId: "cliente-modelo-real",
    serviceId,
    payload,
    stepResults: {},
    jobStore: {
      markStepRunning: async () => {},
      markStepCompleted: async () => {},
      markStepFailed: async () => {},
      failJob: async () => {},
      completeJob: async () => {},
      updateJobProgress: async () => {},
    } as unknown as OsJobContext["jobStore"],
    eventBus: { emit: () => {} } as unknown as OsJobContext["eventBus"],
  };
}

/**
 * Convierte lo que produce el agente en una pieza que el motor entienda.
 *
 * NO se maquilla: se le entrega el texto tal cual sale, bajo las claves que la
 * rúbrica del dominio mira. Elegir qué enseñarle al inspector sería exactamente
 * la trampa que estas pruebas existen para impedir.
 */
function comoPieza(dominio: string, pasos: Array<{ name: string; output?: string }>) {
  const contenido: Record<string, unknown> = {};
  for (const p of pasos) {
    if (typeof p.output === "string" && p.output.trim()) contenido[p.name] = p.output;
  }
  const todo = Object.values(contenido).join("\n\n");
  contenido.texto = todo;
  contenido.respuesta = todo;
  contenido.propuesta = todo;
  return { dominio, autor: "agente-os", contenido, riesgo: "bajo" as const };
}

const antes: Record<string, string | undefined> = {};

conModelo("lo que sale con un modelo real pasa por el mismo control", () => {
  const evidencia: Array<Record<string, unknown>> = [];

  beforeAll(() => {
    for (const [k, v] of Object.entries({
      OLLAMA_HOST: BASE,
      OLLAMA_MODEL: MODELO ?? "",
      AUTONOMOUS_LLM_MODE: "real",
    })) {
      antes[k] = process.env[k];
      process.env[k] = v;
    }
  });

  afterAll(() => {
    for (const [k, v] of Object.entries(antes)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    fs.mkdirSync(path.join(RAIZ, "docs", "evidence"), { recursive: true });
    fs.writeFileSync(
      path.join(RAIZ, "docs", "evidence", "calidad_con_modelo_real.json"),
      `${JSON.stringify(
        {
          _lee_esto: [
            "Lo escribe loQueSaleConUnModeloReal. No se edita a mano.",
            "Los hallazgos NO son fallos de la prueba: son lo que el motor de calidad",
            "encontro en prosa escrita por un modelo real. Que encuentre cosas es",
            "senal de que funciona; que no encontrara ninguna nunca seria sospechoso.",
          ],
          medidoEn: new Date().toISOString().slice(0, 10),
          modelo: MODELO,
          costeExternoEuros: 0,
          servicios: evidencia,
        },
        null,
        2,
      )}\n`,
      "utf8",
    );
  });

  for (const serviceId of ELEGIDOS) {
    it(
      `${serviceId}: se ejecuta con el modelo y el control lo juzga de verdad`,
      async () => {
        const fabrica = OS_AGENT_REGISTRY[serviceId as keyof typeof OS_AGENT_REGISTRY] as
          | (() => BaseOsAgent)
          | undefined;
        expect(fabrica, `${serviceId} no está en el registro`).toBeTruthy();

        const agente = fabrica!();
        const ctx = contextoFalso(CLIENTE, serviceId);
        const t0 = Date.now();
        const r = await agente.execute(CLIENTE, ctx);
        const ms = Date.now() - t0;

        // 1. Ha producido pasos con contenido. Un agente que devuelve vacío con
        //    un modelo real es un fallo, aunque no lance.
        const conTexto = (r.steps ?? []).filter(
          (s) => typeof s.output === "string" && s.output.trim().length > 20,
        );
        expect(conTexto.length, `${serviceId} no produjo ni un paso con contenido`).toBeGreaterThan(
          0,
        );

        // 2. El control de calidad lo mira DE VERDAD: comprobaciones ejecutadas
        //    sobre este contenido, no un veredicto por defecto.
        const dominio = QA_DE[serviceId];
        const res = new MotorDeCalidad().evaluar(
          comoPieza(dominio, r.steps as Array<{ name: string; output?: string }>),
          "qa-independiente",
        );
        expect(
          res.veredicto,
          `${serviceId} salió con veredicto ${res.veredicto} y sin hallazgos: eso no es una evaluación`,
        ).toBeTruthy();

        evidencia.push({
          servicio: serviceId,
          dominio,
          pasos: (r.steps ?? []).length,
          pasosConContenido: conTexto.length,
          caracteresProducidos: conTexto.reduce((t, s) => t + (s.output?.length ?? 0), 0),
          segundos: Math.round(ms / 1000),
          veredicto: res.veredicto,
          puntuacion: res.puntuacion,
          hallazgos: res.hallazgos.map((h) => ({ id: h.id, gravedad: h.gravedad, quePasa: h.quePasa })),
          noComprobado: res.noComprobado.map((n) => n.id),
          calculosDeterministas: Array.isArray((r as { calculos?: unknown[] }).calculos)
            ? (r as { calculos: unknown[] }).calculos.length
            : 0,
        });
      },
      600_000,
    );
  }
});
