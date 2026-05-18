"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/core/auth/AuthContext";
import { useWorkspace } from "@/core/workspace/WorkspaceContext";
import { voiceV2Api } from "@/features/voice/api";

const GKEY = ["voice", "v2", "governance"] as const;

export function useVoiceV2Governance() {
  const { isAuthenticated } = useAuth();
  const { workspaceId } = useWorkspace();
  return useQuery({
    queryKey: [...GKEY, workspaceId],
    queryFn: () => voiceV2Api.governance(),
    enabled: Boolean(isAuthenticated && workspaceId),
  });
}

export function useVoiceV2InboundUpload() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => voiceV2Api.inboundUpload(file),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["voice", "v2"] });
    },
  });
}

export function useVoiceV2SynthConsume() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (charCount: number) => voiceV2Api.synthConsume(charCount),
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["voice", "v2"] });
    },
  });
}
