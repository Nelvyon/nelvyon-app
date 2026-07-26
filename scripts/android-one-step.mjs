#!/usr/bin/env node
/**
 * Android — ONE STEP for Daniel (after USB debugging / AVD is connected).
 *
 *   node scripts/android-one-step.mjs
 *
 * Does: adb devices check → install APK → print launch hint.
 * Never claims auth/CRM PASS without human confirmation.
 * Never touches Play Store.
 */
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const apk = path.join(
  root,
  "apps/mobile/android/app/build/outputs/apk/debug/app-debug.apk",
);

function run(cmd, args) {
  const r = spawnSync(cmd, args, { encoding: "utf8", shell: true });
  return {
    status: r.status,
    out: `${r.stdout ?? ""}${r.stderr ?? ""}`.trim(),
  };
}

if (!fs.existsSync(apk)) {
  console.error("FAIL: APK missing. Build first: cd apps/mobile/android && .\\gradlew.bat assembleDebug");
  process.exit(1);
}

const buf = fs.readFileSync(apk);
const sha256 = crypto.createHash("sha256").update(buf).digest("hex");
const devices = run("adb", ["devices"]);
const lines = devices.out
  .split(/\r?\n/)
  .slice(1)
  .map((l) => l.trim())
  .filter((l) => /\tdevice$/.test(l));

if (lines.length === 0) {
  console.log(
    JSON.stringify(
      {
        verdict: "BLOCKED_EXTERNAL",
        sha256,
        apk,
        message:
          "No adb device. Connect phone (USB debugging) or start AVD, then re-run: node scripts/android-one-step.mjs",
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const install = run("adb", ["install", "-r", apk]);
const ok = /Success/i.test(install.out);
console.log(
  JSON.stringify(
    {
      verdict: ok ? "INSTALL_OK" : "FAIL_INSTALL",
      sha256,
      device: lines[0],
      installTail: install.out.slice(-400),
      nextHuman: [
        "Open the NELVYON app on the device",
        "Log in to SaaS → confirm CRM/tasks load for your tenant",
        "Toggle airplane mode briefly → confirm offline/error UX",
        "Reply PASS or list failures — do not claim VERIFIED until then",
      ],
    },
    null,
    2,
  ),
);
process.exit(ok ? 0 : 1);
