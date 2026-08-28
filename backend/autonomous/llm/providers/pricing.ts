/**
 * Tarifas para estimar coste SIN llamar a nadie.
 *
 * Es una tabla estática a propósito: consultar la tarifa real exigiría una
 * llamada de red a un proveedor, y aquí el coste externo tiene que ser 0. Por
 * eso también un modelo que no esté en la tabla devuelve `null` y no un cero:
 * "no sé cuánto cuesta" y "es gratis" no son lo mismo, y confundirlos es cómo
 * se acaba con un tope que no muerde.
 *
 * `NELVYON_LLM_PRICE_OVERRIDES` permite corregirla sin tocar código, con el
 * formato `modelo:entradaPorMillon:salidaPorMillon,otro:...`.
 */

export interface TarifaPorMillon {
  entrada: number;
  salida: number;
}

/** Tarifas públicas en USD por millón de tokens, anotadas en agosto de 2026. */
const TARIFAS: Readonly<Record<string, TarifaPorMillon>> = {
  // Modelos locales: la electricidad no se factura por token.
  "ollama:*": { entrada: 0, salida: 0 },
  "gpt-4o-mini": { entrada: 0.15, salida: 0.6 },
  "gpt-4o": { entrada: 2.5, salida: 10 },
};

function overrides(): Record<string, TarifaPorMillon> {
  const crudo = process.env.NELVYON_LLM_PRICE_OVERRIDES?.trim();
  if (!crudo) return {};
  const salida: Record<string, TarifaPorMillon> = {};
  for (const trozo of crudo.split(",")) {
    const [modelo, entrada, sal] = trozo.split(":").map((s) => s.trim());
    if (!modelo) continue;
    const e = Number(entrada);
    const s = Number(sal);
    if (!Number.isFinite(e) || !Number.isFinite(s) || e < 0 || s < 0) continue;
    salida[modelo.toLowerCase()] = { entrada: e, salida: s };
  }
  return salida;
}

export function tarifaDe(proveedor: string, modelo: string): TarifaPorMillon | null {
  const m = modelo.trim().toLowerCase();
  const ov = overrides();
  if (ov[m]) return ov[m];
  if (TARIFAS[m]) return TARIFAS[m];
  // Cualquier modelo servido por Ollama es local, se llame como se llame.
  if (proveedor === "ollama") return TARIFAS["ollama:*"];
  return null;
}

/**
 * Coste estimado en USD. `null` cuando no hay tarifa conocida — nunca se
 * inventa. Redondea a 6 decimales para que sumar miles de llamadas no arrastre
 * ruido de coma flotante.
 */
export function estimarCosteUsd(
  proveedor: string,
  modelo: string,
  tokensEntrada: number,
  tokensSalida: number,
): number | null {
  const t = tarifaDe(proveedor, modelo);
  if (!t) return null;
  const coste =
    (Math.max(0, tokensEntrada) / 1_000_000) * t.entrada +
    (Math.max(0, tokensSalida) / 1_000_000) * t.salida;
  return Math.round(coste * 1e6) / 1e6;
}
