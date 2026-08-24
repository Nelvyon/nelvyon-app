/**
 * BLOQUE 3 · el coste y la puerta de entrada.
 *
 * Dos cosas que van juntas más de lo que parece:
 *
 *   - **`isOsOpenAiAllowed`** decide si sale una llamada que se factura. Cuatro
 *     condiciones tienen que cumplirse a la vez, y la primera es el interruptor
 *     maestro. Cada una que se pudiera saltar es dinero del fundador.
 *   - **`validateIntake`** decide si un encargo entra. Un encargo incompleto que
 *     se acepta se convierte en un agente trabajando sobre huecos, es decir, en
 *     un entregable inventado.
 */
import { afterEach, describe, expect, it } from "vitest";

import { isOsOllamaConfigured, isOsOpenAiAllowed } from "../LlmClient";
import { getSchemaForService, validateIntake } from "../IntakeFormService";

const ENTORNO = { ...process.env };

afterEach(() => {
  process.env = { ...ENTORNO };
});

/** Deja el entorno en la única combinación que SÍ permitiría gastar. */
function entornoQuePermitiriaGastar() {
  process.env.NELVYON_AI_ENABLED = "1";
  process.env.AUTONOMOUS_ALLOW_OPENAI = "1";
  process.env.OPENAI_API_KEY = "sk-clave-de-prueba-que-no-se-usa";
  process.env.PRIVATE_MODE = "0";
}

describe("BLOQUE 3 · la puerta del gasto", () => {
  it("EL CONTROL: con las cuatro condiciones a favor, se permitiria", () => {
    // Sin este control, una funcion que devolviera `false` siempre pasaria todas
    // las pruebas de abajo. "Nunca gasta" no es la propiedad buscada: la
    // propiedad es "no gasta cuando alguna condicion falta".
    entornoQuePermitiriaGastar();
    expect(isOsOpenAiAllowed()).toBe(true);
  });

  it("el INTERRUPTOR MAESTRO manda por encima de todo lo demas", () => {
    // Aunque exista una clave, aunque este explicitamente permitido, aunque no
    // haya modo privado. Es la garantia que sostiene "coste externo = 0".
    entornoQuePermitiriaGastar();
    process.env.NELVYON_AI_ENABLED = "0";
    expect(isOsOpenAiAllowed()).toBe(false);
  });

  it("sin la autorizacion explicita, no se gasta aunque haya clave", () => {
    entornoQuePermitiriaGastar();
    delete process.env.AUTONOMOUS_ALLOW_OPENAI;
    expect(isOsOpenAiAllowed()).toBe(false);
  });

  it("sin clave no se gasta, aunque este todo lo demas a favor", () => {
    entornoQuePermitiriaGastar();
    delete process.env.OPENAI_API_KEY;
    expect(isOsOpenAiAllowed()).toBe(false);
  });

  it("en modo privado sin ventana autorizada, no se sale a internet", () => {
    entornoQuePermitiriaGastar();
    process.env.PRIVATE_MODE = "1";
    delete process.env.PRIVATE_MODE_INTERNET_UNTIL;
    expect(isOsOpenAiAllowed()).toBe(false);
  });

  it("una clave presente por accidente no basta para gastar", () => {
    // El escenario que el fundador nombro: que exista una API key sin querer.
    // Con el interruptor apagado tiene que dar igual.
    process.env = { ...ENTORNO };
    process.env.OPENAI_API_KEY = "sk-una-clave-olvidada-en-el-entorno";
    process.env.NELVYON_AI_ENABLED = "0";
    expect(isOsOpenAiAllowed()).toBe(false);
  });

  it("la deteccion de Ollama no depende de ninguna clave de pago", () => {
    // La IA propia es la alternativa sin coste, y su deteccion tiene que ser
    // independiente: si dependiera de la clave de OpenAI, apagar el gasto
    // apagaria tambien lo gratuito.
    process.env = { ...ENTORNO };
    delete process.env.OPENAI_API_KEY;
    process.env.OLLAMA_HOST = "http://127.0.0.1:11434";
    expect(isOsOllamaConfigured()).toBe(true);
  });

  it("sin ninguna variable de Ollama, no se finge que esta configurado", () => {
    process.env = { ...ENTORNO };
    for (const k of [
      "OLLAMA_CONFIGURED",
      "OLLAMA_HOST",
      "OLLAMA_BASE_URL",
      "NELVYON_LOCAL_AI_URL",
      "LOCAL_AI_BASE_URL",
    ]) {
      delete process.env[k];
    }
    expect(isOsOllamaConfigured()).toBe(false);
  });
});

