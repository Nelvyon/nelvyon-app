/** VOZ v2 — browser TTS text limits (no server audio persistence). */

export const VOICE_SYNTH_MAX_CHARS = 600;

export function validateSynthText(raw: string): { ok: true; text: string } | { ok: false; error: string } {
  const t = raw.trim();
  if (!t) return { ok: false, error: "Enter some text to hear." };
  if (t.length > VOICE_SYNTH_MAX_CHARS) {
    return { ok: false, error: `Text is too long (max ${VOICE_SYNTH_MAX_CHARS} characters for this pilot).` };
  }
  return { ok: true, text: t };
}
