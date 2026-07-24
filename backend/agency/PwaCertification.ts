/**
 * PWA certification — evaluates manifest + service worker contracts without a
 * browser. Pure/testable with in-memory fixtures; the real disk read against
 * `apps/web/public/manifest.json` / `manifest-saas.json` / `sw.js` happens in
 * `scripts/pwa-certify.mjs`, which mirrors this same logic (plain Node script,
 * no TS transform available there) and writes the evidence markdown.
 */

export type PwaManifestLike = {
  name?: string;
  short_name?: string;
  start_url?: string;
  display?: string;
  icons?: Array<{ src: string; sizes?: string; type?: string; purpose?: string }>;
  [key: string]: unknown;
};

export type PwaIconCheck = { src: string; existsOnDisk: boolean | null };

export type PwaCertificationInput = {
  manifestName: string;
  manifest: PwaManifestLike;
  swSource: string;
  /** Injected by the caller (script reading real disk state); null/omitted in pure unit tests. */
  iconExistsFn?: (src: string) => boolean;
  /** Only true when a human has actually verified "Add to Home Screen" on iOS Safari on a real device. */
  iosSafariInstallVerified?: boolean;
};

const REQUIRED_FIELDS = ["name", "icons", "display", "start_url"] as const;

export type PwaCertificationResult = {
  manifestName: string;
  ok: boolean;
  missingFields: string[];
  icons: PwaIconCheck[];
  missingIconFiles: string[];
  offlineStrategyDocumented: boolean;
  iosSafariInstall: "VERIFIED" | "PARTIAL_NOT_VERIFIED";
  violations: string[];
};

export function evaluatePwaManifest(input: PwaCertificationInput): PwaCertificationResult {
  const missingFields = REQUIRED_FIELDS.filter((field) => {
    const value = input.manifest[field];
    if (field === "icons") return !Array.isArray(value) || value.length === 0;
    return !value;
  });

  const icons: PwaIconCheck[] = (input.manifest.icons ?? []).map((icon) => ({
    src: icon.src,
    existsOnDisk: input.iconExistsFn ? input.iconExistsFn(icon.src) : null,
  }));
  const missingIconFiles = icons.filter((icon) => icon.existsOnDisk === false).map((icon) => icon.src);

  const offlineStrategyDocumented = /cache/i.test(input.swSource) && /offline/i.test(input.swSource);

  const iosSafariInstall: PwaCertificationResult["iosSafariInstall"] = input.iosSafariInstallVerified
    ? "VERIFIED"
    : "PARTIAL_NOT_VERIFIED";

  const violations: string[] = [
    ...missingFields.map((f) => `missing_field:${f}`),
    ...missingIconFiles.map((s) => `missing_icon_file:${s}`),
  ];
  if (!offlineStrategyDocumented) violations.push("offline_strategy_not_documented_in_sw");

  return {
    manifestName: input.manifestName,
    ok: violations.length === 0,
    missingFields,
    icons,
    missingIconFiles,
    offlineStrategyDocumented,
    iosSafariInstall,
    violations,
  };
}

/** Never allow a manifest to be reported healthy while also claiming an unverified iOS install as VERIFIED. */
export function assertPwaCertificationHonesty(
  results: readonly PwaCertificationResult[],
): { ok: boolean; violations: string[] } {
  const violations: string[] = [];
  for (const result of results) {
    if (result.iosSafariInstall === "VERIFIED" && !result.ok) {
      violations.push(`${result.manifestName}: cannot claim iOS Safari install VERIFIED while other checks fail`);
    }
  }
  return { ok: violations.length === 0, violations };
}

export function assertPwaCertificationCoreIntegrity(): { ok: boolean; violations: string[] } {
  const violations: string[] = [];

  const complete = evaluatePwaManifest({
    manifestName: "fixture-complete",
    manifest: {
      name: "Nelvyon",
      display: "standalone",
      start_url: "/",
      icons: [{ src: "/icons/icon-base.svg", sizes: "any", type: "image/svg+xml" }],
    },
    swSource: "/* cache offline strategy */ caches.open('x');",
    iconExistsFn: () => true,
  });
  if (!complete.ok) violations.push("complete_fixture_must_pass");

  const missingIcon = evaluatePwaManifest({
    manifestName: "fixture-missing-icon",
    manifest: {
      name: "Nelvyon",
      display: "standalone",
      start_url: "/",
      icons: [{ src: "/icons/missing.png" }],
    },
    swSource: "caches.open('x'); // offline",
    iconExistsFn: () => false,
  });
  if (missingIcon.ok || !missingIcon.missingIconFiles.includes("/icons/missing.png")) {
    violations.push("missing_icon_file_must_fail");
  }

  const missingFields = evaluatePwaManifest({
    manifestName: "fixture-missing-fields",
    manifest: {},
    swSource: "caches.open('x'); offline",
  });
  if (missingFields.ok || missingFields.missingFields.length !== REQUIRED_FIELDS.length) {
    violations.push("missing_required_fields_must_fail");
  }

  const noOfflineStrategy = evaluatePwaManifest({
    manifestName: "fixture-no-offline",
    manifest: {
      name: "Nelvyon",
      display: "standalone",
      start_url: "/",
      icons: [{ src: "/icons/icon-base.svg" }],
    },
    swSource: "self.addEventListener('fetch', () => {});",
    iconExistsFn: () => true,
  });
  if (noOfflineStrategy.ok || noOfflineStrategy.offlineStrategyDocumented) {
    violations.push("undocumented_offline_strategy_must_fail");
  }

  const dishonest = assertPwaCertificationHonesty([
    { ...missingIcon, iosSafariInstall: "VERIFIED" as const },
  ]);
  if (dishonest.ok) violations.push("honesty_check_must_reject_verified_claim_on_failing_result");

  const honest = assertPwaCertificationHonesty([complete]);
  if (!honest.ok) violations.push("honesty_check_must_accept_unverified_claim_by_default");

  return { ok: violations.length === 0, violations };
}
