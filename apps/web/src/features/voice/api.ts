import { apiClient } from "@/core/api";
import type { VoiceV2Governance, VoiceV2InboundCreateResult, VoiceV2SynthConsumeResult } from "@/features/voice/types";

const BASE = "/api/v1/voice/v2";

export const voiceV2Api = {
  governance: () => apiClient.get<VoiceV2Governance>(`${BASE}/governance`, { tenantScoped: true }),
  inboundUpload: (file: File, signal?: AbortSignal) => {
    const fd = new FormData();
    fd.append("file", file, file.name || "voice-note");
    return apiClient.postMultipart<VoiceV2InboundCreateResult>(`${BASE}/inbound`, fd, { tenantScoped: true, signal });
  },
  inboundAudioBlob: (inboundId: number, signal?: AbortSignal) =>
    apiClient.getBlob(`${BASE}/inbound/${inboundId}/audio`, { tenantScoped: true, signal }),
  synthConsume: (charCount: number, signal?: AbortSignal) =>
    apiClient.post<VoiceV2SynthConsumeResult, { char_count: number }>(`${BASE}/synth/consume`, {
      tenantScoped: true,
      body: { char_count: charCount },
      signal,
    }),
};
