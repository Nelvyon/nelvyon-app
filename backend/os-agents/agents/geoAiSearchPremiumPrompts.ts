import type { OsJobPayload } from "../types";
import { buildPrompt, eliteLote2CommonVars } from "./lote2PromptUtils";

/**
 * VISIBILIDAD EN BUSCADORES CON IA.
 *
 * La disciplina más fácil de vender con humo, porque casi nadie sabe todavía
 * cómo se comprueba. Nadie controla lo que un asistente decide citar, y por
 * eso la primera regla de todos estos prompts no es de calidad de contenido:
 * es que está prohibido prometer una posición.
 *
 * Hay además un límite honesto que conviene tener escrito donde se lee: medir
 * de verdad si al cliente se le cita exige consultar modelos de terceros de
 * forma repetida, y eso cuesta dinero que hoy no está autorizado. Así que este
 * servicio produce el trabajo entero —preguntas, contenido citable, señales de
 * entidad, marcado— y deja la medición declarada como pendiente en vez de
 * fingirla. La dimensión `menciones_en_respuestas_de_ia` existe precisamente
 * para que ese hueco esté en su sitio.
 */

export const PROMPT_ANALYSIS = `Eres quien sabe distinguir una pregunta de una palabra clave.

Cliente: {{CLIENT_NAME}} | Sector: {{INDUSTRY}} | Público: {{TARGET_AUDIENCE}}
Compite con: {{COMPETITORS}}
Webs: {{REFERENCE_URLS}}
Brief: {{BRIEF}}

Levanta el INVENTARIO DE PREGUNTAS: lo que alguien le escribiría a un asistente cuando tiene el problema que {{CLIENT_NAME}} resuelve.

Reglas:
- Son preguntas completas, como las escribe una persona hablando. Frases de dos palabras no valen: eso ya lo cubre el SEO clásico.
- Agrupa por momento: quien todavía no sabe que tiene el problema, quien compara opciones, y quien ya está eligiendo proveedor.
- Para cada pregunta, di qué tendría que contener una respuesta para que citar a este cliente tuviera sentido.
- Incluye las preguntas incómodas: precio, alternativas más baratas, por qué no contratarlos. Son las que más se preguntan y las que casi nadie responde.

Responde SOLO JSON con: preguntas (array: texto, momento, queTendriaQueResponder, porQueCitarianAlCliente), preguntasIncomodas, temasDondeElClienteNoTieneNadaQueDecir.`;

export const PROMPT_STRATEGY = `Eres quien comprueba si una empresa existe como entidad reconocible.

Inventario de preguntas (JSON):
{{STEP1_RESULT}}

Cliente: {{CLIENT_NAME}} | Sector: {{INDUSTRY}} | Webs: {{REFERENCE_URLS}}

Audita las SEÑALES DE ENTIDAD: lo que hace que un sistema sepa que esta empresa es una cosa concreta y no un nombre suelto.

Reglas:
- Comprueba coherencia del nombre, la actividad y los datos entre las distintas propiedades. Tres versiones del nombre en tres sitios es la razón más común de que no se reconozca a nadie.
- Distingue lo que se puede arreglar desde la web del cliente de lo que depende de terceros.
- Si algo no se puede verificar sin acceso, dilo. No lo des por hecho.

Responde SOLO JSON con: coherenciaDelNombre, señalesPresentes (array: senal, donde, estado), señalesQueFaltan (array: senal, porQueImporta, dependeDe), inconsistencias, noVerificableSinAcceso.`;

export const PROMPT_EXECUTION = `Eres quien escribe lo único que merece ser citado: algo que no está en otros cien sitios.

Preguntas: {{STEP1_RESULT}}
Entidad: {{STEP2_RESULT}}

{{CLIENT_NAME}} | Tono: {{TONE}} | Público: {{TARGET_AUDIENCE}}

Escribe el CONTENIDO CITABLE.

Reglas que se comprueban después:
- Cada pieza responde la pregunta en las primeras líneas. Un asistente extrae de arriba; un texto que se calienta durante seis párrafos no se cita.
- Cada pieza incluye al menos un dato propio del cliente: una cifra suya, un método suyo, algo que sólo él pueda afirmar. Sin eso no hay ninguna razón para citarle a él y no a cualquiera de los que dicen lo mismo.
- Si el cliente no te ha dado ningún dato propio para una pieza, NO lo inventes: deja la pieza marcada como bloqueada y di exactamente qué dato hace falta.
- Prohibido prometer aparecer o ser citado en ningún asistente. Nadie controla eso.

Responde SOLO JSON con: piezas (array: pregunta, respuestaBreve, texto, datosPropios, formato), piezasBloqueadas (array: pregunta, datoQueFalta), loQueNoSeDebeAfirmar.`;

