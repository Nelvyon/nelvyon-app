/**
 * PROVIDER_REAL_OUTPUT_VERIFICATION: se comprueba, no se supone.
 *
 * ── QUÉ ESTABA ETIQUETADO COMO EXTERNO, Y NO LO ERA ─────────────────────────
 *
 * Ocho comprobaciones de calidad llevaban meses declaradas «bloqueadas: hace
 * falta un modelo real que emita la ficha». Nadie lo había intentado. Y «nadie
 * lo ha comprobado» no es «no se puede»: son dos frases distintas que se venían
 * escribiendo igual.
 *
 * En esta máquina hay un Ollama con `llama3.1:8b-instruct-q4_K_M`, que es
 * EXACTAMENTE el camino por defecto de los agentes de servicio (ADR-034:
 * Ollama primero, OpenAI solo con opt-in explícito). O sea, verificar aquí no
 * es verificar un sustituto: es verificar el proveedor real.
 *
 * ── POR QUÉ ESTO NO ES UN MOCK ──────────────────────────────────────────────
 *
 * No se dobla nada. Se construye la instrucción REAL —la que
 * `instruccionDeFicha` genera a partir de lo que el motor de calidad necesita—,
 * se manda al modelo REAL, y se pasa la respuesta por el filtro REAL. Si el
 * modelo contestara prosa, o inventara los nombres de los campos, esto se pone
 * rojo.
 *
 * ── CRITERIO DE APROBADO ────────────────────────────────────────────────────
 *
 *   1. el modelo devuelve JSON parseable;
 *   2. del que sobrevive al filtro AL MENOS UN campo de los pedidos;
 *   3. y con esa ficha, la comprobación que lo lee DEJA de decir «no se pudo
 *      comprobar».
 *
 * El punto 3 es el que importa: emitir la forma no sirve de nada si la
 * comprobación sigue sin dispararse. Es el eslabón que faltaba, y es el que se
 * mide.
 *
 * ── SI NO HAY MODELO ────────────────────────────────────────────────────────
 *
 * Se salta. No falla: en un portátil sin Ollama no hay nada roto. Lo que no se
 * hace es dar por recorrido un camino que no se ha recorrido.
 *
 * COSTE EXTERNO: 0,00 EUR. Todo ocurre contra 127.0.0.1, sobre hardware que ya
 * estaba encendido. Ninguna credencial, ningún proveedor de pago.
 */
import { describe, expect, it } from "vitest";
import path from "node:path";

import { comprobacionesDe } from "../MotorDeCalidad";
import { fichaDe, QUIEN_LEE_CADA_CAMPO } from "../contratoDeSalidaEstructurada";
import { camposQuePide, instruccionDeFicha, pedirLaFicha } from "../laFichaQueFaltaba";
import { parseJsonFromLlm } from "../../autonomous/llm/parseJson";
import { escribirEvidencia } from "../../evidencia/escribirEvidencia";

const RAIZ = path.resolve(__dirname, "..", "..", "..");

/** Un salto de línea, con nombre para no pelearse con el escape. */
const SALTO = String.fromCharCode(10);
const BASE = process.env.OLLAMA_HOST?.trim() || "http://127.0.0.1:11434";

async function modelosInstalados(): Promise<string[] | null> {
  try {
    const r = await fetch(`${BASE}/api/tags`, { signal: AbortSignal.timeout(3_000) });
    if (!r.ok) return null;
    const j = (await r.json()) as { models?: Array<{ name?: string }> };
    return (j.models ?? []).map((m) => m.name ?? "").filter(Boolean);
  } catch {
    return null;
  }
}

const modelos = await modelosInstalados();
const hayModelo = Array.isArray(modelos) && modelos.length > 0;
const conModelo = hayModelo ? describe : describe.skip;

/** El de instrucciones más grande, que es el que se usaría de verdad. */
const MODELO =
  modelos?.find((m) => /llama3\.1:8b/i.test(m)) ??
  modelos?.find((m) => !/embed/i.test(m)) ??
  "";

/**
 * El modelo real, hablado como lo habla el cliente de los agentes: un texto
 * entra, un texto sale.
 */
