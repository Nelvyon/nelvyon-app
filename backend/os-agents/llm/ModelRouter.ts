export class ModelRouter {
  static getModel(agentId: string): { model: string; fallback: string } {
    const id = agentId.toLowerCase();
    const has = (keys: string[]): boolean => keys.some((k) => id.includes(k));

    if (has(["quality", "evaluator", "reviewer"])) return { model: "o3", fallback: "gpt-4o" };
    if (has(["strategy", "analysis", "competitive", "prediction", "attribution", "churn", "seo", "scoring"])) {
      return { model: "o3", fallback: "gpt-4o" };
    }
    if (has(["copy", "content", "script", "social", "newsletter"])) return { model: "gpt-4.1", fallback: "gpt-4o" };
    if (has(["outreach", "b2b", "pitch", "linkedin", "email", "sequence", "retention", "nurturing"])) {
      return { model: "gpt-4.1", fallback: "gpt-4o" };
    }
    if (has(["brand", "profile", "bio", "deck", "positioning", "creative", "story", "campaign"])) {
      return { model: "gpt-4.1", fallback: "gpt-4o" };
    }
    return { model: "gpt-4o-mini", fallback: "gpt-4o" };
  }
}
