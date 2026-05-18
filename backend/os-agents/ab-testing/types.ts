export type AbChannel = "email" | "social" | "ads" | "landing";
export type AbStatus = "running" | "paused" | "done";
export type AbEventType = "impression" | "click" | "conversion";

export interface AbVariant {
  id: string;
  experimentId: string;
  name: string;
  content: string;
  impressions: number;
  clicks: number;
  conversions: number;
  createdAt: string;
}

export interface AbExperiment {
  id: string;
  userId: string;
  name: string;
  channel: AbChannel | string;
  status: AbStatus | string;
  winnerVariant: string | null;
  confidenceThreshold: number;
  createdAt: string;
  updatedAt: string;
  variants?: AbVariant[];
}