const modeloReal = {
  async complete(prompt: string): Promise<string> {
    const r = await fetch(`${BASE}/api/generate`, {
      method: "POST",
      body: JSON.stringify({
        model: MODELO,
        prompt,
        format: "json",
        stream: false,
        options: { temperature: 0 },
      }),
      signal: AbortSignal.timeout(120_000),
    });
    const j = (await r.json()) as { response?: string };
    return j.response ?? "";
  },
};

/**
 * Un entregable por disciplina, escrito como lo escribiría un agente: en prosa,
 * no en campos.
 *
 * Cada uno lleva a propósito un problema REAL —tres llamadas principales, un
 * formulario que pide de más, dos páginas peleando por la misma búsqueda, el
 * precio al final, cero criterios de cualificación— porque si el modelo los
 * extrae bien, las comprobaciones tienen que suspender. Un caso perfecto no
 * distinguiría «se leyó bien» de «no se leyó nada».
 */
const ENTREGABLES: Readonly<Record<string, unknown>> = {
  web: {
    serviceId: "web_premium",
    steps: [{ name: "design_proposal", data: { output: [
      "Propuesta de web para Panaderia Aurora, panaderia artesana de barrio en Bilbao.",
      "El hero dice: Pan de masa madre horneado cada manana.",
      "Los botones principales son: Ver la carta, Reservar mesa y Llamar ahora.",
      "El formulario de contacto pide nombre, email, telefono, empresa, cargo,",
      "presupuesto y como nos conociste; todos obligatorios menos el mensaje.",
    ].join(SALTO) } }],
  },
  seo: {
    serviceId: "seo_premium",
    steps: [{ name: "plan", data: { output: [
      "Plan de contenidos para Panaderia Aurora.",
      "Pagina /pan-artesano: quiere ganar la busqueda pan artesano bilbao.",
      "Pagina /masa-madre: tambien quiere ganar pan artesano bilbao.",
      "Pagina /contacto: quiere ganar contacto panaderia bilbao.",
    ].join(SALTO) } }],
  },
  ecommerce: {
    serviceId: "ecommerce_premium",
    steps: [{ name: "checkout", data: { output: [
      "El proceso de compra tiene cuatro pasos: cesta, datos, envio y pago.",
      "El precio total con impuestos se ve en el paso cuatro, al final.",
      "Los gastos de envio se muestran en el ultimo paso, justo antes de pagar.",
    ].join(SALTO) } }],
  },
  crm: {
    serviceId: "crm_captacion_premium",
    steps: [{ name: "flujo", data: { output: [
      "Todos los contactos que llegan por el formulario entran igual en el CRM.",
      "No se separan por tamano, ni por presupuesto, ni por sector:",
      "no hay ningun criterio para decir si un lead es bueno o malo.",
    ].join(SALTO) } }],
  },
  creatividad: {
    serviceId: "diseno_grafico_creatividades_premium",
    steps: [{ name: "pieza", data: { output: [
      "Creatividad para redes: texto gris claro (#B8B8B8) sobre fondo blanco (#FFFFFF).",
      "El ratio de contraste entre el texto y su fondo es de 1.9 a 1.",
    ].join(SALTO) } }],
  },
  reporting: {
    serviceId: "analitica_atribucion_premium",
    steps: [{ name: "informe", data: { output: [
      "Informe mensual. La primera seccion explica la metodologia de atribucion",
      "y las fuentes de datos usadas. Los resultados del cliente vienen despues.",
    ].join(SALTO) } }],
  },
};

