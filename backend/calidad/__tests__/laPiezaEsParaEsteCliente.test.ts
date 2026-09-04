/**
 * Una pieza impecable para el cliente equivocado.
 *
 * ── EL HUECO QUE CIERRA ─────────────────────────────────────────────────────
 *
 * El motor tenía 79 comprobaciones en 18 disciplinas y ni una miraba el idioma,
 * el país o el mercado. Medido: cero apariciones de «idioma», «país»,
 * «language» o «country» en 1.647 líneas.
 *
 * Es el fallo más silencioso que puede cometer una agencia. Una landing en
 * español para una clínica de Lyon pasa TODO lo que había: un solo H1, un solo
 * CTA, imágenes con alt, titular que cabe. Está bien hecha, y no sirve de nada.
 * Ninguna prueba de código lo detecta, porque no hay nada roto.
 *
 * ── LO QUE MÁS SE PRUEBA AQUÍ ───────────────────────────────────────────────
 *
 * Los falsos positivos, no los aciertos. Un detector de idioma que acuse a una
 * pieza correcta hace que se deje de mirar el motor entero — y entonces las
 * otras 79 comprobaciones tampoco protegen de nada. Por eso hay tantos casos de
 * «esto NO debe saltar» como de «esto sí».
 *
 * COSTE EXTERNO: 0 EUR. Todo determinista, sin modelo.
 */
import { describe, expect, it } from "vitest";

import { detectarIdioma } from "../esParaEsteCliente";
import { MotorDeCalidad, type Pieza } from "../MotorDeCalidad";

const motor = new MotorDeCalidad();

const juzgar = (p: Partial<Pieza>) =>
  motor.evaluar({ dominio: "copy", autor: "productor", contenido: {}, ...p }, "qa");

const hallazgo = (r: ReturnType<typeof juzgar>, id: string) =>
  r.hallazgos.find((h) => h.id === id);

/** Prosa de longitud realista: por debajo de 25 palabras no se opina. */
const ES = `Somos una clínica dental en el centro de la ciudad y llevamos más de veinte
  años cuidando de las sonrisas de nuestros pacientes. Nuestro equipo combina la
  experiencia de los mejores profesionales con la tecnología más avanzada para que
  cada tratamiento sea lo más cómodo posible para ti y para los tuyos.`;

const FR = `Nous sommes une clinique dentaire située au centre de la ville et nous prenons
  soin des sourires de nos patients depuis plus de vingt ans. Notre équipe associe
  l'expérience des meilleurs professionnels aux technologies les plus avancées pour
  que chaque traitement soit le plus confortable possible pour vous et pour les vôtres.`;

const EN = `We are a dental clinic in the city centre and we have been taking care of our
  patients smiles for more than twenty years. Our team combines the experience of the
  best professionals with the most advanced technology so that every treatment is as
  comfortable as it can be for you and for your family.`;

