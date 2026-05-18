export function getAIGeneratedMetadata(): Record<string, string> {
  return {
    generator: "nelvyon-ai-v1",
    model: "gpt-4o",
    timestamp: new Date().toISOString(),
  };
}

/** Headers HTTP de trazabilidad (AI Act / disclosure técnica). */
export function getAIResponseHeaders(): Record<string, string> {
  const m = getAIGeneratedMetadata();
  return {
    "X-AI-Generated": "true",
    "X-AI-Model": m.model,
    "X-AI-Generator": m.generator,
  };
}

/** Añade `_ai_metadata` al JSON de respuesta (API pública). En `NODE_ENV=test` no modifica. */
export function addAIMetadataToBody<T extends Record<string, unknown>>(body: T): T & { _ai_metadata?: object } {
  if (process.env.NODE_ENV === "test") {
    return body;
  }
  const m = getAIGeneratedMetadata();
  return {
    ...body,
    _ai_metadata: { generated: true, model: m.model, generator: m.generator },
  };
}
