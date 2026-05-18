import type { ILlmClient } from "../../LlmClient";
import type { PodcastsInput, PodcastsOutput } from "./shared";
import { getDefaultPodcastsLlm, runPodcastsAgentCore } from "./shared";

const AGENT_ID = "podcasts-seo";

let inst: PodcastsSEOAgent | null = null;

export class PodcastsSEOAgent {
  private constructor(private readonly deps: { llm?: ILlmClient } = {}) {}

  static instance(): PodcastsSEOAgent {
    if (!inst) inst = new PodcastsSEOAgent();
    return inst;
  }

  private get llm(): ILlmClient {
    return this.deps.llm ?? getDefaultPodcastsLlm();
  }

  async run(input: PodcastsInput): Promise<PodcastsOutput> {
    const eliteRole = "Eres **Podcasts SEO** — Spotify, Apple y Google.";
    const mission =
      "Diseña **SEO de podcasts** y **descubrimiento** en Spotify, Apple Podcasts y Google Podcasts (títulos, descripciones, categorías).";
    const fewShot =
      '{"result":"Keywords RSS + show notes SEO","score":92,"recommendations":["Trailer en feed","Episode titles A/B"]}';
    return runPodcastsAgentCore(AGENT_ID, this.llm, { eliteRole, mission, fewShotExample: fewShot }, input);
  }
}

export function getPodcastsSEOAgent(): PodcastsSEOAgent {
  return PodcastsSEOAgent.instance();
}

export function resetPodcastsSEOAgentForTests(): void {
  inst = null;
}
