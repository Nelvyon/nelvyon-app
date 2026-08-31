/**
 * UN CLIENTE ALEMÁN NO RECIBE SU TRABAJO EN INGLÉS.
 *
 * QUÉ ESTABA ROTO. `detectLanguageFromText` recorría un diccionario de idiomas
 * en el orden en que estaba escrito y devolvía **el primero que casara**. La
 * palabra `service` estaba en las listas de inglés, francés y alemán, y el
 * inglés se miraba antes; así que cualquier texto francés o alemán que dijera
 * «service» salía como inglés. `empresa` estaba en español y portugués, y el
 * portugués salía español.
 *
 * NO ERA UN MATIZ. `localizedPrompt` le ordena al modelo en qué idioma escribir
 * («ALWAYS write output in …»), y `SectorAgentWrapper` llama a
 * `resolveAgentLocale(payload)` sin pasarle perfil, así que dependía por
 * completo de esa adivinación. Un cliente alemán recibía su entregable en
 * inglés, y ninguna prueba lo decía porque **este módulo no tenía ninguna**.
 *
 * LO QUE MIDEN ESTAS PRUEBAS:
 *
 *   1. ACIERTO SOBRE UN CORPUS, no sobre una frase suelta. Un porcentaje sobre
 *      treinta frases dice algo; un caso que pasa no dice nada.
 *   2. LAS CUATRO REGRESIONES CONCRETAS que fallaban, nombradas una a una.
 *   3. EL MARGEN, no sólo el ganador: acertar por los pelos y acertar con
 *      holgura no son lo mismo, y sólo lo segundo aguanta un texto distinto.
 *   4. QUE UN DATO DECLARADO GANE A UNA CONJETURA, que es la regla que evita
 *      todo este problema cuando el cliente ya dijo en qué idioma habla.
 *
 * COSTE EXTERNO: 0 €. Compara cadenas.
 */
import { describe, expect, it } from "vitest";

import {
  detectLanguageFromText,
  localeDeCliente,
  localizedPrompt,
  puntuarIdiomas,
  resolveAgentLocale,
  LOCALES_SOPORTADOS,
  type AgentLocale,
} from "../agentLanguage";

/**
 * Frases como las que escribiría un cliente pidiendo trabajo.
 *
 * Cinco por idioma, con y sin tildes, porque mucha gente escribe sin ellas y
 * eso no debería cambiar el idioma de su entregable.
 */
