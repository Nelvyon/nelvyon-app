import type { OsJobPayload } from "../types";
import { buildPrompt, eliteLote2CommonVars } from "./lote2PromptUtils";

/**
 * CAPTACIÓN Y CRM.
 *
 * Lo que distingue a este servicio de «generar leads»: aquí el número que
 * manda es el de contactos CUALIFICADOS, no el de contactos. Doscientos
 * formularios rellenados por gente que nunca iba a comprar no son un resultado
 * mejor que veinte que sí: son veinte horas del equipo comercial gastadas en
 * llamadas que no llevan a ningún sitio, y además tapan el problema porque el
 * informe sale precioso.
 *
 * Por eso todos los pasos piden el mismo compromiso: que cada regla del
 * sistema de puntuación se pueda justificar con algo observado, no con una
 * intuición redondeada a diez puntos.
 */

export const PROMPT_ANALYSIS = `Eres quien monta la captación de una agencia que cobra por clientes cerrados, no por formularios rellenados.

Diagnostica la captación de {{CLIENT_NAME}} en {{INDUSTRY}}. Público: {{TARGET_AUDIENCE}}. Compite con {{COMPETITORS}}.
Brief: {{BRIEF}}

Diagnostica el EMBUDO COMERCIAL, no el de marketing: dónde entra el contacto, quién lo toca, en qué punto se pierde y por qué.

Reglas que no puedes saltarte:
- Si un dato no está en el brief, decláralo como hueco en 'datosQueFaltan'. NO lo estimes.
- Distingue "no lo sé" de "es cero". Un embudo sin datos no es un embudo vacío.

Responde SOLO JSON con: etapasDelEmbudo (array: etapa, quienLaTrabaja, comoSeMide, dondeSePierde), fugasDetectadas (array: donde, sintoma, hipotesis, comoComprobarlo), tiempoDeRespuestaActual, datosQueFaltan, primeraCosaQueArreglar.`;

export const PROMPT_STRATEGY = `Eres quien decide a quién merece la pena llamar y a quién no.

Diagnóstico previo (JSON):
{{STEP1_RESULT}}

Cliente: {{CLIENT_NAME}} | Sector: {{INDUSTRY}} | Público: {{TARGET_AUDIENCE}}

Define el CRITERIO DE CUALIFICACIÓN. No un scoring genérico de 0 a 100: reglas que un comercial pueda aplicar mirando la ficha.

Reglas:
- Cada regla lleva 'porQue': qué comportamiento observado la justifica. Una regla sin justificación es una superstición con puntos.
- Incluye al menos dos DESCALIFICADORES: señales que hacen que un contacto NO merezca llamada. Un sistema que sólo suma puntos nunca dice que no.
- Los tramos deben repartir a la población, no dejar el 90 % en el mismo cajón.

Responde SOLO JSON con: reglasQueSuman (array: senal, puntos, porQue, dondeSeObserva), descalificadores (array: senal, porQue), tramos (array: nombre, desde, hasta, queSeHaceConEl), definicionDeLeadCualificado, comoSeRevisaElCriterio.`;

export const PROMPT_EXECUTION = `Eres quien escribe lo que se le dice a un contacto nuevo.

Diagnóstico: {{STEP1_RESULT}}
Criterio de cualificación: {{STEP2_RESULT}}

{{CLIENT_NAME}} | Tono: {{TONE}} | Público: {{TARGET_AUDIENCE}}

Escribe las SECUENCIAS de contacto por tramo. No una plantilla con el nombre cambiado: cada tramo recibe un mensaje distinto porque está en un momento distinto.

Reglas:
- Ningún mensaje promete resultados que dependan del cliente final.
- Todo mensaje de salida lleva una salida clara para dejar de recibirlos.
- Ninguna secuencia contacta a alguien que no dio su consentimiento; si el origen no lo acredita, dilo en 'requisitosDeConsentimiento'.

Responde SOLO JSON con: secuencias (array: tramo, canal, momento, asunto, cuerpo, queEsperamosQueHaga), plantillaDePrimeraLlamada (array de preguntas), requisitosDeConsentimiento, cuandoSeParaLaSecuencia.`;

