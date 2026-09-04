/**
 * EL PROCESO DE CRO, que hasta ahora era el de una tienda.
 *
 * ── LO QUE PASABA ───────────────────────────────────────────────────────────
 *
 * `FunnelPremiumAgent` importaba los SEIS prompts de ecommerce enteros. Las
 * descripciones de sus pasos hablaban de funnel —«arquitectura de páginas del
 * funnel»— y la instrucción que llegaba al modelo decía «arquitectura de la
 * tienda». Un servicio de conversión ejecutando el proceso de montar una
 * tienda.
 *
 * No es un problema de nombres. Un funnel y una tienda se optimizan al revés: la
 * tienda parte del catálogo y llega a la conversión; el funnel parte de la
 * fricción medida y llega a un experimento que la reduzca.
 *
 * ── EL CICLO, Y POR QUÉ ESTE Y NO OTRO ──────────────────────────────────────
 *
 *     evidencia → arquitectura → oferta con hipótesis → experimento con
 *       guardarraíles → medición → política de decisión
 *
 * Son SEIS pasos y no siete porque el pipeline del agente tiene seis llamadas al
 * modelo, y añadir una séptima subiría el coste de cada trabajo un 17 % para
 * separar dos cosas que se piensan juntas: al escribir la oferta ya se está
 * decidiendo qué se quiere probar. Las hipótesis salen ahí.
 *
 * Cada paso existe porque saltárselo produce un fallo conocido:
 *
 *   · SIN EVIDENCIA no hay CRO, hay opiniones bonitas. Es la diferencia entre
 *     «el botón debería ser más visible» y «el 68 % abandona en el paso 3».
 *   · SIN HIPÓTESIS no se aprende nada: un cambio que funciona sin saber por
 *     qué no se puede repetir en la siguiente página.
 *   · SIN GUARDARRAÍLES un experimento puede estar hundiendo el negocio
 *     mientras «gana» en la métrica que se mira.
 *   · SIN CRITERIO FIJADO ANTES, el resultado se interpreta después — que es
 *     como se declara ganadora cualquier variante.
 *   · SIN DECISIÓN EXPLÍCITA el test se queda corriendo para siempre.
 *
 * ── LO QUE NO SE LE PIDE AL MODELO ──────────────────────────────────────────
 *
 * Cifras. En ningún paso se le pide que estime una tasa de conversión ni un
 * uplift: si no está medido, inventarlo es peor que no tenerlo, y un informe de
 * CRO con números inventados es indistinguible de uno bueno hasta que alguien
 * los comprueba.
 *
 * Donde no hay dato, se pide que lo DIGA y que proponga cómo medirlo.
 */
import type { OsJobPayload } from "../types";

import { buildPrompt } from "./webPremiumPrompts";
import { eliteCommonIntakeStrings } from "./elitePayloadStrings";

export const PROMPT_FUNNEL_EVIDENCIA = `Eres el mejor especialista en optimización de conversión del mundo. Trabajas como un investigador: no propones nada hasta saber dónde se pierde la gente.

Cliente: {clientName}
Sector: {industry}
Público: {targetAudience}
Objetivo del negocio: {brief}
Competidores: {competitors}

Recoge la EVIDENCIA disponible sobre el embudo actual. No estimes cifras que no te den: si un dato no consta, dilo y propón cómo medirlo.

Responde SOLO JSON con:
etapasDelEmbudo (array de { etapa, queOcurre, datoDisponible }), dondeSePierdeLaGente (array de { etapa, sintoma, evidencia, esDatoOEsHipotesis }), datosQueFaltan (array de { queFalta, comoMedirlo, cuantoTardariaEnTenerse }), friccionesObservables (array), señalesCualitativas (array).`;

export const PROMPT_FUNNEL_ARQUITECTURA = `Eres el mejor arquitecto de embudos de conversión del mundo.

Evidencia del embudo actual:
{step1Result}

Cliente: {clientName} | Sector: {industry} | Público: {targetAudience} | Tono: {tone}

Diseña las PÁGINAS del embudo. Cada una tiene un solo trabajo: si una página pide dos cosas, no consigue ninguna.

El número de pasos sale de la evidencia, no de una plantilla: un producto que se entiende solo no necesita cinco páginas, y uno complejo no cabe en una.

Responde SOLO JSON con:
pasos (array de { orden, nombre, elTrabajoDeEstaPagina, queVeElUsuario, queHaceDespues, friccionQueElimina }), porQueEsteNumeroDePasos, queSeQuitaRespectoAlActual (array), navegacionEntrePasos.`;

export const PROMPT_FUNNEL_OFERTA = `Eres el mejor especialista en oferta y copy de conversión del mundo.

Evidencia: {step1Result}
Arquitectura: {step2Result}

Cliente: {clientName} | Público: {targetAudience} | Tono: {tone} | Competidores: {competitors}

Escribe la oferta y el copy de cada paso, y convierte lo que has decidido en HIPÓTESIS falsables: qué cambias, para quién, qué esperas que pase y POR QUÉ. El porqué es lo que permite aprender aunque falle.

No inventes cifras ni testimonios. Si hace falta una prueba social que el cliente no tiene, dilo y di cómo conseguirla.

Responde SOLO JSON con:
copyPorPaso (array de { paso, titular, subtitulo, cuerpo, llamadaALaAccion, objecionQueResuelve }), oferta (qué se ofrece y a cambio de qué), hipotesis (array de { id, siCambiamos, entonces, porque, evidenciaQueLaSostiene }), pruebasQueFaltan (array).`;