const CORPUS: ReadonlyArray<[AgentLocale, string]> = [
  ["es", "Hola, nuestra empresa necesita un servicio de marketing digital."],
  ["es", "Queremos mejorar la visibilidad de nuestra tienda en Google."],
  ["es", "Necesitamos mas clientes para nuestro restaurante de Valencia."],
  ["es", "Buenos dias, somos una clinica dental y buscamos ayuda con las campanas."],
  ["es", "Nuestro objetivo es vender mas sin bajar el margen."],

  ["en", "Hello, our company needs a marketing service."],
  ["en", "We would like to improve our visibility on search engines."],
  ["en", "Our team is looking for help with paid campaigns this quarter."],
  ["en", "We have a new product and we want more qualified leads."],
  ["en", "Thanks for your time, please tell us about your process."],

  ["fr", "Bonjour, notre entreprise cherche un service de marketing digital."],
  ["fr", "Nous avons besoin d'un service pour notre entreprise a Lyon."],
  ["fr", "Notre equipe souhaite plus de visibilite dans les moteurs de recherche."],
  ["fr", "Merci de nous expliquer votre methode pour cette campagne."],
  ["fr", "Nous sommes une entreprise familiale avec des produits artisanaux."],

  ["pt", "A nossa empresa precisa de um servico de marketing digital."],
  ["pt", "Ola, somos uma loja online e queremos mais visibilidade."],
  ["pt", "Precisamos de mais clientes para a nossa empresa no Porto."],
  ["pt", "Obrigado, podem explicar como funciona o vosso servico?"],
  ["pt", "O nosso objetivo e vender mais sem baixar a margem."],

  ["de", "Wir brauchen einen besseren Service fur unser Unternehmen in Munchen."],
  ["de", "Hallo, wir sind ein Unternehmen aus Berlin und suchen Unterstutzung."],
  ["de", "Unser Unternehmen braucht mehr Sichtbarkeit bei Google."],
  ["de", "Wir haben ein neues Produkt und brauchen mehr Anfragen."],
  ["de", "Danke, koennen Sie uns mehr ueber Ihre Arbeit sagen?"],

  ["it", "La nostra azienda ha bisogno di un servizio di marketing."],
  ["it", "Ciao, siamo un'azienda di Milano e cerchiamo aiuto."],
  ["it", "Abbiamo bisogno di piu clienti per la nostra attivita."],
  ["it", "Grazie, potete spiegare come funziona questa campagna?"],
  ["it", "Il nostro obiettivo e vendere di piu senza abbassare il margine."],

  // ── Con tildes ────────────────────────────────────────────────────────────
  //
  // El corpus de arriba está escrito SIN acentos a propósito: mucha gente
  // escribe así. Pero si sólo hubiera frases sin acentos, quitar la
  // normalización no rompería nada y nadie se enteraría — de hecho, esa
  // mutación sobrevivió hasta que se añadieron estas seis.
  ["es", "Hola, ¿podrían ayudarnos con la visibilidad de nuestra tienda?"],
  ["pt", "A nossa empresa precisa de um serviço de marketing digital."],
  ["de", "Wir brauchen einen besseren Service für unser Unternehmen in München."],
  ["fr", "Notre équipe souhaite plus de visibilité dans les moteurs de recherche."],
  ["it", "Abbiamo bisogno di più clienti per la nostra attività."],
  ["pt", "Olá, precisamos de mais visibilidade para a nossa loja."],
];

describe("el detector acierta sobre un corpus, no sobre una frase suelta", () => {
  it("el corpus cubre los seis idiomas soportados", () => {
    // Sin esto, el porcentaje de abajo podría salir del 100 % midiendo un solo
    // idioma, que es la forma más fácil de aprobar sin comprobar nada.
    const cubiertos = new Set(CORPUS.map(([l]) => l));
    for (const l of LOCALES_SOPORTADOS) {
      expect(cubiertos.has(l), `el corpus no tiene frases en ${l}`).toBe(true);
    }
    expect(CORPUS.length).toBeGreaterThanOrEqual(30);
  });

  it("LA REGLA: acierta al menos el 90 % del corpus", () => {
    const fallos = CORPUS.filter(([esperado, texto]) => detectLanguageFromText(texto) !== esperado);
    const acierto = (CORPUS.length - fallos.length) / CORPUS.length;
    const detalle = fallos
      .map(([e, t]) => `  ${e} -> ${detectLanguageFromText(t)}  ${t.slice(0, 60)}`)
      .join("\n");
    expect(acierto, `acierto ${(acierto * 100).toFixed(0)} %\n${detalle}`).toBeGreaterThanOrEqual(0.9);
  });
});

describe("las cuatro regresiones concretas que fallaban", () => {
  /**
   * Cada una con su nombre. Un porcentaje agregado puede seguir alto mientras
   * vuelve exactamente el fallo de antes; estas cuatro no lo permiten.
   */
  it("alemán con «Service» ya no sale inglés", () => {
    expect(
      detectLanguageFromText("Wir brauchen einen besseren Service fur unser Unternehmen."),
    ).toBe("de");
  });

  it("francés con «service» ya no sale inglés", () => {
    expect(
      detectLanguageFromText("Bonjour, notre entreprise cherche un service de marketing."),
    ).toBe("fr");
  });

  it("francés con «besoin» y «service» ya no sale inglés", () => {
    expect(detectLanguageFromText("Nous avons besoin d'un service pour notre entreprise.")).toBe(
      "fr",
    );
  });

  it("portugués con «empresa» ya no sale español", () => {
    expect(detectLanguageFromText("A nossa empresa precisa de um servico de marketing.")).toBe("pt");
  });
});

