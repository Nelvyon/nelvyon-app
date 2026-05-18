import { describe, expect, it, vi } from "vitest";

import {
  FotografiaProductoPremiumAgent,
  GenerativeClient,
  OsEventBus,
  OsJobStore,
  TresDInmersivoPremiumAgent,
  VideoMultimediaPremiumAgent,
  VozPremiumAgent,
  type ILlmClient,
} from "@nelvyon/os-agents";

const payload = {
  brief: "Proyecto generativo",
  clientName: "NELVYON Labs",
  industry: "Retail",
  targetAudience: "Profesionales",
  tone: "profesional",
  competitors: ["A", "B"],
  primaryColor: "#6C63FF",
  secondaryColor: "#0A0A0F",
};

function makeCtx(store: OsJobStore, bus: OsEventBus, jobId: string, clientId: string, serviceId: string) {
  return {
    jobId,
    clientId,
    serviceId,
    payload,
    stepResults: {} as Record<string, string>,
    jobStore: store,
    eventBus: bus,
  };
}

async function runAgent(agent: { serviceId: string; steps: { name: string; description: string }[]; execute: Function }, label: string) {
  const store = new OsJobStore();
  const bus = new OsEventBus();
  const job = await store.createJob({
    serviceId: agent.serviceId,
    clientId: `gen_${label}`,
    steps: agent.steps.map((s) => ({ name: s.name, description: s.description })),
  });
  await store.updateJobStatus(job.jobId, "running");
  return agent.execute(payload, makeCtx(store, bus, job.jobId, job.clientId, agent.serviceId));
}

describe("GenerativeClient (mock mode)", () => {
  it("generateImage sin API key → mock URL", async () => {
    delete process.env.OPENAI_API_KEY;
    const r = await GenerativeClient.generateImage("x");
    expect(r.url).toBe("https://placeholder.nelvyon.com/image.jpg");
  });

  it("generateVideo sin API key → mock URL", async () => {
    delete process.env.RUNWAY_API_KEY;
    const r = await GenerativeClient.generateVideo("x");
    expect(r.url).toBe("https://placeholder.nelvyon.com/video.mp4");
  });

  it("generate3D sin API key → mock URL", async () => {
    delete process.env.MESHY_API_KEY;
    const r = await GenerativeClient.generate3D("x");
    expect(r.url).toBe("https://placeholder.nelvyon.com/model.glb");
  });

  it("generateVoice sin API key → mock URL", async () => {
    delete process.env.ELEVENLABS_API_KEY;
    const r = await GenerativeClient.generateVoice("x");
    expect(r.url).toBe("https://placeholder.nelvyon.com/audio.mp3");
  });
});

describe("Agentes generativos", () => {
  const llm: ILlmClient = { complete: vi.fn().mockResolvedValue("Elite response mock") };

  it("FotografiaProductoPremiumAgent tiene 7 steps", () => {
    const agent = new FotografiaProductoPremiumAgent(llm);
    expect(agent.steps).toHaveLength(7);
  });

  it("FotografiaProductoPremiumAgent step 7 es 'generate_images'", () => {
    const agent = new FotografiaProductoPremiumAgent(llm);
    expect(agent.steps[6]?.name).toBe("generate_images");
  });

  it("FotografiaProductoPremiumAgent execute() incluye URLs en resultado", async () => {
    const agent = new FotografiaProductoPremiumAgent(llm);
    const result = await runAgent(agent, "photo");
    const step = result.steps.find((s: { name: string }) => s.name === "generate_images");
    const output = String(step?.data?.output ?? "");
    expect(output).toContain("https://placeholder.nelvyon.com/");
  });

  it("VideoMultimediaPremiumAgent tiene 7 steps", () => {
    const agent = new VideoMultimediaPremiumAgent(llm);
    expect(agent.steps).toHaveLength(7);
  });

  it("VideoMultimediaPremiumAgent step 7 es 'generate_video'", () => {
    const agent = new VideoMultimediaPremiumAgent(llm);
    expect(agent.steps[6]?.name).toBe("generate_video");
  });

  it("TresDInmersivoPremiumAgent tiene 7 steps", () => {
    const agent = new TresDInmersivoPremiumAgent(llm);
    expect(agent.steps).toHaveLength(7);
  });

  it("TresDInmersivoPremiumAgent step 7 es 'generate_3d'", () => {
    const agent = new TresDInmersivoPremiumAgent(llm);
    expect(agent.steps[6]?.name).toBe("generate_3d");
  });

  it("VozPremiumAgent tiene 7 steps", () => {
    const agent = new VozPremiumAgent(llm);
    expect(agent.steps).toHaveLength(7);
  });

  it("VozPremiumAgent step 7 es 'generate_voice'", () => {
    const agent = new VozPremiumAgent(llm);
    expect(agent.steps[6]?.name).toBe("generate_voice");
  });

  it("Todos los agentes generativos incluyen URL en stepResults", async () => {
    const photo = await runAgent(new FotografiaProductoPremiumAgent(llm), "photo_all");
    const video = await runAgent(new VideoMultimediaPremiumAgent(llm), "video_all");
    const d3 = await runAgent(new TresDInmersivoPremiumAgent(llm), "3d_all");
    const voz = await runAgent(new VozPremiumAgent(llm), "voz_all");

    const outputs = [photo, video, d3, voz]
      .flatMap((r: { steps: { name: string; data: Record<string, unknown> }[] }) => r.steps)
      .filter((s: { name: string }) => s.name.startsWith("generate_"))
      .map((s: { data: Record<string, unknown> }) => String(s.data.output ?? ""));

    outputs.forEach((o) => expect(o).toContain("https://placeholder.nelvyon.com/"));
  });

  it("Mock URLs tienen formato https://placeholder.nelvyon.com/...", async () => {
    const r1 = await GenerativeClient.generateImage("x");
    const r2 = await GenerativeClient.generateVideo("x");
    const r3 = await GenerativeClient.generate3D("x");
    const r4 = await GenerativeClient.generateVoice("x");
    [r1.url, r2.url, r3.url, r4.url].forEach((url) => {
      expect(url.startsWith("https://placeholder.nelvyon.com/")).toBe(true);
    });
  });
});