export const PROMPT_FUNNEL_EXPERIMENTO = `Eres el mejor especialista en experimentación del mundo. Diseñas tests que se pueden interpretar, no tests que se pueden lanzar rápido.

Evidencia: {step1Result}
Arquitectura y copy con sus hipótesis:
{step3Result}

Cliente: {clientName} | Público: {targetAudience}

Diseña el experimento de la hipótesis más prioritaria. UNA variable por experimento: si se cambian tres cosas y sube la conversión, no se sabe cuál funcionó y no se ha aprendido nada.

El criterio de éxito se fija AHORA, antes de ver un solo dato. Y los guardarraíles también: qué métrica, aunque suba la conversión, obligaría a parar.

Responde SOLO JSON con:
variableQueCambia, variantes (array), criterioDeExito (fijado antes), metricaPrincipal, metricasDeGuardia (array de { metrica, limiteQueObligaAParar, porQue }), traficoNecesario, duracionMinima, comoSeReparteElTrafico, queNoSeToca (array).`;

export const PROMPT_FUNNEL_MEDICION = `Eres el mejor analista de experimentación del mundo.

Experimento diseñado:
{step4Result}

Cliente: {clientName}

Define CÓMO se mide, con qué herramienta y con qué eventos. Un experimento que no se puede medir con lo que el cliente tiene instalado es un experimento que no existe.

Si falta instrumentación, dilo antes de empezar: descubrirlo a mitad invalida el test entero.

Responde SOLO JSON con:
eventosNecesarios (array de { evento, donde, yaExiste }), herramientaDeMedicion, comoSeAtribuye, queInvalidariaLaMedicion (array), instrumentacionQueFalta (array), listoParaEmpezar (boolean con motivo).`;

export const PROMPT_FUNNEL_DECISION = `Eres el mejor especialista en optimización de conversión del mundo.

Experimento: {step4Result}
Plan de medición: {step5Result}

Cliente: {clientName}

Escribe la POLÍTICA DE DECISIÓN, antes de tener resultados. Qué se hace en cada desenlace posible, incluidos los incómodos.

Los cuatro que hay que cubrir sí o sí: gana la variante, gana el control, no hay diferencia, y no hay datos suficientes. «No hay datos suficientes» NO es «no hay diferencia»: la primera dice que no se sabe, la segunda afirma algo.

Responde SOLO JSON con:
siGanaLaVariante, siGanaElControl, siNoHayDiferencia, siNoHayDatosSuficientes, siSaltaUnGuardarrail, queSeAprendeEnCadaCaso, siguienteHipotesisSegunResultado, cuandoSeDaPorCerrado.`;

/** Todo el texto que el cliente y el Business Brain aportan. */
function vars(payload: OsJobPayload, extra: Record<string, string> = {}): Record<string, string> {
  return { ...eliteCommonIntakeStrings(payload), ...extra };
}

/** 1 · Dónde se pierde la gente, con lo que haya medido. */
export function promptFunnelEvidencia(payload: OsJobPayload): string {
  return buildPrompt(PROMPT_FUNNEL_EVIDENCIA, vars(payload));
}

/** 2 · Las páginas del embudo. Alimenta también la generación del HTML. */
export function promptFunnelArquitectura(step1Result: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_FUNNEL_ARQUITECTURA, vars(payload, { step1Result }));
}

/** 3 · Oferta, copy por paso y las hipótesis que los sostienen. */
export function promptFunnelOferta(
  step1Result: string,
  step2Result: string,
  payload: OsJobPayload,
): string {
  return buildPrompt(PROMPT_FUNNEL_OFERTA, vars(payload, { step1Result, step2Result }));
}

/** 4 · El experimento, con sus guardarraíles. Alimenta el HTML generado. */
export function promptFunnelExperimento(
  step1Result: string,
  step3Result: string,
  payload: OsJobPayload,
): string {
  return buildPrompt(PROMPT_FUNNEL_EXPERIMENTO, vars(payload, { step1Result, step3Result }));
}

/** 5 · Cómo se mide, y qué instrumentación falta antes de empezar. */
export function promptFunnelMedicion(step4Result: string, payload: OsJobPayload): string {
  return buildPrompt(PROMPT_FUNNEL_MEDICION, vars(payload, { step4Result }));
}

/** 6 · La política de decisión, escrita ANTES de tener resultados. */
export function promptFunnelDecision(
  step4Result: string,
  step5Result: string,
  payload: OsJobPayload,
): string {
  return buildPrompt(PROMPT_FUNNEL_DECISION, vars(payload, { step4Result, step5Result }));
}
