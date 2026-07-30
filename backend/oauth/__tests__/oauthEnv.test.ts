import { afterEach, describe, expect, it } from "vitest";

import {
  defaultOAuthRedirectUri,
  isAliasedEnvConfigured,
  metaOAuthAppId,
  missingMetaOAuthEnvKeys,
  missingWhatsAppCloudEnvKeys,
  oauthAppBaseUrl,
  tiktokOAuthAppId,
} from "../oauthEnv";

describe("oauthEnv", () => {
  const saved = { ...process.env };

  afterEach(() => {
    process.env = { ...saved };
  });

  it("defaults redirect host to app.nelvyon.com", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXTAUTH_URL;
    expect(oauthAppBaseUrl()).toBe("https://app.nelvyon.com");
    expect(defaultOAuthRedirectUri("/api/oauth/google/callback")).toBe(
      "https://app.nelvyon.com/api/oauth/google/callback",
    );
  });

  it("uses NEXT_PUBLIC_APP_URL when set", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://ideal-victory-staging.up.railway.app/";
    expect(defaultOAuthRedirectUri("/api/oauth/meta/callback")).toBe(
      "https://ideal-victory-staging.up.railway.app/api/oauth/meta/callback",
    );
  });

  it("accepts META_CLIENT_* as aliases for META_APP_*", () => {
    delete process.env.META_APP_ID;
    delete process.env.META_APP_SECRET;
    process.env.META_CLIENT_ID = "cid";
    process.env.META_CLIENT_SECRET = "csec";
    expect(metaOAuthAppId()).toBe("cid");
    expect(missingMetaOAuthEnvKeys()).toEqual([]);
  });

  it("accepts TIKTOK_CLIENT_ID alias", () => {
    delete process.env.TIKTOK_APP_ID;
    process.env.TIKTOK_CLIENT_ID = "tt";
    expect(tiktokOAuthAppId()).toBe("tt");
  });

  it("isAliasedEnvConfigured treats A|B as OR", () => {
    delete process.env.META_APP_ID;
    process.env.META_CLIENT_ID = "x";
    expect(isAliasedEnvConfigured(["META_APP_ID|META_CLIENT_ID"])).toBe(true);
    delete process.env.META_CLIENT_ID;
    expect(isAliasedEnvConfigured(["META_APP_ID|META_CLIENT_ID"])).toBe(false);
  });

  it("missingWhatsAppCloudEnvKeys lists required WA cloud keys", () => {
    delete process.env.META_WA_PHONE_NUMBER_ID;
    delete process.env.META_WA_ACCESS_TOKEN;
    delete process.env.META_WA_VERIFY_TOKEN;
    delete process.env.META_WA_APP_SECRET;
    expect(missingWhatsAppCloudEnvKeys()).toEqual([
      "META_WA_PHONE_NUMBER_ID",
      "META_WA_ACCESS_TOKEN",
      "META_WA_VERIFY_TOKEN",
      "META_WA_APP_SECRET",
    ]);
  });
});
