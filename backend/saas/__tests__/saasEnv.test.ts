import { afterEach, describe, expect, it } from "vitest";

import {
  isOpenAiEnvConfigured,
  isPackLlmEnvConfigured,
  isSesEnvConfigured,
  isStripeEnvConfigured,
  missingEnvKeys,
  missingSesEnvKeys,
  missingStripeEnvKeys,
} from "../saasEnv";

describe("saasEnv connector readiness", () => {
  const saved = { ...process.env };

  afterEach(() => {
    process.env = { ...saved };
  });

  it("isOpenAiEnvConfigured requires OPENAI_API_KEY", () => {
    delete process.env.OPENAI_API_KEY;
    expect(isOpenAiEnvConfigured()).toBe(false);
    process.env.OPENAI_API_KEY = "sk-test";
    expect(isOpenAiEnvConfigured()).toBe(true);
  });

  it("isSesEnvConfigured requires all SES keys", () => {
    process.env.SES_ACCESS_KEY_ID = "a";
    process.env.SES_SECRET_ACCESS_KEY = "b";
    process.env.SES_FROM_EMAIL = "c@test.com";
    expect(isSesEnvConfigured()).toBe(true);
    delete process.env.SES_FROM_EMAIL;
    expect(isSesEnvConfigured()).toBe(false);
  });

  it("isSesEnvConfigured accepts AWS_SES_* aliases", () => {
    delete process.env.SES_ACCESS_KEY_ID;
    delete process.env.SES_SECRET_ACCESS_KEY;
    process.env.AWS_SES_ACCESS_KEY = "a";
    process.env.AWS_SES_SECRET_KEY = "b";
    process.env.SES_FROM_EMAIL = "c@test.com";
    expect(isSesEnvConfigured()).toBe(true);
  });

  it("missingEnvKeys lists unset keys", () => {
    delete process.env.OPENAI_API_KEY;
    expect(missingEnvKeys(["OPENAI_API_KEY"])).toEqual(["OPENAI_API_KEY"]);
  });

  it("isStripeEnvConfigured false when price id missing", () => {
    process.env.STRIPE_SECRET_KEY = "sk";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec";
    delete process.env.STRIPE_PRICE_ID_STARTER;
    delete process.env.STRIPE_PRICE_ID_PRO;
    delete process.env.STRIPE_PRICE_ID_AGENCY;
    expect(isStripeEnvConfigured()).toBe(false);
  });

  it("isStripeEnvConfigured accepts STRIPE_API_KEY alias", () => {
    delete process.env.STRIPE_SECRET_KEY;
    process.env.STRIPE_API_KEY = "sk_alias";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec";
    process.env.STRIPE_PRICE_ID_STARTER = "p1";
    process.env.STRIPE_PRICE_ID_PRO = "p2";
    process.env.STRIPE_PRICE_ID_AGENCY = "p3";
    expect(isStripeEnvConfigured()).toBe(true);
    expect(missingStripeEnvKeys()).toEqual([]);
  });

  it("isPackLlmEnvConfigured accepts Ollama host", () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.OLLAMA_HOST;
    delete process.env.OLLAMA_BASE_URL;
    delete process.env.OLLAMA_CONFIGURED;
    delete process.env.NELVYON_LOCAL_AI_URL;
    delete process.env.LOCAL_AI_BASE_URL;
    expect(isPackLlmEnvConfigured()).toBe(false);
    process.env.OLLAMA_HOST = "http://127.0.0.1:11434";
    expect(isPackLlmEnvConfigured()).toBe(true);
  });

  it("isPackLlmEnvConfigured accepts OLLAMA_CONFIGURED=1 without host URL", () => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.OLLAMA_HOST;
    delete process.env.OLLAMA_BASE_URL;
    delete process.env.NELVYON_LOCAL_AI_URL;
    delete process.env.LOCAL_AI_BASE_URL;
    process.env.OLLAMA_CONFIGURED = "1";
    expect(isPackLlmEnvConfigured()).toBe(true);
  });

  it("missingSesEnvKeys reports aliases when unset", () => {
    delete process.env.SES_ACCESS_KEY_ID;
    delete process.env.AWS_SES_ACCESS_KEY;
    delete process.env.SES_SECRET_ACCESS_KEY;
    delete process.env.AWS_SES_SECRET_KEY;
    delete process.env.SES_FROM_EMAIL;
    expect(missingSesEnvKeys()).toEqual([
      "SES_ACCESS_KEY_ID|AWS_SES_ACCESS_KEY",
      "SES_SECRET_ACCESS_KEY|AWS_SES_SECRET_KEY",
      "SES_FROM_EMAIL",
    ]);
  });
});
