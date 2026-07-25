#!/usr/bin/env node
/**
 * Android device smoke — 3 steps (BLOCKED without adb device).
 *
 * Usage:
 *   node scripts/staging-smoke-android-device.mjs
 *   node scripts/staging-smoke-android-device.mjs --apk path/to/app-debug.apk
 *
 * Never claims PASS without a connected device. Does not touch Play Store.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..");
const defaultApk = path.join(
  root,
  "apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk",
);
const apkArg = process.argv.find((a) => a.startsWith("--apk="));
const apk = apkArg ? apkArg.slice("--apk=".length) : defaultApk;
const evidenceDir = path.join(root, "scripts/docs/evidence/os-saas-e2e/modules");

function sh(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8" }).trim();
  } catch (e) {
    return `ERR: ${e instanceof Error ? e.message : String(e)}`;
  }
}

const devicesOut = sh("adb devices");
const deviceLines = devicesOut
  .split(/\r?\n/)
  .slice(1)
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith("*") && l.includes("device"));

const apkExists = fs.existsSync(apk);
let sha256 = null;
let size = null;
if (apkExists) {
  const buf = fs.readFileSync(apk);
  sha256 = crypto.createHash("sha256").update(buf).digest("hex");
  size = buf.length;
}

const result = {
  date: new Date().toISOString(),
  apkPath: apk,
  apkExists,
  sha256,
  sizeBytes: size,
  adbDevicesRaw: devicesOut,
  devicesConnected: deviceLines.length,
  steps: {
    "1_apk_present": apkExists ? "PASS" : "FAIL",
    "2_adb_device": deviceLines.length > 0 ? "PASS" : "BLOCKED_EXTERNAL",
    "3_install_launch": "NOT_RUN",
  },
  verdict: "BLOCKED_EXTERNAL",
  nextDaniel: [
    "Connect phone with USB debugging OR start an AVD",
    "Confirm: adb devices lists the target",
    `adb install -r ${apk}`,
    "Open app → SaaS login → confirm tenant isolation visually",
  ],
};

if (!apkExists) {
  result.verdict = "FAIL_NO_APK";
} else if (deviceLines.length === 0) {
  result.verdict = "BLOCKED_EXTERNAL";
  result.steps["3_install_launch"] = "BLOCKED_EXTERNAL";
} else {
  // Device present — attempt install only (no claim of full E2E auth without evidence file update by human)
  const install = sh(`adb install -r "${apk}"`);
  result.installOutput = install;
  result.steps["3_install_launch"] = install.includes("Success") ? "PASS_INSTALL" : "FAIL_INSTALL";
  result.verdict = install.includes("Success")
    ? "INSTALL_OK_MANUAL_AUTH_PENDING"
    : "FAIL_INSTALL";
}

const md = `# Android device smoke

| Campo | Valor |
|-------|-------|
| Fecha | ${result.date} |
| APK | \`${apk}\` |
| SHA256 | \`${sha256 ?? "n/a"}\` |
| Size | ${size ?? "n/a"} bytes |
| adb devices | ${deviceLines.length} |
| Verdict | **${result.verdict}** |

## Steps

| Step | Result |
|------|--------|
| 1 APK present | ${result.steps["1_apk_present"]} |
| 2 adb device | ${result.steps["2_adb_device"]} |
| 3 install | ${result.steps["3_install_launch"]} |

## Next (Daniel)

${result.nextDaniel.map((s, i) => `${i + 1}. ${s}`).join("\n")}

## Raw adb

\`\`\`
${devicesOut}
\`\`\`
`;

fs.writeFileSync(path.join(evidenceDir, "mobile.android_device_smoke_latest.md"), md);
fs.writeFileSync(
  path.join(evidenceDir, "mobile.android_device_smoke_latest.json"),
  JSON.stringify(result, null, 2),
);
console.log(JSON.stringify({ verdict: result.verdict, sha256, devices: deviceLines.length }, null, 2));
process.exit(result.verdict.startsWith("FAIL") ? 1 : 0);
