/**
 * DÓNDE VIVE CADA SERVICIO: su disciplina de QA y su departamento.
 *
 * POR QUÉ ESTÁ EN UN FICHERO APARTE. Estos dos mapas los necesitan la matriz y
 * el contrato de servicio. Cuando existían dos copias —una por script— pasó lo
 * que siempre pasa: se añadió un servicio a una y no a la otra, y los dos
 * documentos decían cosas distintas del mismo servicio sin que nadie lo notara,
 * porque cada uno era coherente consigo mismo.
 *
 * POR QUÉ NO SE DEDUCEN DEL NOMBRE. `bots_premium` se revisa con la rúbrica de
 * contenido y `funnel_premium` con la de CRO: acertar por el nombre funcionaría
 * en la mitad de los casos, que es la peor cifra posible para una deducción
 * automática, porque parece que funciona.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * LOS DATOS VIVEN EN UN JSON, Y ESTE FICHERO EXPLICA POR QUE SON ESOS.
 *
 * El JSON lo leen tambien las pruebas, que son TypeScript y no pueden importar
 * un `.mjs` con tipos. Tener el dato en un sitio y el razonamiento en otro no
 * es ideal, pero es mucho mejor que la alternativa que ya fallo: dos copias del
 * mapa, cada una coherente consigo misma y distinta de la otra.
 */
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const DATOS = JSON.parse(
  fs.readFileSync(path.join(AQUI, "..", "..", "backend", "calidad", "mapaDeServicio.json"), "utf8"),
);

/** Qué disciplina de QA le toca a cada servicio. */
export const QA_DE = DATOS.qaDe;

/**
 * Quién responde de cada servicio.
 *
 * POR QUÉ ES UN MAPA Y NO UNA DEDUCCIÓN. La primera versión de esto derivaba el
 * departamento de la disciplina de optimización, y salió mal de una forma que
 * daba el pego: seis servicios acababan en «Marca» porque se optimizan por
 * rendimiento de la pieza, y la consultoría de automatización acababa en «Web»
 * porque se juzga por conversiones. Ninguna de las dos cosas es falsa sobre
 * cómo se miden, y las dos son falsas sobre quién hace el trabajo.
 *
 * Cómo se optimiza un servicio y quién responde de él son dos preguntas
 * distintas. Una deducción que acierta en la mitad de los casos es peor que
 * ninguna, porque el documento sale entero y parece correcto.
 *
 * `contrato-de-servicio.mjs` comprueba que este mapa cubre los 29 y que cada
 * departamento nombrado existe de verdad en `departamentos.ts`.
 */
export const DEPARTAMENTO_DE_SERVICIO = DATOS.departamentoDe;

/**
 * Qué categoría de conector le sirve a cada disciplina.
 *
 * Vacío NO significa «no necesita conexiones»: significa que el trabajo de esa
 * disciplina se entrega sin leer de una plataforma ajena. Un servicio de diseño
 * no necesita conectarse a nada para hacer su trabajo.
 */
export const CONECTORES_DE_DISCIPLINA = DATOS.conectoresDe;
