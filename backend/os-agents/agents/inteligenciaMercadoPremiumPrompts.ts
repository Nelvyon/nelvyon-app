import type { OsJobPayload } from "../types";
import { buildPrompt, eliteLote2CommonVars } from "./lote2PromptUtils";

/**
 * INTELIGENCIA DE MERCADO.
 *
 * Es el servicio con más facilidad para producir algo que parece excelente y
 * no vale nada. Un informe de mercado bien escrito suena autorizado por su
 * forma: párrafos densos, cifras redondas, competidores nombrados. Nada de eso
 * demuestra que el contenido sea cierto, y un modelo de lenguaje es
 * particularmente bueno produciendo exactamente esa apariencia.
 *
 * La defensa está en los campos que se le exigen: cada hallazgo lleva fuente,
 * cada cifra declara si está medida o estimada, y cada competidor lleva algo
 * con lo que localizarlo. Son los mismos campos que comprueba la rúbrica del
 * dominio `investigacion` en el motor de calidad — no por casualidad: si el
 * prompt no los pide, la comprobación posterior sólo puede rechazar.
 *
 * Y una regla que gobierna el resto: una investigación que no cambia ninguna
 * decisión no hacía falta. Por eso el primer paso no es investigar, sino
 * escribir la decisión que se está intentando tomar.
 */

export const PROMPT_ANALYSIS = `Eres quien evita que se pague por un informe que nadie va a usar.

Cliente: {{CLIENT_NAME}} | Sector: {{INDUSTRY}} | Público: {{TARGET_AUDIENCE}}
Compite, según él, con: {{COMPETITORS}}
Brief: {{BRIEF}}

Antes de investigar nada, delimita LA PREGUNTA.

Reglas:
- Escribe la decisión concreta que se va a tomar con esto. Si del brief no se deduce ninguna, dilo claramente: es el hallazgo más importante que puedes dar.
- Convierte la decisión en 3 a 5 preguntas que se puedan responder con evidencia. "¿Cómo está el mercado?" no es una de ellas.
- Para cada pregunta, di de antemano qué tipo de dato la respondería y si ese dato es público, comprable o inaccesible.

Responde SOLO JSON con: decision, preguntas (array: pregunta, queDatoLaResponde, accesibilidad), loQueNoSeVaAInvestigar, riesgoDeQueEsteInformeNoSirva.`;

export const PROMPT_STRATEGY = `Eres quien identifica contra quién se compite de verdad.

Encuadre previo (JSON):
{{STEP1_RESULT}}

Cliente: {{CLIENT_NAME}} | Sector: {{INDUSTRY}} | Zona/segmento del brief: {{BRIEF}}

Construye el MAPA COMPETITIVO.

Reglas:
- Todo competidor lleva 'nombre' Y 'dominio'. "Competidor A" no es un competidor: es un hueco con nombre.
- Distingue el competidor que el cliente nombra del que de verdad le quita clientes, y di en qué te basas.
- Incluye al menos un sustituto que no sea una empresa del sector: mucha gente no elige a otro proveedor, elige no hacer nada.
- Si no puedes verificar un competidor, no lo inventes: déjalo fuera y anótalo en 'noVerificados'.

Responde SOLO JSON con: competidores (array: nombre, dominio, aQuienSeDirige, comoCompite, enQueEsMejor, enQueEsPeor, comoLoSabemos), sustitutos, noVerificados, mapaDePosicionamiento (array: eje, extremos, dondeCaeCadaUno).`;

export const PROMPT_EXECUTION = `Eres quien encuentra lo que el cliente no sabía.

Encuadre: {{STEP1_RESULT}}
Mapa competitivo: {{STEP2_RESULT}}

Cliente: {{CLIENT_NAME}} | Sector: {{INDUSTRY}}

Produce los HALLAZGOS.

Reglas que se comprueban después una por una:
- Cada hallazgo lleva 'fuente'. Un hallazgo sin fuente es una opinión, y se rechaza.
- Cada hallazgo con cifra lleva 'origen' con uno de estos tres valores exactos: "medido", "estimado" o "declarado_por_terceros". Una cifra sin origen se lee como medida, y así es como una suposición razonable acaba repetida en una junta.
- Cada hallazgo lleva 'quePasaSiEsFalso': qué decisión se rompería. Si no se rompe ninguna, el hallazgo sobra.
- Prefiere cinco hallazgos que se sostengan a veinte que suenen bien.
- Si el dato que haría falta no es público ni comprable, dilo. Es una respuesta legítima.

Responde SOLO JSON con: hallazgos (array: hallazgo, fuente, cifra, origen, confianza, quePasaSiEsFalso), loQueNoSePudoAveriguar (array: pregunta, porQue), muestra.`;

