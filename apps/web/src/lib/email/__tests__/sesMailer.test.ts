import { afterEach, describe, expect, it } from "vitest";

import {
  isSesConfigured,
  resolveSesCredentials,
  resolveSesRegion,
  resetSesClientForTests,
} from "@/lib/email/sesClient";
import {
  isSesCredentialError,
  isSesPermanentFailure,
  resolveSesFromAddress,
} from "@/lib/email/sesMailer";

describe("sesMailer", () => {
  const env = process.env;

  afterEach(() => {
    process.env = env;
    resetSesClientForTests();
  });

  it("detects missing SES credentials", () => {
    delete process.env.SES_ACCESS_KEY_ID;
    delete process.env.AWS_ACCESS_KEY_ID;
    delete process.env.SES_SECRET_ACCESS_KEY;
    delete process.env.AWS_SECRET_ACCESS_KEY;
    expect(isSesConfigured()).toBe(false);
    expect(resolveSesCredentials()).toEqual({ accessKeyId: "", secretAccessKey: "" });
  });

  it("reads SES credentials and region from env", () => {
    process.env.SES_ACCESS_KEY_ID = "AKIA_TEST";
    process.env.SES_SECRET_ACCESS_KEY = "secret";
    process.env.SES_REGION = "eu-west-1";
    expect(isSesConfigured()).toBe(true);
    expect(resolveSesRegion()).toBe("eu-west-1");
  });

  it("classifies credential and permanent SES errors", () => {
    expect(isSesCredentialError("SES credentials missing")).toBe(true);
    expect(isSesPermanentFailure("SES 400 MessageRejected: Email address is not verified")).toBe(true);
  });

  it("resolves from address defaults", () => {
    delete process.env.SES_FROM_EMAIL;
    delete process.env.SES_FROM_NAME;
    expect(resolveSesFromAddress()).toEqual({
      email: "no-reply@nelvyon.com",
      name: "NELVYON",
    });
  });
});
