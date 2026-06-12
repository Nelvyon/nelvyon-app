import { HelpArticle } from "@/features/help/content";

export type BotHandoffKind = "bug" | "help" | "feedback";

export interface BotReply {
  answer: string;
  confidence: "high" | "low";
  article?: HelpArticle;
  handoffKind?: BotHandoffKind;
  handoffHref?: string;
  actionHref?: string;
  actionLabel?: string;
}