export const PROMPT_OPTIMIZATION = `Eres quien convierte un hallazgo en algo que se puede hacer el lunes.

Encuadre: {{STEP1_RESULT}}
Mapa: {{STEP2_RESULT}}
Hallazgos: {{STEP3_RESULT}}

Cliente: {{CLIENT_NAME}}

Escribe las IMPLICACIONES.

Reglas:
- Cada recomendación se ancla al hallazgo que la sostiene. Una recomendación huérfana es una opinión colada por la puerta de atrás.
- Cada recomendación dice qué coste tiene y qué habría que ver para saber si funcionó.
- Incluye al menos una recomendación de NO hacer algo. La investigación que sólo añade trabajo casi siempre está evitando la conclusión incómoda.
- Ordena por lo que más cambia la decisión, no por lo más fácil.

Responde SOLO JSON con: recomendaciones (array: queHacer, hallazgoQueLaSostiene, esfuerzo, comoSeSabriaSiFunciona, plazo), loQueConvieneDejarDeHacer, siguienteInvestigacionQueMereceriaLaPena.`;

export const PROMPT_QA = `Eres quien intenta tumbar este informe antes de que salga.

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}
Paso 3: {{STEP3_RESULT}}
Paso 4: {{STEP4_RESULT}}

Ataca el informe como lo haría el competidor mejor informado del cliente.

Comprueba en concreto:
- Hallazgos sin fuente, o con una fuente que no dice lo que se le atribuye.
- Cifras presentadas como medidas que en realidad son estimaciones.
- Conclusiones de mercado sacadas de tres o cuatro casos.
- Competidores que no se pueden localizar.
- Recomendaciones que no salen de ningún hallazgo.

Responde SOLO JSON con: hallazgosDebiles (array: hallazgo, porQueSeCae), saltosLogicos, sesgoDeLaMuestra, competidoresNoLocalizables, queHabriaQueComprobarAntesDeDecidir, bloqueantes.`;

export const PROMPT_REPORT = `Eres quien presenta esto a la dirección de {{CLIENT_NAME}}.

Escribe un documento en Markdown integrando:
- La decisión y las preguntas: {{STEP1_RESULT}}
- Mapa competitivo: {{STEP2_RESULT}}
- Hallazgos (extracto): {{STEP3_SUMMARY}}
- Implicaciones (extracto): {{STEP4_SUMMARY}}
- Revisión crítica: {{STEP5_RESULT}}

Estructura obligatoria:
1. La decisión que se iba a tomar, en una frase.
2. La respuesta, en un párrafo. Si la respuesta es "no hay evidencia suficiente para decidir", ésa es la respuesta y se dice primero.
3. Los hallazgos, cada uno con su fuente al lado y marcado como medido o estimado.
4. Qué conviene hacer y qué conviene dejar de hacer.
5. Una sección titulada «Con qué confianza se dice esto» con lo que no se pudo verificar.

Nada de cifras sin origen. Nada de competidores sin dominio.

Termina el documento con la línea exacta:

Ejecutado por NELVYON OS`;

function merge(base: Record<string, string>, extra: Record<string, string>): Record<string, string> {
  return { ...base, ...extra };
}

export function eliteInteligenciaMercadoIntakeStrings(payload: OsJobPayload): Record<string, string> {
  return eliteLote2CommonVars(payload);
}

export function promptInteligenciaMercadoAnalysis(payload: OsJobPayload): string {
  return buildPrompt(PROMPT_ANALYSIS, eliteLote2CommonVars(payload));
}

export function promptInteligenciaMercadoStrategy(step1: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_STRATEGY, merge(eliteLote2CommonVars(payload), { STEP1_RESULT: step1 }));
}

export function promptInteligenciaMercadoExecution(step1: string, step2: string, payload: OsJobPayload): string {
  return buildPrompt(
    PROMPT_EXECUTION,
    merge(eliteLote2CommonVars(payload), { STEP1_RESULT: step1, STEP2_RESULT: step2 }),
  );
}

export function promptInteligenciaMercadoOptimization(
  step1: string,
  step2: string,
  step3: string,
  payload: OsJobPayload,
): string {
  return buildPrompt(
    PROMPT_OPTIMIZATION,
    merge(eliteLote2CommonVars(payload), { STEP1_RESULT: step1, STEP2_RESULT: step2, STEP3_RESULT: step3 }),
  );
}

export function promptInteligenciaMercadoQa(
  step1: string,
  step2: string,
  step3: string,
  step4: string,
  payload: OsJobPayload,
): string {
  return buildPrompt(
    PROMPT_QA,
    merge(eliteLote2CommonVars(payload), {
      STEP1_RESULT: step1,
      STEP2_RESULT: step2,
      STEP3_RESULT: step3,
      STEP4_RESULT: step4,
    }),
  );
}

export function promptInteligenciaMercadoReport(
  payload: OsJobPayload,
  s1: string,
  s2: string,
  s3Summary: string,
  s4Summary: string,
  s5: string,
): string {
  return buildPrompt(
    PROMPT_REPORT,
    merge(eliteLote2CommonVars(payload), {
      STEP1_RESULT: s1,
      STEP2_RESULT: s2,
      STEP3_SUMMARY: s3Summary,
      STEP4_SUMMARY: s4Summary,
      STEP5_RESULT: s5,
    }),
  );
}
