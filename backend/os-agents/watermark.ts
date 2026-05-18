import type { OsJobResult } from "./types";

const TEXT_SIGNATURE = "\n\n---\n*Generado por NELVYON AI · nelvyon.com*";

function isProductionTextWatermark(): boolean {
  return process.env.NODE_ENV === "production";
}

/** Marca texto largo en producción (no altera dev/test). */
export function embedTextWatermark(text: string): string {
  if (!isProductionTextWatermark()) return text;
  if (text.length <= 100) return text;
  if (text.includes("*Generado por NELVYON AI · nelvyon.com*")) return text;
  return text + TEXT_SIGNATURE;
}

/** Marca el objeto raíz para trazabilidad en JSON persistido. */
export function embedJsonWatermark(obj: Record<string, unknown>): Record<string, unknown>;
export function embedJsonWatermark(obj: unknown): unknown;
export function embedJsonWatermark(obj: unknown): unknown {
  if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
    return obj;
  }
  const rec = obj as Record<string, unknown>;
  if (rec._nelvyon_generated === true) {
    return { ...rec };
  }
  return { ...rec, _nelvyon_generated: true };
}

function watermarkStepOutput(output: unknown): unknown {
  if (typeof output === "string") {
    return embedTextWatermark(output);
  }
  if (output && typeof output === "object" && !Array.isArray(output)) {
    return embedJsonWatermark(output as Record<string, unknown>);
  }
  return output;
}

/** Aplica marcas a cada `data.output` de paso antes de persistir el job. */
export function watermarkOsJobResult(result: OsJobResult): OsJobResult {
  return {
    ...result,
    steps: result.steps.map((step) => {
      const data = { ...step.data };
      if ("output" in data) {
        data.output = watermarkStepOutput(data.output) as unknown;
      }
      return { ...step, data };
    }),
  };
}
