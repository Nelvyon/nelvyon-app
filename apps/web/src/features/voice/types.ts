export interface VoiceV2Governance {
  plan_id: string;
  plan_allowed: boolean;
  period_yyyymm: number;
  monthly_cap: number;
  inbound_used: number;
  synth_used: number;
  actions_used: number;
  actions_remaining: number;
}

export interface VoiceV2InboundCreateResult {
  ticket_id: number;
  inbound_id: number;
  storage_key: string;
  size_bytes: number;
  content_type: string;
}

export interface VoiceV2SynthConsumeResult {
  ok: boolean;
  synth_used: number;
  actions_remaining: number;
}