describe("BLOQUE 3 · la puerta de entrada del encargo", () => {
  it("EL CONTROL: hay esquema para un servicio real", () => {
    const campos = getSchemaForService("seo_premium");
    expect(campos.length).toBeGreaterThan(0);
  });

  /**
   * Rellena un campo con un valor valido segun su tipo Y su semantica.
   *
   * El validador es mas estricto que el tipo declarado: un campo de URL exige
   * esquema `http(s)://` y uno de color exige hexadecimal. Eso esta bien -son
   * las dos formas mas comunes de que un dato entre roto- y significa que la
   * fixture tiene que respetarlo en vez de rellenar con texto cualquiera.
   */
  function valorValido(c: {
    name: string;
    type: string;
    options?: readonly unknown[];
    minItems?: number;
  }): unknown {
    if (c.type === "multiselect") {
      return (c.options ?? ["uno", "dos"]).slice(0, Math.max(1, c.minItems ?? 1));
    }
    // Las opciones de un `select` son objetos `{value,label}`, no cadenas. Pasar
    // el objeto entero hacia guardar algo que no es texto y el validador lo
    // marcaba como "Requerido" -correctamente-.
    if (c.type === "select") {
      const primera = c.options?.[0] as unknown;
      if (primera && typeof primera === "object" && "value" in primera) {
        return String((primera as { value: unknown }).value);
      }
      return typeof primera === "string" ? primera : "opcion";
    }
    if (c.type === "boolean") return true;
    if (c.type === "number") return 3;
    if (/url/i.test(c.name)) return "https://ejemplo.test/pagina";
    if (/color/i.test(c.name)) return "#2b6cb0";
    return "Respuesta valida y suficientemente larga";
  }

  function encargoCompleto(servicio: string): Record<string, unknown> {
    const datos: Record<string, unknown> = {};
    for (const c of getSchemaForService(servicio)) datos[c.name] = valorValido(c);
    return datos;
  }

  it("un encargo COMPLETO se acepta", () => {
    // Sin esto, un validador que rechazara todo pasaria las pruebas negativas y
    // dejaria el producto sin poder aceptar un solo encargo.
    const r = validateIntake("seo_premium", encargoCompleto("seo_premium"));
    expect(r.valid, `rechazo un encargo completo: ${JSON.stringify(r)}`).toBe(true);
  });

  it("un encargo VACIO se rechaza", () => {
    // Aceptarlo significaria poner a un agente a trabajar sobre huecos, y un
    // agente que rellena huecos es un agente que inventa.
    const r = validateIntake("seo_premium", {});
    expect(r.valid).toBe(false);
  });

  it("faltar un campo obligatorio se detecta y se dice CUAL", () => {
    // Un rechazo que no dice que falta obliga a adivinar, y quien adivina acaba
    // rellenando con cualquier cosa para pasar.
    const obligatorio = getSchemaForService("seo_premium").find((c) => c.required);
    expect(obligatorio, "el esquema no tiene ningun campo obligatorio").toBeTruthy();

    const datos = encargoCompleto("seo_premium");
    delete datos[obligatorio!.name];

    const r = validateIntake("seo_premium", datos);
    expect(r.valid).toBe(false);
    expect(JSON.stringify(r)).toContain(obligatorio!.name);
  });

  it("un servicio desconocido recibe los campos BASE, no un esquema inventado", () => {
    // Devolver los campos comunes es correcto -son los que todo encargo
    // necesita-. Lo que seria un fallo es inventar campos especificos de un
    // servicio que no existe, porque haria creer que el encargo esta cubierto.
    const base = getSchemaForService("servicio_que_no_existe");
    const conocido = getSchemaForService("seo_premium");
    expect(base.length).toBeGreaterThan(0);
    expect(base.length).toBeLessThanOrEqual(conocido.length);
    expect(base.every((c) => conocido.some((k) => k.name === c.name))).toBe(true);
  });
});
