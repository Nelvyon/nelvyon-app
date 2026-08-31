/**
 * LOS EJES QUE LE FALTABAN AL BANCO ANTI-GENÉRICO.
 *
 * QUÉ HABÍA. Cinco clientes sintéticos que se diferencian de verdad —un
 * restaurante de barrio, un SaaS B2B, un ecommerce regulado, una franquicia
 * dental, un despacho— con sector, objetivo, presupuesto, margen, marca,
 * restricciones e historial distintos. Bien construidos: los presupuestos van
 * de 300 € a 25.000 € al mes y las restricciones son reales.
 *
 * QUÉ LES FALTABA, y se ve enseguida al mirarlos juntos: **los cinco son
 * españoles y hablan español**. NELVYON aspira a ser una referencia mundial y
 * su propio catálogo vende SEO internacional y `hreflang`; un banco que sólo
 * mide clientes de un país y un idioma no puede detectar que el sistema produce
 * trabajo español para un cliente alemán.
 *
 * Faltaban además otros dos ejes que cambian de verdad una estrategia:
 *
 *   · MADUREZ — un negocio que abre mañana y uno con ocho años de histórico no
 *     se optimizan igual. Al primero no se le puede decir «mira tus datos».
 *   · DATOS DISPONIBLES — sin analítica no se puede medir, y una estrategia que
 *     promete medir lo que no se puede medir es una estrategia inventada.
 *
 * ESTE FICHERO NO SUSTITUYE AL ANTERIOR. Se añade. La evidencia ya medida con
 * los cinco de siempre sigue siendo válida y se seguiría midiendo igual; lo que
 * aquí se aporta son los ejes que aquélla no cubría.
 *
 * COSTE EXTERNO: 0 €. Son datos inventados.
 */
import { cargaDe, type ClienteSintetico } from "./clientesSinteticos";

/** Cuánto lleva funcionando el negocio. Cambia qué consejo es aplicable. */
export type Madurez = "abre_ahora" | "establecido";

/** Qué puede medir el cliente hoy. Sin esto se prometen métricas imposibles. */
export type DatosDisponibles = "ninguno" | "abundantes";

export interface ClienteInternacional extends ClienteSintetico {
  /** ISO del país donde vende. */
  pais: string;
  /** ISO del idioma en que habla con sus clientes. */
  idioma: "es" | "en" | "de" | "fr" | "pt" | "it";
  madurez: Madurez;
  datosDisponibles: DatosDisponibles;
}

/**
 * La carga de un cliente internacional.
 *
 * Es `cargaDe` MÁS los cuatro campos nuevos. Se separa en vez de tocar
 * `cargaDe` para no alterar lo que ya se está midiendo con los cinco clientes
 * de siempre: cambiar el instrumento y la medida a la vez impide saber cuál de
 * los dos movió el resultado.
 *
 * `language` y `locale` van los dos porque `resolveAgentLocale` acepta ambos, y
 * un encargo real puede traer cualquiera de ellos.
 */
export function cargaInternacionalDe(c: ClienteInternacional): Record<string, unknown> {
  return {
    ...cargaDe(c),
    language: c.idioma,
    locale: c.idioma,
    country: c.pais,
    market: c.pais,
    businessMaturity: c.madurez,
    dataAvailability: c.datosDisponibles,
  };
}

export const CLIENTES_INTERNACIONALES: readonly ClienteInternacional[] = [
  {
    id: "manufactura_de",
    quienEs: "Un fabricante alemán de componentes industriales con 40 años",
    empresa: "Hartmann Präzisionsteile",
    sector: "manufactura industrial",
    ubicacion: "Stuttgart, Alemania",
    pais: "DE",
    idioma: "de",
    madurez: "establecido",
    datosDisponibles: "abundantes",
    objetivo:
      "abrir mercado en el norte de Italia sin canibalizar a los distribuidores alemanes",
    presupuestoMensualCents: 1_800_000, // 18.000 €/mes
    publico: "jefes de compras de fábricas de automoción de más de 200 empleados",
    propuestaDeValor: "tolerancias de 2 micras certificadas pieza a pieza",
    competidores: ["dos fabricantes italianos más baratos", "importadores asiáticos"],
    vozDeMarca: "sobria, técnica, sin superlativos; en alemán se usa el usted",
    restricciones: [
      "los distribuidores tienen exclusiva territorial: no se puede vender directo en su zona",
      "la normativa alemana de competencia prohíbe comparaciones nominales con rivales",
      "toda comunicación debe existir en alemán antes que en cualquier otro idioma",
    ],
    historial:
      "una campaña en inglés traducida con máquina hundió la percepción de calidad; se retiró en tres semanas",
    hechosQueLoDistinguen: ["micras", "distribuidor", "Stuttgart", "alemán"],
  },
  {
    id: "saas_uk_nuevo",
    quienEs: "Un SaaS británico que abre el mes que viene y no tiene un solo cliente",
    empresa: "Kettle Analytics",
    sector: "software de analítica para hostelería",
    ubicacion: "Manchester, Reino Unido",
    pais: "GB",
    idioma: "en",
    madurez: "abre_ahora",
    datosDisponibles: "ninguno",
    objetivo: "conseguir los primeros 20 clientes de pago antes de quedarse sin caja",
    presupuestoMensualCents: 90_000, // 900 €/mes
    publico: "dueños de dos a cinco pubs que llevan las cuentas en hojas de cálculo",
    propuestaDeValor: "dice qué plato deja margen de verdad, contando la merma",
    competidores: ["hojas de cálculo", "el sistema de caja que ya tienen"],
    vozDeMarca: "directa y coloquial, nada corporativa",
    restricciones: [
      "NO HAY DATOS HISTORICOS: cero visitas, cero conversiones, cero clientes",
      "la caja da para cuatro meses: nada que tarde más de eso en devolver",
      "una sola persona ejecuta: no puede haber un plan de diez canales",
    ],
    historial: "no hay historial: el producto no ha salido todavía",
    hechosQueLoDistinguen: ["pubs", "merma", "Manchester", "primeros"],
  },
  {
    id: "retail_br",
    quienEs: "Una cadena brasileña de tiendas de barrio con ocho años",
    empresa: "Casa Beira",
    sector: "comercio minorista de alimentación",
    ubicacion: "Belo Horizonte, Brasil",
    pais: "BR",
    idioma: "pt",
    madurez: "establecido",
    datosDisponibles: "abundantes",
    objetivo: "que el cliente de barrio compre también por internet sin perder la tienda física",
    presupuestoMensualCents: 250_000, // 2.500 €/mes
    publico: "familias del barrio que ya compran en la tienda",
    propuestaDeValor: "lo mismo que en la tienda, entregado en dos horas",
    competidores: ["dos aplicaciones nacionales de reparto con precios más bajos"],
    vozDeMarca: "cercana y de barrio, en portugués de Brasil, nunca de Portugal",
    restricciones: [
      "el reparto sólo llega a tres barrios: prometer más es engañar",
      "el margen de alimentación es del 12 %: una comisión de reparto se lo come",
      "la mitad de los clientes tiene más de 60 años y no usa aplicaciones",
    ],
    historial:
      "entraron en una aplicación de reparto, vendieron mucho y perdieron dinero en cada pedido",
    hechosQueLoDistinguen: ["barrio", "dos horas", "12", "Belo Horizonte"],
  },
];
