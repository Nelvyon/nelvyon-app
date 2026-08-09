/**
 * Capacidades multimedia de NELVYON: STT, imagen y TTS.
 *
 * POR QUÉ EXISTE
 * --------------
 * Estas tres capacidades salían a proveedores externos de pago sin decisión
 * explícita:
 *
 *   - STT   → `api.openai.com/v1/audio/transcriptions` (Whisper). Lanzaba
 *             "OPENAI_API_KEY requerido para Whisper" si faltaba la clave.
 *   - Imagen→ `CreativeService.generateImage` encadenaba Midjourney y DALL·E
 *             de forma AUTOMÁTICA: si el primero no respondía, probaba el
 *             siguiente. Nadie elegía; el coste se producía solo.
 *   - TTS   → `api.elevenlabs.io` directamente.
 *
 * Ollama no sustituye a Whisper ni a DALL·E, así que fingir que sí sería
 * mentir. Lo correcto es una capa de capacidad honesta: si NELVYON no tiene un
 * proveedor propio configurado, la capacidad queda NOT_CONFIGURED y se dice.
 *
 * CONTRATO
 * --------
 *   1. Proveedor local de NELVYON configurado → se usa.
 *   2. Nada configurado → `not_configured`. **Nunca** se cae a Whisper, DALL·E,
 *      Midjourney ni ElevenLabs.
 *   3. Un proveedor externo solo entra en juego con doble opt-in EXPLÍCITO:
 *      el interruptor general `NELVYON_ALLOW_EXTERNAL_MEDIA=1` más la clave
 *      concreta. Nunca es automático ni es respaldo de un fallo local.
 *
 * Ninguna clave externa es requisito para que NELVYON arranque.
 */

export type MediaCapability = "stt" | "image" | "tts";

export type MediaProvider =
  | { kind: "local"; capability: MediaCapability; baseUrl: string; model?: string }
  | { kind: "external"; capability: MediaCapability; id: string }
  | { kind: "not_configured"; capability: MediaCapability; reason: string };

/** Interruptor general. Sin él, ningún proveedor externo se considera jamás. */
export function externalMediaAllowed(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.NELVYON_ALLOW_EXTERNAL_MEDIA?.trim() === "1";
}

function txt(v: string | undefined): string {
  return (v ?? "").trim();
}

const NOT_CONFIGURED_REASON: Record<MediaCapability, string> = {
  stt: "Sin proveedor de transcripción propio. Define NELVYON_STT_URL.",
  image: "Sin proveedor de imagen propio. Define NELVYON_IMAGE_URL.",
  tts: "Sin proveedor de voz propio. Define NELVYON_TTS_URL.",
};

const LOCAL_URL_ENV: Record<MediaCapability, string> = {
  stt: "NELVYON_STT_URL",
  image: "NELVYON_IMAGE_URL",
  tts: "NELVYON_TTS_URL",
};

const LOCAL_MODEL_ENV: Record<MediaCapability, string> = {
  stt: "NELVYON_STT_MODEL",
  image: "NELVYON_IMAGE_MODEL",
  tts: "NELVYON_TTS_MODEL",
};

/** Proveedores externos admitidos SOLO con doble opt-in. */
const EXTERNAL_KEY_ENV: Record<MediaCapability, Array<{ id: string; env: string }>> = {
  stt: [{ id: "openai-whisper", env: "OPENAI_API_KEY" }],
  image: [
    { id: "dalle", env: "OPENAI_API_KEY" },
    { id: "midjourney", env: "MIDJOURNEY_API_KEY" },
  ],
  tts: [{ id: "elevenlabs", env: "ELEVENLABS_API_KEY" }],
};

export function resolveMediaProvider(
  capability: MediaCapability,
  env: NodeJS.ProcessEnv = process.env,
): MediaProvider {
  const localUrl = txt(env[LOCAL_URL_ENV[capability]]);
  if (localUrl) {
    return {
      kind: "local",
      capability,
      baseUrl: localUrl.replace(/\/$/, ""),
      model: txt(env[LOCAL_MODEL_ENV[capability]]) || undefined,
    };
  }

  /**
   * Sin proveedor propio. Un externo SOLO si el operador lo ha pedido de forma
   * explícita con el interruptor general. Tener la clave suelta no basta: ese
   * era exactamente el fallo, que una clave en el entorno bastara para generar
   * gasto sin que nadie lo decidiera.
   */
  if (externalMediaAllowed(env)) {
    for (const candidate of EXTERNAL_KEY_ENV[capability]) {
      if (txt(env[candidate.env])) {
        return { kind: "external", capability, id: candidate.id };
      }
    }
  }

  return { kind: "not_configured", capability, reason: NOT_CONFIGURED_REASON[capability] };
}

/** `true` solo si la capacidad puede ejecutarse ahora mismo. */
export function isMediaCapabilityAvailable(
  capability: MediaCapability,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return resolveMediaProvider(capability, env).kind !== "not_configured";
}

export class MediaCapabilityNotConfigured extends Error {
  readonly code = "media_capability_not_configured";
  constructor(readonly capability: MediaCapability, reason: string) {
    super(reason);
    this.name = "MediaCapabilityNotConfigured";
  }
}

/** Estado publicable en contratos HTTP/UI, sin filtrar configuración interna. */
export function mediaCapabilityStatus(
  capability: MediaCapability,
  env: NodeJS.ProcessEnv = process.env,
): { capability: MediaCapability; status: "available" | "not_configured"; provider: string | null } {
  const p = resolveMediaProvider(capability, env);
  if (p.kind === "not_configured") {
    return { capability, status: "not_configured", provider: null };
  }
  return {
    capability,
    status: "available",
    provider: p.kind === "local" ? "nelvyon-local" : p.id,
  };
}
