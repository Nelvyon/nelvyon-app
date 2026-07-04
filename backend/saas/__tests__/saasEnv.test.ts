import { afterEach, describe, expect, it } from "vitest";

import {
  isOpenAiEnvConfigured,
  isSesEnvConfigured,
  isStripeEnvConfigured,
  missingEnvKeys,
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
});