conModelo("un modelo REAL emite la ficha que las ocho esperaban", () => {
  /** Lo que se va midiendo, para dejarlo escrito al final. */
  const medido: Array<{
    dominio: string;
    camposPedidos: string[];
    camposEmitidos: string[];
    comprobacionesQueYaJuzgan: string[];
  }> = [];

  for (const dominio of Object.keys(ENTREGABLES)) {
    it(
      `${dominio}: el modelo emite sus campos y sus comprobaciones dejan de callarse`,
      async () => {
        const pedidos = camposQuePide(dominio);
        expect(
          pedidos.length,
          `la disciplina ${dominio} no pide ningún campo: el barrido mira mal`,
        ).toBeGreaterThan(0);
        expect(instruccionDeFicha(dominio), "no hay instrucción que mandar").toBeTruthy();

        const ficha = await pedirLaFicha(dominio, ENTREGABLES[dominio], modeloReal, "ollama");
        const llegaron = Object.keys(ficha);

        expect(
          llegaron.length,
          `el modelo real no emitió NINGÚN campo para ${dominio} (pedidos: ${pedidos.join(", ")}). ` +
            "Con esto, sus comprobaciones siguen sin poder dispararse.",
        ).toBeGreaterThan(0);

        // Nada que no se haya pedido: un campo de más es un campo inventado.
        for (const campo of llegaron) {
          expect(pedidos, `el modelo devolvió «${campo}», que no se le pidió`).toContain(campo);
        }

        // EL ESLABÓN QUE FALTABA: con la ficha delante, ¿juzgan?
        const juzgan: string[] = [];
        for (const campo of llegaron) {
          const id = QUIEN_LEE_CADA_CAMPO[campo as keyof typeof QUIEN_LEE_CADA_CAMPO];
          const comprobacion = comprobacionesDe(dominio).find((c) => c.id === id);
          if (!comprobacion) continue;
          const veredicto = comprobacion.evaluar({
            dominio,
            autor: "agente",
            contenido: { ...ficha, texto: "entregable" },
          });
          expect(
            veredicto,
            `«${id}» sigue diciendo «no se pudo comprobar» con la ficha del modelo real delante`,
          ).not.toBeUndefined();
          juzgan.push(id);
        }
        expect(
          juzgan.length,
          `en ${dominio} ninguna comprobación llegó a juzgar: emitir la forma no basta`,
        ).toBeGreaterThan(0);

        medido.push({
          dominio,
          camposPedidos: [...pedidos].sort(),
          camposEmitidos: llegaron.sort(),
          comprobacionesQueYaJuzgan: juzgan.sort(),
        });
      },
      150_000,
    );
  }

  it("lo que devuelve es JSON de verdad, no prosa con pinta de JSON", async () => {
    // Si el modelo contestara texto, `parseJsonFromLlm` devolvería null y la
    // ficha saldría vacía sin que nadie supiera por qué. Se separa a propósito
    // para que el motivo del fallo sea legible.
    const entregable = ENTREGABLES.web as { steps: Array<{ data: { output: string } }> };
    const bruto = await modeloReal.complete(
      `${entregable.steps[0].data.output}${SALTO}${SALTO}${instruccionDeFicha("web")}`,
    );
    const objeto = parseJsonFromLlm(bruto);
    expect(
      objeto,
      `el modelo no devolvió JSON parseable. Devolvió: ${bruto.slice(0, 200)}`,
    ).toBeTruthy();
    expect(Object.keys(fichaDe(objeto)).length).toBeGreaterThan(0);
  }, 150_000);

  it("queda escrito qué se midió, disciplina por disciplina", () => {
    // Va el último a propósito: recoge lo que dejaron los de arriba. Si alguno
    // no llegó a medir, aquí se nota.
    expect(
      medido.length,
      "no se midió ninguna disciplina; la evidencia estaría mintiendo por omisión",
    ).toBe(Object.keys(ENTREGABLES).length);

    escribirEvidencia(path.join(RAIZ, "docs", "evidence", "ficha_de_modelo_real.json"), {
      _lee_esto: [
        "PROVIDER_REAL_OUTPUT_VERIFICATION medido contra un modelo REAL local.",
        "No hay dobles: la instruccion es la que genera instruccionDeFicha y la",
        "respuesta pasa por el mismo filtro que usa el manejador de servicios.",
        "Coste 0 EUR: Ollama sobre hardware que ya estaba encendido, que es el",
        "camino por defecto de los agentes (ADR-034).",
      ],
      generado: new Date().toISOString(),
      proveedor: "ollama",
      modelo: MODELO,
      costeEuros: 0,
      porDisciplina: [...medido].sort((a, b) => a.dominio.localeCompare(b.dominio)),
      comprobacionesVerificadas: [
        ...new Set(medido.flatMap((m) => m.comprobacionesQueYaJuzgan)),
      ].sort(),
    });
  });
});
