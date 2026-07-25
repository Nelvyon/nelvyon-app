import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  assertPwaCertificationCoreIntegrity,
  assertPwaCertificationHonesty,
  evaluatePwaManifest,
} from "../PwaCertification";

const root = join(__dirname, "../../../");
const publicDir = join(root, "apps/web/public");

describe("PwaCertification", () => {
  it("passes its own integrity assertion", () => {
    expect(assertPwaCertificationCoreIntegrity()).toEqual({ ok: true, violations: [] });
  });

  it("ok=true when name/icons/display/start_url present, icons exist on disk, and sw documents offline+cache", () => {
    const result = evaluatePwaManifest({
      manifestName: "manifest.json",
      manifest: {
        name: "NELVYON",
        display: "standalone",
        start_url: "/",
        icons: [{ src: "/icons/icon-base.svg", sizes: "any", type: "image/svg+xml" }],
      },
      swSource: "caches.open('x'); return caches.match('/offline.html');",
      iconExistsFn: () => true,
    });
    expect(result.ok).toBe(true);
    expect(result.missingFields).toEqual([]);
    expect(result.missingIconFiles).toEqual([]);
    expect(result.offlineStrategyDocumented).toBe(true);
  });

  it("reports missing required fields", () => {
    const result = evaluatePwaManifest({
      manifestName: "broken",
      manifest: { name: "X" },
      swSource: "caches.open('x'); offline",
    });
    expect(result.ok).toBe(false);
    expect(result.missingFields).toEqual(expect.arrayContaining(["icons", "display", "start_url"]));
  });

  it("reports icons declared in manifest that do not exist on disk", () => {
    const result = evaluatePwaManifest({
      manifestName: "manifest-saas.json",
      manifest: {
        name: "Nelvyon SaaS",
        display: "standalone",
        start_url: "/saas/dashboard",
        icons: [
          { src: "/icons/icon-192x192.png" },
          { src: "/icons/icon-base.svg" },
        ],
      },
      swSource: "caches.open('x'); offline fallback",
      iconExistsFn: (src) => src === "/icons/icon-base.svg",
    });
    expect(result.ok).toBe(false);
    expect(result.missingIconFiles).toEqual(["/icons/icon-192x192.png"]);
  });

  it("flags an undocumented offline strategy in the service worker", () => {
    const result = evaluatePwaManifest({
      manifestName: "no-offline",
      manifest: {
        name: "X",
        display: "standalone",
        start_url: "/",
        icons: [{ src: "/icons/icon-base.svg" }],
      },
      swSource: "self.addEventListener('fetch', (e) => e.respondWith(fetch(e.request)));",
      iconExistsFn: () => true,
    });
    expect(result.ok).toBe(false);
    expect(result.violations).toContain("offline_strategy_not_documented_in_sw");
  });

  it("defaults iOS Safari install claim to PARTIAL_NOT_VERIFIED unless explicitly verified", () => {
    const withoutFlag = evaluatePwaManifest({
      manifestName: "x",
      manifest: { name: "X", display: "standalone", start_url: "/", icons: [{ src: "/a.svg" }] },
      swSource: "caches.open('x'); offline",
      iconExistsFn: () => true,
    });
    expect(withoutFlag.iosSafariInstall).toBe("PARTIAL_NOT_VERIFIED");

    const withFlag = evaluatePwaManifest({
      manifestName: "x",
      manifest: { name: "X", display: "standalone", start_url: "/", icons: [{ src: "/a.svg" }] },
      swSource: "caches.open('x'); offline",
      iconExistsFn: () => true,
      iosSafariInstallVerified: true,
    });
    expect(withFlag.iosSafariInstall).toBe("VERIFIED");
  });

  it("honesty guard rejects a VERIFIED iOS claim on a manifest that otherwise fails", () => {
    const failing = evaluatePwaManifest({
      manifestName: "failing",
      manifest: { name: "X" },
      swSource: "no strategy here",
      iosSafariInstallVerified: true,
    });
    const honesty = assertPwaCertificationHonesty([failing]);
    expect(honesty.ok).toBe(false);
  });
});

describe("PwaCertification — real disk regression (apps/web/public)", () => {
  it("every icon declared in manifest.json and manifest-saas.json exists on disk", () => {
    for (const name of ["manifest.json", "manifest-saas.json"]) {
      const manifest = JSON.parse(readFileSync(join(publicDir, name), "utf8")) as {
        icons: Array<{ src: string }>;
      };
      expect(manifest.icons.length).toBeGreaterThan(0);
      for (const icon of manifest.icons) {
        const rel = icon.src.replace(/^\//, "");
        expect(existsSync(join(publicDir, rel)), `${name} -> ${icon.src}`).toBe(true);
      }
    }
  });

  it("push notification icons referenced by sw.js exist on disk (regression: were missing pre-fix)", () => {
    const swSource = readFileSync(join(publicDir, "sw.js"), "utf8");
    const iconRefs = [...swSource.matchAll(/["'](\/icons\/[\w.-]+)["']/g)].map((m) => m[1]!);
    expect(iconRefs.length).toBeGreaterThan(0);
    for (const ref of iconRefs) {
      expect(existsSync(join(publicDir, ref.replace(/^\//, ""))), ref).toBe(true);
    }
  });

  it("the full 8-size PNG icon set generated by generate-pwa-icons.mjs exists on disk", () => {
    for (const size of [72, 96, 128, 144, 152, 192, 384, 512]) {
      const p = join(publicDir, `icons/icon-${size}x${size}.png`);
      expect(existsSync(p), p).toBe(true);
    }
  });
});
