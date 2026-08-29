/**
 * NELVYON ES LA AGENCIA.
 *
 * EL INVARIANTE DE NEGOCIO, y no es una preferencia de redacción:
 *
 *     NELVYON es una agencia de marketing digital con plataforma, IA, agentes
 *     y sistema operativo propios. Un cliente la descubre, habla con ella,
 *     explica qué necesita y NELVYON HACE EL SERVICIO COMPLETO.
 *
 *     NO es un SaaS donde el cliente paga para hacerse él mismo el marketing.
 *
 * POR QUÉ HACE FALTA UNA PRUEBA PARA ESTO. Porque la deriva es silenciosa y
 * llega por copiar y pegar. Cuando esta prueba se escribió había tres sitios
 * diciendo «sin agencia»:
 *
 *   · `sectors/ads/shared.ts`, en las INSTRUCCIONES QUE RECIBE EL AGENTE. Es
 *     el peor de los tres: cada texto que ese agente produce sale con la idea
 *     de que aquí no hay agencia — y aquí la agencia es todo.
 *   · dos textos de la web pública.
 *
 * Ninguno era malicioso: son frases que suenan bien en marketing de producto y
 * que dicen exactamente lo contrario de lo que NELVYON es. Un cliente que lee
 * «sin agencia» entiende que va a tener que hacerlo él.
 *
 * LO QUE ESTA PRUEBA NO HACE. No juzga el estilo ni prohíbe hablar de IA ni de
 * automatización: NELVYON tiene las dos cosas y son parte de lo que la
 * distingue. Lo único que persigue son las fórmulas que niegan que haya alguien
 * haciendo el trabajo por el cliente.
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const RAIZ = path.resolve(__dirname, "..", "..");

/**
 * Las fórmulas que contradicen el modelo. Cada una con el porqué, para que
 * quien se tope con esta prueba en rojo entienda qué se le está pidiendo en vez
 * de buscar cómo callarla.
 */
const CONTRADICCIONES: ReadonlyArray<{ patron: RegExp; porQue: string }> = [
  {
    patron: /\bsin\s+agencias?\b/i,
    porQue:
      "NELVYON ES la agencia. «Sin agencia» le dice al cliente que tendrá que hacerlo él, " +
      "que es exactamente lo contrario de lo que se le vende.",
  },
  {
    patron: /\b(sustituye|reemplaza|olvídate\s+de)\s+(a\s+)?(tu\s+|la\s+|una\s+)?agencia\b/i,
    porQue:
      "Posicionarse como sustituto de una agencia es posicionarse como herramienta. " +
      "NELVYON no sustituye a la agencia: es la agencia.",
  },
  {
    patron: /\bhazlo\s+t[úu]\s+mismo\b/i,
    porQue: "El cliente no hace el marketing. Lo hace NELVYON.",
  },
  {
    patron: /\bt[úu]\s+mismo\s+(creas|gestionas|lanzas|ejecutas)\b/i,
    porQue: "Otra vez el autoservicio: el cliente explica qué necesita, no lo ejecuta.",
  },
  {
    patron: /\bsin\s+(que\s+)?(necesites|hacer\s+falta)\s+(una\s+)?agencia\b/i,
    porQue: "Misma idea con otras palabras.",
  },
];

/**
 * Dónde se mira.
 *
 * Las instrucciones de los agentes y los textos que ve un cliente. NO se miran
 * los comentarios de código ni esta prueba: lo que importa es lo que LEE una
 * persona, no lo que se explica entre desarrolladores.
 */
const DONDE = [
  "backend/os-agents/sectors",
  "backend/os-agents/prompts",
  "apps/web/src/components/marketing",
  "apps/web/src/components/nelvyon-site",
  "apps/web/public/www",
];

function ficheros(dir: string): string[] {
  const abs = path.join(RAIZ, dir);
  if (!fs.existsSync(abs)) return [];
  const fuera: string[] = [];
  const recorrer = (d: string): void => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (e.name === "node_modules" || e.name === "__tests__" || e.name === "assets") continue;
        recorrer(p);
      } else if (/\.(ts|tsx|html)$/.test(e.name)) {
        fuera.push(p);
      }
    }
  };
  recorrer(abs);
  return fuera;
}

/**
 * Quita comentarios antes de buscar.
 *
 * Sin esto, el propio comentario que explica por qué algo está mal haría fallar
 * la prueba — y la forma más rápida de arreglarlo sería borrar la explicación,
 * que es justo lo contrario de lo que interesa.
 */
function sinComentarios(texto: string): string {
  return texto
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/<!--[\s\S]*?-->/g, "");
}

describe("NELVYON es la agencia, no una herramienta de autoservicio", () => {
  const todos = DONDE.flatMap(ficheros);

  it("hay algo que mirar: el barrido encuentra ficheros", () => {
    // Sin esto, un cambio de rutas dejaría la prueba mirando el vacío y
    // pasando siempre. Un guardián que no mira es peor que ninguno.
    expect(todos.length, "el barrido no encuentra ficheros: mira donde no hay nada").toBeGreaterThan(50);
  });

  for (const { patron, porQue } of CONTRADICCIONES) {
    it(`ningún texto dice ${patron.source}`, () => {
      const encontrados: string[] = [];
      for (const f of todos) {
        const contenido = sinComentarios(fs.readFileSync(f, "utf8"));
        const m = patron.exec(contenido);
        if (m) {
          const i = Math.max(0, m.index - 60);
          encontrados.push(
            `${path.relative(RAIZ, f).replace(/\\/g, "/")}: «…${contenido.slice(i, m.index + 60).replace(/\s+/g, " ").trim()}…»`,
          );
        }
      }
      expect(encontrados, porQue).toEqual([]);
    });
  }

  it("EL CONTROL POSITIVO: la prueba SÍ detectaría una contradicción", () => {
    // Sin este control, una expresión mal escrita no encontraría nunca nada y
    // las pruebas de arriba pasarían para siempre sobre una web que dijera lo
    // contrario de lo que NELVYON es.
    const texto = "Rankings y autoridad orgánica sin agencia, a tu ritmo.";
    const alguna = CONTRADICCIONES.some((c) => c.patron.test(texto));
    expect(alguna, "las expresiones no detectan ni el caso que motivó esta prueba").toBe(true);
  });

  it("Y NO se ceba con lo que sí es NELVYON", () => {
    // IA, automatización y agentes son parte de lo que NELVYON es. Esta prueba
    // no persigue eso: una regla que suspende lo correcto se acaba desactivando.
    const legitimos = [
      "Diseñamos y operamos captación, publicidad, SEO y contenidos.",
      "Agentes de IA propios que ejecutan el trabajo de tu cuenta.",
      "Automatizamos lo repetitivo para dedicar el tiempo a lo que decide.",
      "Nuestra agencia trabaja con IA propia, no con una envoltura de otra.",
    ];
    for (const t of legitimos) {
      expect(
        CONTRADICCIONES.some((c) => c.patron.test(t)),
        `«${t}» es correcto y la prueba lo suspende`,
      ).toBe(false);
    }
  });
});
