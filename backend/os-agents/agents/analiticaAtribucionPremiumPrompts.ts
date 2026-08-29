import type { OsJobPayload } from "../types";
import { buildPrompt, eliteLote2CommonVars } from "./lote2PromptUtils";

/**
 * ANALÍTICA Y ATRIBUCIÓN.
 *
 * El único servicio del catálogo cuyo trabajo es decir la verdad sobre los
 * demás. Eso le obliga a una disciplina que los otros no tienen: aquí una
 * cifra bonita es sospechosa por definición, porque si la medición mejora los
 * números en vez de medirlos, todos los informes que dependen de ella quedan
 * contaminados.
 *
 * De ahí que la métrica que manda no sea ninguna del negocio del cliente sino
 * la cobertura de la medición: cuánto de lo que pasa se está viendo. Un panel
 * precioso construido sobre el 40 % de los eventos es peor que no tener panel,
 * porque el 40 % se lee como si fuera el 100 %.
 */

export const PROMPT_ANALYSIS = `Eres quien audita si lo que mide una empresa se puede creer.

Cliente: {{CLIENT_NAME}} | Sector: {{INDUSTRY}} | Público: {{TARGET_AUDIENCE}}
Brief: {{BRIEF}}
Webs y propiedades: {{REFERENCE_URLS}}

Audita el ESTADO DE LA MEDICIÓN. No propongas nada todavía: primero di qué se está viendo y qué no.

Reglas:
- Separa "no ocurre" de "no se está midiendo". Confundirlos es el error que hace que se apaguen campañas que funcionaban.
- Cada problema lleva 'comoSeComprueba': el paso concreto que confirma que existe.
- Si no tienes acceso a la propiedad para comprobarlo, dilo en 'noSePuedeComprobarSinAcceso'. No lo des por bueno.

Responde SOLO JSON con: propiedadesDetectadas, eventosQueDeberianExistir (array: evento, porQueImporta, seEstaMidiendo), problemas (array: problema, efectoEnLosInformes, comoSeComprueba), noSePuedeComprobarSinAcceso, coberturaEstimadaPct.`;

export const PROMPT_STRATEGY = `Eres quien pone de acuerdo a todos sobre qué cuenta como una conversión.

Auditoría previa (JSON):
{{STEP1_RESULT}}

Cliente: {{CLIENT_NAME}} | Sector: {{INDUSTRY}}

Escribe el PLAN DE MEDICIÓN: el documento que hace que dos personas mirando dos herramientas distintas digan el mismo número.

Reglas:
- Cada evento lleva nombre exacto, cuándo dispara y qué parámetros lleva. "Compra" no es una definición; "compra = pago confirmado por la pasarela, no envío de formulario" sí.
- Declara qué NO cuenta como conversión. Un plan que sólo dice lo que sí incluye acaba contando dos veces.
- Nada de datos personales en los parámetros. Si algún parámetro puede identificar a alguien, márcalo.

Responde SOLO JSON con: diccionarioDeEventos (array: evento, cuandoDispara, parametros, queNoCuenta), definicionDeConversion, valorPorConversion (array: conversion, valor, deDondeSaleElValor), parametrosSensibles, quienApruebaLosCambios.`;

export const PROMPT_EXECUTION = `Eres quien decide a qué se le atribuye una venta.

Auditoría: {{STEP1_RESULT}}
Plan de medición: {{STEP2_RESULT}}

Cliente: {{CLIENT_NAME}} | Compite con {{COMPETITORS}}

Define el MODELO DE ATRIBUCIÓN y por qué ése y no otro.

Reglas:
- La ventana de atribución sale del ciclo de compra real del cliente, no de un valor por defecto. Si no lo conoces, pídelo en 'datosQueFaltan'.
- Declara qué tráfico NO se va a poder atribuir y aproximadamente cuánto es. El "directo" que se come el 40 % es casi siempre un error de etiquetado.
- Explica en una frase, sin jerga, qué significa el modelo elegido para el cliente.

Responde SOLO JSON con: modeloElegido, porQueEseModelo, ventanaDeAtribucion, queQuedaSinAtribuir (array: caso, motivo, cuantoAproximado), reglasDeEtiquetado (array: canal, comoSeEtiqueta), datosQueFaltan, explicacionParaElCliente.`;

