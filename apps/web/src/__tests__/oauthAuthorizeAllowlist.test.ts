import { describe, expect, it } from "vitest";
import { isAllowedOAuthAuthorizeUrl } from "@/lib/integrations/oauthAuthorizeAllowlist";

describe("isAllowedOAuthAuthorizeUrl", () => {
  it("allows known IdP hosts", () => {
    expect(isAllowedOAuthAuthorizeUrl("https://app.hubspot.com/oauth/authorize?x=1")).toBe(true);
    expect(isAllowedOAuthAuthorizeUrl("https://slack.com/oauth/v2/authorize")).toBe(true);
    expect(isAllowedOAuthAuthorizeUrl("https://accounts.google.com/o/oauth2/v2/auth")).toBe(true);
  });

  it("rejects open redirects", () => {
    expect(isAllowedOAuthAuthorizeUrl("https://evil.example/phish")).toBe(false);
    expect(isAllowedOAuthAuthorizeUrl("http://slack.com/oauth")).toBe(false);
    expect(isAllowedOAuthAuthorizeUrl("not-a-url")).toBe(false);
  });
});
