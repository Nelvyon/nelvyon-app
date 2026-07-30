#!/usr/bin/env node
/**
 * Build signed Android release APK for NELVYON Capacitor shell.
 *
 *   node scripts/build-android-release-apk.mjs
 *
 * Creates a local release keystore if missing (sideload / internal).
 * Does NOT upload to Play Store. Never prints keystore passwords.
 */
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const androidDir = path.join(root, "apps/mobile/android");
const keystoreDir = path.join(androidDir, "keystore");
const keystorePath = path.join(keystoreDir, "nelvyon-release.keystore");
const propsPath = path.join(androidDir, "keystore.properties");
const outDir = path.join(root, ".release-logs/android");
const versionName = "1.0.0";
const versionCode = 10000;

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    encoding: "utf8",
    shell: true,
    cwd: opts.cwd || root,
    env: { ...process.env, ...(opts.env || {}) },
  });
  return {
    status: r.status ?? 1,
    out: `${r.stdout ?? ""}${r.stderr ?? ""}`,
  };
}

fs.mkdirSync(keystoreDir, { recursive: true });
fs.mkdirSync(outDir, { recursive: true });

if (!fs.existsSync(keystorePath) || !fs.existsSync(propsPath)) {
  const storePassword = crypto.randomBytes(18).toString("base64url");
  const keyPassword = storePassword;
  const alias = "nelvyon";
  const kt = run("keytool", [
    "-genkeypair",
    "-v",
    "-storetype",
    "PKCS12",
    "-keystore",
    `"${keystorePath}"`,
    "-alias",
    alias,
    "-keyalg",
    "RSA",
    "-keysize",
    "2048",
    "-validity",
    "10000",
    "-storepass",
    storePassword,
    "-keypass",
    keyPassword,
    "-dname",
    '"CN=Nelvyon,OU=Mobile,O=Nelvyon,L=ES,C=ES"',
  ]);
  if (kt.status !== 0) {
    console.error("FAIL keytool:\n" + kt.out.slice(-2000));
    process.exit(1);
  }
  const props = [
    "storePassword=" + storePassword,
    "keyPassword=" + keyPassword,
    "keyAlias=" + alias,
    "storeFile=keystore/nelvyon-release.keystore",
    "",
  ].join("\n");
  fs.writeFileSync(propsPath, props, { encoding: "utf8", mode: 0o600 });
  console.log("Created local release keystore (gitignored).");
}

const sync = run("pnpm", ["-C", "apps/mobile", "exec", "cap", "sync", "android"]);
if (sync.status !== 0) {
  console.error("FAIL cap sync:\n" + sync.out.slice(-3000));
  process.exit(1);
}

const env = {
  ANDROID_HOME: process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || path.join(process.env.LOCALAPPDATA || "", "Android", "Sdk"),
  ANDROID_SDK_ROOT:
    process.env.ANDROID_SDK_ROOT || process.env.ANDROID_HOME || path.join(process.env.LOCALAPPDATA || "", "Android", "Sdk"),
  JAVA_HOME: process.env.JAVA_HOME || "",
};
if (!process.env.JAVA_HOME) {
  const guess = "C:\\Program Files\\Microsoft\\jdk-21.0.11.10-hotspot";
  if (fs.existsSync(guess)) env.JAVA_HOME = guess;
}

const build = run("gradlew.bat", ["assembleRelease", "--no-daemon"], {
  cwd: androidDir,
  env,
});
if (build.status !== 0) {
  console.error("FAIL assembleRelease:\n" + build.out.slice(-5000));
  process.exit(1);
}

const builtApk = path.join(androidDir, "app/build/outputs/apk/release/app-release.apk");
if (!fs.existsSync(builtApk)) {
  console.error("FAIL: release APK missing at " + builtApk);
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const deliverable = path.join(outDir, `nelvyon-saas-${versionName}-${stamp}.apk`);
fs.copyFileSync(builtApk, deliverable);
const buf = fs.readFileSync(deliverable);
const sha256 = crypto.createHash("sha256").update(buf).digest("hex");
const sizeBytes = buf.length;
const sizeMb = (sizeBytes / (1024 * 1024)).toFixed(2);

const report = {
  ok: true,
  applicationId: "com.nelvyon.saas",
  versionName,
  versionCode,
  apk: deliverable,
  apkBuildOutput: builtApk,
  sizeBytes,
  sizeMb: Number(sizeMb),
  sha256,
  install: [
    "Enable Install unknown apps for your file manager / adb on the phone",
    `adb install -r "${deliverable}"`,
    "Or copy the APK to the device and open it",
    "Open Nelvyon → login at https://nelvyon.com/saas/dashboard (webview)",
  ],
  notes: [
    "Signed with local release keystore (apps/mobile/android/keystore/) — not Play App Signing",
    "Play Store upload requires CEO Google Play account + preferably a dedicated upload key",
  ],
};

const reportPath = path.join(outDir, `nelvyon-saas-${versionName}-release-report.json`);
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
process.exit(0);
