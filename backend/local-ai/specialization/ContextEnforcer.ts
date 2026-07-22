/** Detect false context denial when RAG provided sources. */
export function deniesContextWhenPresent(response: string): boolean {
  const n = response
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return (
    /no se proporcion[oó] (un )?contexto/i.test(n) ||
    /no tengo (suficiente )?informacion/i.test(n) ||
    /sin contexto especifico/i.test(n) ||
    /no hay contexto/i.test(n) ||
    /contexto general(?!.*\[1\])/i.test(n)
  );
}

/** Model denied info in opening but cites sources later — incoherent refusal. */
export function hasContradictoryRefusal(response: string): boolean {
  const head = response.slice(0, 600).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return (/no tengo|no se proporcion|sin informacion especifica/.test(head) && /\[\d+\]/.test(response));
}

export function needsContextRetry(response: string): boolean {
  return deniesContextWhenPresent(response) || hasContradictoryRefusal(response);
}

export const CONTEXT_RETRY_SYSTEM_APPEND = `
REINTENTO OBLIGATORIO: Las FUENTES AUTORIZADAS contienen la respuesta. Está PROHIBIDO negar contexto.
Responde citando [1], [2] de las fuentes. Indica al final qué fuente usaste en "## Fuentes utilizadas".`;

export function buildContextRetryUser(originalUser: string): string {
  return `${originalUser}\n\n---\nREINTENTO: responde SOLO con FUENTES AUTORIZADAS. Cita [N] en cada afirmación clave.`;
}