describe("gana por margen, no por los pelos", () => {
  it("el idioma correcto puntúa claramente por encima del segundo", () => {
    // Ganar por una milésima significa que una palabra distinta lo voltea.
    for (const [esperado, texto] of CORPUS) {
      const puntos = puntuarIdiomas(texto);
      const ordenados = [...LOCALES_SOPORTADOS].sort((a, b) => puntos[b] - puntos[a]);
      if (ordenados[0] !== esperado) continue; // los fallos ya los cuenta la otra prueba
      const primero = puntos[ordenados[0]];
      const segundo = puntos[ordenados[1]];
      expect(
        primero,
        `«${texto.slice(0, 50)}» gana por muy poco: ${primero.toFixed(2)} vs ${segundo.toFixed(2)}`,
      ).toBeGreaterThan(segundo * 1.15);
    }
  });

  it("LA REGLA DEL PESO: lo compartido no se impone a lo inequívoco", () => {
    /**
     * ESTA PRUEBA EXISTE PORQUE LA MUTACIÓN SOBREVIVÍA. Quitar el peso por
     * idiomas compartidos dejaba las 36 frases del corpus en verde, así que
     * nada demostraba que el peso sirviera para algo.
     *
     * El caso está construido a propósito, no es prosa realista: aísla el
     * mecanismo. «empresa» y «que» los comparten varios idiomas; «the» y
     * «company» son sólo del inglés.
     *
     *   sin ponderar   es = 2,00   en = 2,00  -> empate, gana el de por defecto
     *   ponderando     en = 2,00   es = 1,00  -> gana el ingles, que es correcto
     *
     * Es el mismo defecto de fondo que la version anterior: dejar que las
     * palabras que todos los idiomas comparten decidan la respuesta.
     */
    expect(detectLanguageFromText("empresa que the company", "es")).toBe("en");
    expect(detectLanguageFromText("una con our need", "es")).toBe("en");
  });

  it("EL CONTROL: una palabra compartida por tres idiomas no decide sola", () => {
    // «service» está en inglés, francés y alemán. Sola, no debe elegir ninguno:
    // ese fue exactamente el defecto.
    const puntos = puntuarIdiomas("service");
    expect(puntos.en).toBeCloseTo(puntos.fr, 6);
    expect(puntos.en).toBeCloseTo(puntos.de, 6);
    // Y al no haber ganador, se devuelve el idioma por defecto en vez de rifarlo.
    expect(detectLanguageFromText("service", "es")).toBe("es");
  });

  it("LA REGLA DE LAS TILDES: escribir con acentos no cambia el idioma", () => {
    /**
     * ESTA PRUEBA TAMBIÉN NACIÓ DE UNA MUTACIÓN QUE SOBREVIVÍA. Añadir frases
     * acentuadas al corpus no bastó: esas frases traen además marcadores sin
     * tilde («precisamos», «brauchen», «unser») que ya deciden solos, así que
     * quitar la normalización no cambiaba el resultado.
     *
     * Hace falta un texto cuyo ÚNICO marcador lleve tilde. Entonces sí:
     *
     *   con normalizacion   «olá» -> «ola» -> marcador portugues -> pt
     *   sin normalizacion   «olá» no casa con nada -> sin senal -> es
     */
    expect(detectLanguageFromText("Olá, tudo bem?", "es")).toBe("pt");
    expect(detectLanguageFromText("Grüße für Sie", "es")).toBe("de");

    // Y la misma frase sin tildes tiene que dar exactamente lo mismo: quien
    // escribe sin acentos no debe recibir su trabajo en otro idioma.
    expect(detectLanguageFromText("Ola, tudo bem?", "es")).toBe("pt");
    expect(detectLanguageFromText("Grusse fur Sie", "es")).toBe("de");
  });

  it("sin texto, devuelve el idioma por defecto en vez de inventarse uno", () => {
    expect(detectLanguageFromText("", "pt")).toBe("pt");
    expect(detectLanguageFromText("   ", "de")).toBe("de");
    expect(detectLanguageFromText("12345 :::", "it")).toBe("it");
  });
});