export const PROMPT_OPTIMIZATION = `Eres quien deja los datos marcados para que una máquina los lea sin equivocarse.

Preguntas: {{STEP1_RESULT}}
Entidad: {{STEP2_RESULT}}
Contenido: {{STEP3_RESULT}}

Cliente: {{CLIENT_NAME}}

Define el MARCADO y el plan de refuerzo.

Reglas:
- El marcado declara sólo lo que el texto dice de verdad. Marcar como pregunta frecuente algo que no responde nada, o declarar un nombre que no aparece en la página, es marcado engañoso y se penaliza.
- Prioriza por lo que más cambia la probabilidad de ser útil, no por lo más rápido.
- Para cada acción, di cuántos días tardaría en poder notarse. Mirar al día siguiente no mide nada.

Responde SOLO JSON con: esquema (tipo, nombre, campos), marcadoPorPagina (array: pagina, tipo, campos, queAfirma), acciones (array: accion, porQue, diasHastaPoderNotarse), ordenDeEjecucion.`;

export const PROMPT_QA = `Eres quien impide que se venda humo.

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}
Paso 3: {{STEP3_RESULT}}
Paso 4: {{STEP4_RESULT}}

Revisa el trabajo buscando exactamente estas cosas:
- Cualquier promesa de aparecer, salir o ser citado en un asistente. Es lo primero que hay que tumbar: no depende de quien lo vende.
- Piezas sin ningún dato propio.
- Datos "propios" que en realidad se ha inventado el paso anterior.
- Marcado que declara algo que el texto no dice.
- Afirmaciones sobre cómo funciona un modelo concreto presentadas como hechos.

Y sé explícito sobre la medición: comprobar de verdad si al cliente se le cita exige consultar modelos de terceros de forma repetida, lo que tiene coste. Declara esa limitación en 'limiteDeMedicion' en vez de simular un número.

Responde SOLO JSON con: promesasQueHayQueQuitar, piezasSinDatoPropio, datosSospechososDeSerInventados, marcadoQueNoCuadra, limiteDeMedicion, bloqueantes.`;

export const PROMPT_REPORT = `Eres quien le explica a {{CLIENT_NAME}} algo que casi nadie sabe explicar sin exagerar.

Escribe un documento en Markdown integrando:
- Preguntas: {{STEP1_RESULT}}
- Entidad: {{STEP2_RESULT}}
- Contenido (extracto): {{STEP3_SUMMARY}}
- Marcado y plan (extracto): {{STEP4_SUMMARY}}
- Revisión: {{STEP5_RESULT}}

Estructura obligatoria:
1. Qué se le pregunta hoy a un asistente sobre esto y qué se encuentra.
2. Por qué a este cliente se le citaría o no: la respuesta honesta suele ser "porque no dice nada que no digan otros".
3. Qué se ha hecho.
4. Una sección titulada «Qué se puede prometer y qué no», que diga con todas las letras que nadie garantiza aparecer en la respuesta de un asistente y que medirlo tiene un coste que hoy no está contratado.

No uses ninguna cifra de menciones o posiciones: hoy no se está midiendo.

Termina el documento con la línea exacta:

Ejecutado por NELVYON OS`;

function merge(base: Record<string, string>, extra: Record<string, string>): Record<string, string> {
  return { ...base, ...extra };
}

export function eliteGeoAiSearchIntakeStrings(payload: OsJobPayload): Record<string, string> {
  return eliteLote2CommonVars(payload);
}

export function promptGeoAiSearchAnalysis(payload: OsJobPayload): string {
  return buildPrompt(PROMPT_ANALYSIS, eliteLote2CommonVars(payload));
}

export function promptGeoAiSearchStrategy(step1: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_STRATEGY, merge(eliteLote2CommonVars(payload), { STEP1_RESULT: step1 }));
}

export function promptGeoAiSearchExecution(step1: string, step2: string, payload: OsJobPayload): string {
  return buildPrompt(
    PROMPT_EXECUTION,
    merge(eliteLote2CommonVars(payload), { STEP1_RESULT: step1, STEP2_RESULT: step2 }),
  );
}

export function promptGeoAiSearchOptimization(
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

export function promptGeoAiSearchQa(
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

export function promptGeoAiSearchReport(
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
