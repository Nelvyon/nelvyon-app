import { afterEach, describe, expect, it } from "vitest";
import { GenerativeClient } from "../generative/GenerativeClient";

describe("GenerativeClient placeholder honesty", () => {
  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.RUNWAY_API_KEY;
    delete process.env.MESHY_API_KEY;
    delete process.env.ELEVENLABS_API_KEY;
  });

  it("image placeholder includes metadata.mock when key missing", async () => {
    delete process.env.OPENAI_API_KEY;
    const r = await GenerativeClient.generateImage("test");
    expect(r.url).toContain("placeholder.nelvyon.com");
    expect(r.metadata?.mock).toBe(true);
  });

  it("video / 3d / voice placeholders include metadata.mock", async () => {
    delete process.env.RUNWAY_API_KEY;
    delete process.env.MESHY_API_KEY;
    delete process.env.ELEVENLABS_API_KEY;
    const video = await GenerativeClient.generateVideo("v");
    const model = await GenerativeClient.generate3D("m");
    const voice = await GenerativeClient.generateVoice("hello");
    expect(video.metadata?.mock).toBe(true);
    expect(model.metadata?.mock).toBe(true);
    expect(voice.metadata?.mock).toBe(true);
  });
});