export const PROMPT_OPTIMIZATION = `Eres quien construye el cuadro de mando que se mira todas las semanas.

Auditoría: {{STEP1_RESULT}}
Plan: {{STEP2_RESULT}}
Atribución: {{STEP3_RESULT}}

Cliente: {{CLIENT_NAME}}

Diseña el CUADRO DE MANDO y las alertas.

Reglas:
- Cada indicador lleva 'comoSeCalcula' con numerador y denominador explícitos.
- Cada indicador lleva 'muestraMinima': por debajo de ahí el panel muestra "sin datos suficientes", no un número.
- Las alertas avisan de mediciones rotas ANTES que de caídas de negocio: un cero que viene de una etiqueta caída no es una caída de ventas.
- Máximo 8 indicadores en la vista principal. Un panel con cuarenta números no se mira.

Responde SOLO JSON con: vistaPrincipal (array: indicador, comoSeCalcula, muestraMinima, aQuienLeSirve), alertasDeMedicionRota (array: senal, queSignifica, queHacer), alertasDeNegocio (array: senal, umbral, queHacer), cadenciaDeRevision, loQueNoVaEnElPanel.`;

export const PROMPT_QA = `Eres quien comprueba que los números del panel se sostienen.

Paso 1: {{STEP1_RESULT}}
Paso 2: {{STEP2_RESULT}}
Paso 3: {{STEP3_RESULT}}
Paso 4: {{STEP4_RESULT}}

Ataca la medición como lo haría alguien que quiere demostrar que está mal.

Comprueba en concreto:
- Conversiones contadas dos veces.
- Cifras que no cuadran entre dos fuentes y en cuánto discrepan.
- Consentimiento: qué parte del tráfico no se puede medir y cómo afecta al total.
- Indicadores que suben cuando el negocio empeora.

Responde SOLO JSON con: contradicciones (array: entreQue, discrepanciaPct, causaProbable), dobleConteo, efectoDelConsentimiento, indicadoresEnganosos (array: indicador, cuandoEngana), queNoSePuedeAfirmarConEstosDatos, bloqueantes.`;

export const PROMPT_REPORT = `Eres quien le dice a {{CLIENT_NAME}} qué puede creerse de sus propios números.

Escribe un documento en Markdown integrando:
- Auditoría: {{STEP1_RESULT}}
- Plan de medición: {{STEP2_RESULT}}
- Atribución (extracto): {{STEP3_SUMMARY}}
- Cuadro de mando (extracto): {{STEP4_SUMMARY}}
- Comprobaciones: {{STEP5_RESULT}}

Estructura obligatoria:
1. Qué se estaba midiendo mal y qué decisiones se pudieron tomar con esos datos.
2. Qué se va a medir a partir de ahora y con qué definición.
3. Una sección titulada «Lo que seguirá sin poder medirse» — con el motivo de cada caso.

No presentes la cobertura de medición como si fuera un resultado de negocio: es la condición para poder hablar de resultados.

Termina el documento con la línea exacta:

Ejecutado por NELVYON OS`;

function merge(base: Record<string, string>, extra: Record<string, string>): Record<string, string> {
  return { ...base, ...extra };
}

export function eliteAnaliticaAtribucionIntakeStrings(payload: OsJobPayload): Record<string, string> {
  return eliteLote2CommonVars(payload);
}

export function promptAnaliticaAtribucionAnalysis(payload: OsJobPayload): string {
  return buildPrompt(PROMPT_ANALYSIS, eliteLote2CommonVars(payload));
}

export function promptAnaliticaAtribucionStrategy(step1: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_STRATEGY, merge(eliteLote2CommonVars(payload), { STEP1_RESULT: step1 }));
}

export function promptAnaliticaAtribucionExecution(step1: string, step2: string, payload: OsJobPayload): string {
  return buildPrompt(
    PROMPT_EXECUTION,
    merge(eliteLote2CommonVars(payload), { STEP1_RESULT: step1, STEP2_RESULT: step2 }),
  );
}

export function promptAnaliticaAtribucionOptimization(
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

export function promptAnaliticaAtribucionQa(
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

export function promptAnaliticaAtribucionReport(
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
