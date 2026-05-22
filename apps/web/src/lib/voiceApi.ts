import { apiClient } from "@/core/api";

export type TtsBase64Response = {
  audio_base64: string;
  format: string;
};

const MAX_TTS_CHARS = 5000;

export async function fetchTtsBase64(
  text: string,
  voiceId?: string,
): Promise<TtsBase64Response> {
  const trimmed = text.trim().slice(0, MAX_TTS_CHARS);
  if (!trimmed) {
    throw new Error("No hay texto para sintetizar");
  }
  return apiClient.post<TtsBase64Response, { text: string; voice_id?: string }>(
    "/api/voice/tts-base64",
    {
      tenantScoped: true,
      body: {
        text: trimmed,
        ...(voiceId ? { voice_id: voiceId } : {}),
      },
    },
  );
}

export function playBase64Mp3(audioBase64: string): HTMLAudioElement {
  const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
  void audio.play();
  return audio;
}
