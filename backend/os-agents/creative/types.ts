export type CreativeProvider = "midjourney" | "kling" | "dalle";
export type CreativeAssetType = "image" | "video";
export type CreativeAssetStatus = "pending" | "done" | "failed";

export interface CreativeAsset {
  id: string;
  userId: string;
  agentId: string | null;
  assetType: CreativeAssetType;
  provider: CreativeProvider;
  prompt: string;
  url: string | null;
  status: CreativeAssetStatus;
  metadata: unknown;
  createdAt: string;
}
