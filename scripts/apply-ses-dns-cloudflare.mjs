#!/usr/bin/env node
/**
 * Apply Amazon SES domain verification + DKIM DNS records in Cloudflare.
 * Requires: AWS CLI configured (eu-west-1), CLOUDFLARE_API_TOKEN, CLOUDFLARE_ZONE_ID (or auto-resolve).
 *
 * Usage:
 *   CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ZONE_ID=... node scripts/apply-ses-dns-cloudflare.mjs
 *   node scripts/apply-ses-dns-cloudflare.mjs --dry-run
 */
import { execSync } from "node:child_process";

const DOMAIN = "nelvyon.com";
const REGION = process.env.SES_REGION || "eu-west-1";
const dryRun = process.argv.includes("--dry-run");

function awsJson(cmd) {
  return JSON.parse(execSync(cmd, { encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] }));
}

async function cfApi(method, path, body) {
  const token = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (!token) throw new Error("CLOUDFLARE_API_TOKEN missing");
  const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json();
  if (!json.success) {
    throw new Error(`Cloudflare API ${method} ${path}: ${JSON.stringify(json.errors)}`);
  }
  return json.result;
}

async function resolveZoneId() {
  if (process.env.CLOUDFLARE_ZONE_ID?.trim()) return process.env.CLOUDFLARE_ZONE_ID.trim();
  const zones = await cfApi("GET", `/zones?name=${DOMAIN}`);
  if (!zones?.length) throw new Error(`Cloudflare zone not found for ${DOMAIN}`);
  return zones[0].id;
}

async function upsertRecord(zoneId, record) {
  const existing = await cfApi(
    "GET",
    `/zones/${zoneId}/dns_records?type=${encodeURIComponent(record.type)}&name=${encodeURIComponent(record.name)}`,
  );
  const match = existing.find((r) => r.name === record.name && r.type === record.type);
  if (dryRun) {
    console.log(`${match ? "UPDATE" : "CREATE"} ${record.type} ${record.name} → ${record.content}`);
    return;
  }
  if (match) {
    await cfApi("PUT", `/zones/${zoneId}/dns_records/${match.id}`, record);
    console.log(`UPDATED ${record.type} ${record.name}`);
  } else {
    await cfApi("POST", `/zones/${zoneId}/dns_records`, record);
    console.log(`CREATED ${record.type} ${record.name}`);
  }
}

function sesRecords() {
  const verify = awsJson(
    `aws ses get-identity-verification-attributes --identities ${DOMAIN} --region ${REGION}`,
  ).VerificationAttributes[DOMAIN];
  const dkim = awsJson(
    `aws ses get-identity-dkim-attributes --identities ${DOMAIN} --region ${REGION}`,
  ).DkimAttributes[DOMAIN];

  if (!verify?.VerificationToken) throw new Error("SES verification token not found");
  if (!dkim?.DkimTokens?.length) throw new Error("SES DKIM tokens not found");

  const records = [
    {
      type: "TXT",
      name: `_amazonses.${DOMAIN}`,
      content: verify.VerificationToken,
      ttl: 300,
    },
    ...dkim.DkimTokens.map((token) => ({
      type: "CNAME",
      name: `${token}._domainkey.${DOMAIN}`,
      content: `${token}.dkim.amazonses.com`,
      ttl: 300,
    })),
  ];
  return records;
}

async function main() {
  const records = sesRecords();
  console.log(`SES DNS records for ${DOMAIN} (${records.length} total):`);
  for (const r of records) console.log(`  ${r.type} ${r.name}`);

  const zoneId = process.env.CLOUDFLARE_API_TOKEN ? await resolveZoneId() : null;
  if (!zoneId) {
    console.log("\nCLOUDFLARE_API_TOKEN not set — print-only mode.");
    for (const r of records) console.log(JSON.stringify(r));
    process.exit(0);
  }

  for (const r of records) {
    await upsertRecord(zoneId, { ...r, proxied: false });
  }
  console.log("\nDone. Wait 5–30 min then run: node scripts/audit-ses-production.mjs");
}

main().catch((err) => {
  console.error("FAIL:", err.message);
  process.exit(1);
});
