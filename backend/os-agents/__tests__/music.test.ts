// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../LlmClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../LlmClient")>();
  return { ...actual, LlmClient: { ...actual.LlmClient, getInstance: vi.fn() } };
});

import { LlmClient } from "../LlmClient";
import {
  getArtistBioAgent,
  getCollaborationOutreachAgent,
  getMusicFanEngagementAgent,
  getLyricsPromptAgent,
  getMusicPressReleaseAgent,
  getMusicVideoConceptAgent,
  getSocialMediaMusicAgent,
  getSpotifyPitchAgent,
  getTourPromotionAgent,
  resetArtistBioAgentForTests,
  resetCollaborationOutreachAgentForTests,
  resetMusicFanEngagementAgentForTests,
  resetLyricsPromptAgentForTests,
  resetMusicPressReleaseAgentForTests,
  resetMusicVideoConceptAgentForTests,
  resetSocialMediaMusicAgentForTests,
  resetSpotifyPitchAgentForTests,
  resetTourPromotionAgentForTests,
} from "../sectors/music";

const llm = {
  complete: vi.fn().mockImplementation(async () => {
    const response = new Response(JSON.stringify({ choices: [{ message: { content: "test output" } }] }), { headers: { "Content-Type": "application/json" } });
    const payload = (await response.json()) as { choices: Array<{ message: { content: string } }> };
    return payload.choices[0].message.content;
  }),
};

describe("Music agents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(LlmClient.getInstance).mockReturnValue(llm as never);
    resetArtistBioAgentForTests();
    resetMusicPressReleaseAgentForTests();
    resetLyricsPromptAgentForTests();
    resetSocialMediaMusicAgentForTests();
    resetSpotifyPitchAgentForTests();
    resetMusicFanEngagementAgentForTests();
    resetTourPromotionAgentForTests();
    resetMusicVideoConceptAgentForTests();
    resetCollaborationOutreachAgentForTests();
  });

  const input = { artistName: "NOVA", genre: "indie", targetAudience: "18-34", tone: "auténtico", releaseType: "single" };
  it("ArtistBioAgent", async () => { const r = await getArtistBioAgent().run("u", input); expect(r.agentId).toBe("artist-bio"); expect(r.result.length).toBeGreaterThan(0); });
  it("MusicPressReleaseAgent", async () => { const r = await getMusicPressReleaseAgent().run("u", input); expect(r.agentId).toBe("music-press-release"); expect(r.result.length).toBeGreaterThan(0); });
  it("LyricsPromptAgent", async () => { const r = await getLyricsPromptAgent().run("u", input); expect(r.agentId).toBe("lyrics-prompt"); expect(r.result.length).toBeGreaterThan(0); });
  it("SocialMediaMusicAgent", async () => { const r = await getSocialMediaMusicAgent().run("u", input); expect(r.agentId).toBe("social-media-music"); expect(r.result.length).toBeGreaterThan(0); });
  it("SpotifyPitchAgent", async () => { const r = await getSpotifyPitchAgent().run("u", input); expect(r.agentId).toBe("spotify-pitch"); expect(r.result.length).toBeGreaterThan(0); });
  it("FanEngagementAgent", async () => { const r = await getMusicFanEngagementAgent().run("u", input); expect(r.agentId).toBe("fan-engagement"); expect(r.result.length).toBeGreaterThan(0); });
  it("TourPromotionAgent", async () => { const r = await getTourPromotionAgent().run("u", input); expect(r.agentId).toBe("tour-promotion"); expect(r.result.length).toBeGreaterThan(0); });
  it("MusicVideoConceptAgent", async () => { const r = await getMusicVideoConceptAgent().run("u", input); expect(r.agentId).toBe("music-video-concept"); expect(r.result.length).toBeGreaterThan(0); });
  it("CollaborationOutreachAgent", async () => { const r = await getCollaborationOutreachAgent().run("u", input); expect(r.agentId).toBe("collaboration-outreach"); expect(r.result.length).toBeGreaterThan(0); });
});