export const PROMPT_OPTIMIZATION = `Eres quien mide si la captación mejora de verdad.

Diagnóstico: {{STEP1_RESULT}}
Criterio: {{STEP2_RESULT}}
Secuencias: {{STEP3_RESULT}}

Cliente: {{CLIENT_NAME}}

Define ENRUTADO, TIEMPOS Y MEDICIÓN.

Reglas:
- La métrica principal es leads cualificados, no leads. Si propones otra, explica por qué manda sobre esa.
- Cada métrica lleva 'comoSeCalcula' con el numerador y el denominador. Un porcentaje sin denominador no se puede auditar.
- Declara el tamaño mínimo de muestra por debajo del cual NO se saca conclusión.

Responde SOLO JSON con: enrutado (array: siOcurre, vaA, en), sla (array: etapa, tiempoMaximo, queOcurreSiSeIncumple), metricas (array: nombre, comoSeCalcula, deDondeSaleElDato, muestraMinima), motivosDePerdida (array cerrado), revisionPeriodica.`;

export const PROMPT_QA = `Eres quien impide que esto acabe en una multa o en una lista negra.

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}
Paso 3: {{STEP3_RESULT}}
Paso 4: {{STEP4_RESULT}}

Revisa el sistema completo buscando lo que puede salir mal.

Comprueba en concreto:
- Contactos sin base legal para ser contactados.
- Datos personales que se guardan sin necesitarlos.
- Reglas de puntuación que discriminan por algo que no debería importar.
- Automatismos que envían mensajes sin que nadie pueda pararlos.

Responde SOLO JSON con: riesgos (array: riesgo, gravedad, comoSeEvita), datosPersonalesQueSeTocan (array: dato, porQueHaceFalta, cuantoSeGuarda), aprobacionesHumanasNecesarias, loQueNuncaSeAutomatiza, bloqueantes.`;

export const PROMPT_REPORT = `Eres quien le explica a {{CLIENT_NAME}} qué va a cambiar en su captación.

Escribe un documento en Markdown para {{TARGET_AUDIENCE}}, integrando:
- Diagnóstico: {{STEP1_RESULT}}
- Criterio de cualificación: {{STEP2_RESULT}}
- Secuencias (extracto): {{STEP3_SUMMARY}}
- Medición (extracto): {{STEP4_SUMMARY}}
- Riesgos: {{STEP5_RESULT}}

El documento empieza por lo que se ha encontrado, no por lo que se va a hacer.
Incluye una tabla con la situación de partida y qué se espera mover, y una sección titulada «Lo que todavía no se puede afirmar» con lo que falta por medir.
No prometas un número de ventas: eso depende de quien cierra.

Termina el documento con la línea exacta:

Ejecutado por NELVYON OS`;

function merge(base: Record<string, string>, extra: Record<string, string>): Record<string, string> {
  return { ...base, ...extra };
}

export function eliteCrmCaptacionIntakeStrings(payload: OsJobPayload): Record<string, string> {
  return eliteLote2CommonVars(payload);
}

export function promptCrmCaptacionAnalysis(payload: OsJobPayload): string {
  return buildPrompt(PROMPT_ANALYSIS, eliteLote2CommonVars(payload));
}

export function promptCrmCaptacionStrategy(step1: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_STRATEGY, merge(eliteLote2CommonVars(payload), { STEP1_RESULT: step1 }));
}

export function promptCrmCaptacionExecution(step1: string, step2: string, payload: OsJobPayload): string {
  return buildPrompt(
    PROMPT_EXECUTION,
    merge(eliteLote2CommonVars(payload), { STEP1_RESULT: step1, STEP2_RESULT: step2 }),
  );
}

export function promptCrmCaptacionOptimization(
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

export function promptCrmCaptacionQa(
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

export function promptCrmCaptacionReport(
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