describe("un dato declarado gana a una conjetura", () => {
  it("LA REGLA: el perfil del cliente manda sobre el texto", () => {
    const payload = { brief: "Hello, our company needs help." };
    expect(resolveAgentLocale(payload, "de")).toBe("de");
  });

  it("el encargo puede declarar su idioma, y antes se ignoraba", () => {
    // Este es el paso que faltaba: un `language` en el encargo no servía de nada.
    expect(resolveAgentLocale({ language: "de", brief: "Hello, our company." })).toBe("de");
    expect(resolveAgentLocale({ locale: "pt-BR", brief: "Hello there." })).toBe("pt");
    expect(resolveAgentLocale({ idioma: "IT", brief: "Hello there." })).toBe("it");
  });

  it("un idioma declarado que no soportamos no se cuela", () => {
    // Aceptarlo pondría en el prompt una etiqueta inexistente.
    expect(resolveAgentLocale({ language: "zz" }, null)).toBe("es");
    expect(resolveAgentLocale({}, "klingon")).toBe("es");
  });

  it("y si no hay nada declarado, se adivina del texto", () => {
    expect(resolveAgentLocale({ brief: "Wir brauchen mehr Anfragen fur unser Unternehmen." })).toBe(
      "de",
    );
  });
});

describe("el locale del cliente sale de lo que el cliente declaró", () => {
  /**
   * QUÉ SUSTITUYE. `packOrchestrator` escribía `locale: "es-ES"` a mano, con el
   * `country` del propio encargo justo al lado y sin usarlo. El dato del cliente
   * existía —`os_clients.language` entra, y el cerebro lo guarda como
   * `preferencias.idioma`— y no llegaba a ninguna parte.
   */
  it("LA REGLA: idioma y país declarados producen su locale", () => {
    expect(localeDeCliente("de", "DE")).toBe("de-DE");
    expect(localeDeCliente("pt", "BR")).toBe("pt-BR");
    expect(localeDeCliente("en", "GB")).toBe("en-GB");
  });

  it("EL CONTROL: sin idioma declarado, sigue siendo es-ES", () => {
    // Es exactamente lo que había escrito a mano. Sin esta prueba, el cambio
    // podría alterar en silencio encargos que hoy no traen el dato.
    expect(localeDeCliente(undefined, undefined)).toBe("es-ES");
    expect(localeDeCliente("", "DE")).toBe("es-ES");
    expect(localeDeCliente(null, null)).toBe("es-ES");
  });

  it("un idioma que no soportamos no se cuela en el locale", () => {
    expect(localeDeCliente("zz", "ZZ")).toBe("es-ES");
  });

  it("un país en texto libre no ensucia el locale", () => {
    // `country` es texto libre en este esquema y puede traer «Alemania».
    // Meterlo produciría `de-ALEMANIA`, que no es un locale y rompería a quien
    // lo interprete. Se cae a la región propia del idioma.
    expect(localeDeCliente("de", "Alemania")).toBe("de-DE");
    expect(localeDeCliente("pt", "")).toBe("pt-PT");
  });

  it("acepta un idioma con región y se queda con la raíz", () => {
    expect(localeDeCliente("pt-BR", "BR")).toBe("pt-BR");
    expect(localeDeCliente("DE_de", "DE")).toBe("de-DE");
  });
});

describe("la instrucción que llega al modelo dice el idioma correcto", () => {
  it("nombra el idioma y conserva la instrucción original", () => {
    const salida = localizedPrompt("Escribe un plan.", "de");
    expect(salida).toContain("Deutsch");
    expect(salida).toContain("(de)");
    expect(salida).toContain("Escribe un plan.");
  });

  it("EL CONTROL: no nombra un idioma que no es", () => {
    // Sin esto, `localizedPrompt` podría devolver siempre lo mismo y la prueba
    // de arriba seguiría verde por la parte de «conserva la instrucción».
    expect(localizedPrompt("x", "de")).not.toContain("English");
    expect(localizedPrompt("x", "en")).not.toContain("Deutsch");
  });
});