describe("la pieza es para ESTE cliente", () => {
  // ── IDIOMA ────────────────────────────────────────────────────────────────

  it("LA REGLA: una pieza en español para un cliente francés se BLOQUEA", () => {
    const r = juzgar({ contenido: { texto: ES }, contexto: { idioma: "fr" } });
    const h = hallazgo(r, "en-el-idioma-del-cliente");

    expect(h, "una landing en el idioma equivocado pasó el control").toBeDefined();
    expect(h!.gravedad).toBe("bloqueante");
    expect(h!.quePasa).toMatch(/fr/);
  });

  it("y el motivo dice qué idioma se pidió y cuál llegó", () => {
    // «No cumple los criterios» no sirve para arreglarlo. Hay que poder leer el
    // hallazgo y saber qué rehacer.
    const r = juzgar({ contenido: { texto: EN }, contexto: { idioma: "es" } });
    expect(hallazgo(r, "en-el-idioma-del-cliente")!.quePasa).toMatch(/«es».*«en»/);
  });

  it("NO salta cuando el idioma coincide", () => {
    expect(
      hallazgo(juzgar({ contenido: { texto: ES }, contexto: { idioma: "es" } }), "en-el-idioma-del-cliente"),
    ).toBeUndefined();
    expect(
      hallazgo(juzgar({ contenido: { texto: FR }, contexto: { idioma: "fr" } }), "en-el-idioma-del-cliente"),
    ).toBeUndefined();
  });

  it("NO opina sobre un texto corto: tres palabras no dicen el idioma", () => {
    // Un titular de cuatro palabras puede ser de cualquier idioma. Acusarlo
    // sería inventarse una certeza.
    const r = juzgar({ contenido: { titular: "Premium digital marketing" }, contexto: { idioma: "es" } });
    expect(hallazgo(r, "en-el-idioma-del-cliente")).toBeUndefined();
  });

  it("mira también el texto ANIDADO, no sólo el de primer nivel", () => {
    // Casi ninguna pieza real trae la prosa en una clave llana.
    const r = juzgar({
      dominio: "web",
      contenido: { secciones: [{ bloques: [{ cuerpo: EN }] }] },
      contexto: { idioma: "es" },
    });
    expect(hallazgo(r, "en-el-idioma-del-cliente"), "no encontró el texto anidado").toBeDefined();
  });

  // ── LOS FALSOS POSITIVOS, QUE SON LO QUE IMPORTA ──────────────────────────

  it("NO acusa a una pieza en catalán de estar en español", () => {
    // Comparten muchísimas palabras función. Sin margen de decisión, el
    // detector confundiría uno con otro — y un falso positivo aquí enseña a
    // ignorar el motor entero.
    const ca = `Som una clínica dental al centre de la ciutat i fa més de vint anys que
      tenim cura dels somriures dels nostres pacients. El nostre equip combina
      l'experiència dels millors professionals amb la tecnologia més avançada perquè
      cada tractament sigui el més còmode possible per a tu i per als teus.`;
    const r = juzgar({ contenido: { texto: ca }, contexto: { idioma: "ca" } });
    expect(hallazgo(r, "en-el-idioma-del-cliente")).toBeUndefined();
  });

  it("NO APLICA cuando nadie declaró el idioma, y eso no escala a revisión", () => {
    // Es la distinción que casi rompe el motor: devolver «no se pudo comprobar»
    // aquí mandaba a revisión humana TODA acción de alto riesgo, porque ninguna
    // llamada pasa todavía el idioma. Un hueco de la ficha del cliente no puede
    // castigarse en la pieza.
    const r = juzgar({ contenido: { texto: ES }, riesgo: "alto" });
    expect(r.noComprobado.map((n) => n.id)).not.toContain("en-el-idioma-del-cliente");
  });

  // ── MERCADO ───────────────────────────────────────────────────────────────

  it("detecta la plantilla reciclada de otro país: dólares para un cliente español", () => {
    const r = juzgar({
      contenido: { texto: ES, oferta: "Primera consulta por $49" },
      contexto: { idioma: "es", mercado: "ES" },
    });
    const h = hallazgo(r, "para-el-mercado-del-cliente");
    expect(h, "una oferta en dólares pasó para un cliente español").toBeDefined();
    expect(h!.quePasa).toMatch(/d[óo]lares/);
  });

  it("detecta normativa europea colada en una pieza para EE. UU.", () => {
    const r = juzgar({
      contenido: { texto: EN, aviso: "Cumplimos el RGPD y la LOPDGDD" },
      contexto: { mercado: "US" },
    });
    expect(hallazgo(r, "para-el-mercado-del-cliente")).toBeDefined();
  });

  it("NO salta cuando la pieza usa la moneda de su propio mercado", () => {
    const r = juzgar({
      contenido: { texto: ES, oferta: "Primera consulta por 49 €" },
      contexto: { idioma: "es", mercado: "ES" },
    });
    expect(hallazgo(r, "para-el-mercado-del-cliente")).toBeUndefined();
  });

  // ── HECHOS DEL NEGOCIO ────────────────────────────────────────────────────

  it("desmiente un año de fundación inventado cuando el verdadero consta", () => {
    // «Desde 1985» queda bien en cualquier titular y nadie lo verifica. Cuando
    // NELVYON sabe el año de verdad, eso deja de ser licencia creativa.
    const r = juzgar({
      contenido: { titular: "Desde 1985 cuidando sonrisas", texto: ES },
      contexto: { idioma: "es", datosDelCliente: { anioDeFundacion: 2019 } },
    });
    const h = hallazgo(r, "no-inventa-la-historia-del-cliente");
    expect(h, "publicó una fecha falsa en nombre del cliente").toBeDefined();
    expect(h!.quePasa).toMatch(/1985.*2019/);
  });

  it("NO salta cuando el año dicho es el que consta", () => {
    const r = juzgar({
      contenido: { titular: "Desde 2019 cuidando sonrisas", texto: ES },
      contexto: { idioma: "es", datosDelCliente: { anioDeFundacion: 2019 } },
    });
    expect(hallazgo(r, "no-inventa-la-historia-del-cliente")).toBeUndefined();
  });

  it("NO inventa una acusación cuando el dato no consta", () => {
    // Sin año en la ficha no se puede desmentir nada, e inventarse la acusación
    // sería el mismo error que inventarse el hecho.
    const r = juzgar({
      contenido: { titular: "Desde 1985 cuidando sonrisas", texto: ES },
      contexto: { idioma: "es" },
    });
    expect(hallazgo(r, "no-inventa-la-historia-del-cliente")).toBeUndefined();
  });

  // ── APLICA A TODAS LAS DISCIPLINAS ────────────────────────────────────────

  it("aplica en TODAS las disciplinas: un anuncio en el idioma equivocado lo está igual", () => {
    for (const dominio of ["copy", "ads", "seo", "email", "web", "social"]) {
      const r = motor.evaluar(
        { dominio, autor: "productor", contenido: { texto: EN }, contexto: { idioma: "es" } },
        "qa",
      );
      expect(
        hallazgo(r, "en-el-idioma-del-cliente"),
        `«${dominio}» no comprueba el idioma`,
      ).toBeDefined();
    }
  });

  // ── EL DETECTOR, POR SEPARADO ─────────────────────────────────────────────

  it("el detector reconoce los idiomas que dice reconocer", () => {
    // CONTROL. Si devolviera siempre «es», todo lo de arriba pasaría por los
    // motivos equivocados.
    expect(detectarIdioma(ES)!.idioma).toBe("es");
    expect(detectarIdioma(FR)!.idioma).toBe("fr");
    expect(detectarIdioma(EN)!.idioma).toBe("en");
  });

  it("el detector se calla por debajo del mínimo de palabras", () => {
    expect(detectarIdioma("Hola qué tal")).toBeNull();
  });
});
