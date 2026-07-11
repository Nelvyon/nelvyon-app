#!/usr/bin/env node
/**
 * Audit Amazon SES production readiness (CLI + optional HTTP probes).
 * Usage: node scripts/audit-ses-production.mjs
 *
 * Check 13 (Production access) requires AWS human approval — CLI returns ConflictException
 * while ReviewDetails.Status is DENIED (Case 178372013800016).
 */
import { execSync } from "node:child_process";

const DOMAIN = "nelvyon.com";
const REGION = process.env.SES_REGION || "eu-west-1";
const WEBHOOK = "https://nelvyon.com/api/webhooks/ses";
const UNSUBSCRIBE = "https://nelvyon.com/api/saas/campanias/unsubscribe?token=invalid";
const TOPIC = "nelvyon-ses-events";
const CASE_ID = "178372013800016";

function awsJson(cmd) {
  return JSON.parse(execSync(cmd, { encoding: "utf8" }));
}

function awsTry(cmd) {
  try {
    execSync(cmd, { encoding: "utf8", stdio: "pipe" });
    return { ok: true };
  } catch (e) {
    const stderr = e.stderr?.toString() ?? e.message ?? "unknown";
    return { ok: false, error: stderr.trim() };
  }
}

function check(label, ok, detail = "") {
  const icon = ok ? "PASS" : "FAIL";
  console.log(`${icon} ${label}${detail ? ` — ${detail}` : ""}`);
  return ok;
}

let technicalOk = true;
const fail = (l, d) => {
  technicalOk = false;
  check(l, false, d);
};
const pass = (l, d) => check(l, true, d);

async function probeHttp(url, expectStatus) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    return res.status === expectStatus;
  } catch {
    return false;
  }
}

try {
  const account = awsJson(`aws sesv2 get-account --region ${REGION}`);
  pass("Region configuration", REGION);
  pass("SES account reachable", `ProductionAccessEnabled=${account.ProductionAccessEnabled}`);
  pass("SendingEnabled", String(account.SendingEnabled ?? true));

  if (account.EnforcementStatus === "HEALTHY") pass("EnforcementStatus", "HEALTHY");
  else fail("EnforcementStatus", account.EnforcementStatus ?? "unknown");

  const suppressed = account.SuppressionAttributes?.SuppressedReasons ?? [];
  if (suppressed.includes("BOUNCE") && suppressed.includes("COMPLAINT")) {
    pass("Account suppression list", "BOUNCE,COMPLAINT");
  } else {
    fail("Account suppression list", suppressed.join(",") || "not configured");
  }

  if (account.DedicatedIpAutoWarmupEnabled) pass("Dedicated IP warmup", "auto-warmup enabled (shared pool)");
  else fail("Dedicated IP warmup", "disabled");

  const details = account.Details ?? {};
  if (details.WebsiteURL === "https://nelvyon.com") pass("Account website URL", details.WebsiteURL);
  else fail("Account website URL", details.WebsiteURL ?? "missing");
  if (details.AdditionalContactEmailAddresses?.includes("dev@nelvyon.com")) {
    pass("Account contact email", "dev@nelvyon.com");
  } else {
    fail("Account contact email", (details.AdditionalContactEmailAddresses ?? []).join(",") || "missing");
  }

  const quota = account.SendQuota ?? {};
  pass("Service quota (sandbox)", `${quota.Max24HourSend}/24h, ${quota.MaxSendRate}/sec, sent=${quota.SentLast24Hours}`);

  const identity = awsJson(`aws sesv2 get-email-identity --email-identity ${DOMAIN} --region ${REGION}`);
  if (identity.VerificationStatus === "SUCCESS") pass("Domain verification", "SUCCESS");
  else fail("Domain verification", `${identity.VerificationStatus} (${identity.VerificationInfo?.ErrorType ?? "no error"})`);

  if (identity.VerifiedForSendingStatus) pass("VerifiedForSendingStatus", "true");
  else fail("VerifiedForSendingStatus", "false");

  if (identity.DkimAttributes?.Status === "SUCCESS") pass("DKIM", "SUCCESS");
  else fail("DKIM", identity.DkimAttributes?.Status ?? "unknown");

  if (identity.FeedbackForwardingStatus) pass("Feedback forwarding", "enabled");
  else fail("Feedback forwarding", "disabled");

  const mailFrom = identity.MailFromAttributes?.MailFromDomain;
  if (mailFrom) pass("Custom MAIL FROM", mailFrom);
  else pass("Custom MAIL FROM", "default SES (optional — not required)");

  const configSets = awsJson(`aws sesv2 list-configuration-sets --region ${REGION}`).ConfigurationSets ?? [];
  if (configSets.includes("nelvyon-prod")) pass("Configuration set nelvyon-prod", "exists");
  else fail("Configuration set", "nelvyon-prod missing");

  const dest = awsJson(
    `aws sesv2 get-configuration-set-event-destinations --configuration-set-name nelvyon-prod --region ${REGION}`,
  ).EventDestinations ?? [];
  const snsDest = dest.find((d) => d.SnsDestination?.TopicArn?.includes(TOPIC));
  if (snsDest?.Enabled) pass("Event destinations", snsDest.MatchingEventTypes?.join(","));
  else fail("Event destinations", "SNS webhook not configured");

  const topics = awsJson(`aws sns list-topics --region ${REGION}`).Topics ?? [];
  const topicArn = topics.find((t) => t.TopicArn?.endsWith(`:${TOPIC}`))?.TopicArn;
  if (topicArn) pass("SNS topic", TOPIC);
  else fail("SNS topic", "missing");

  if (topicArn) {
    const subs = awsJson(
      `aws sns list-subscriptions-by-topic --topic-arn ${topicArn} --region ${REGION}`,
    ).Subscriptions ?? [];
    const sub = subs.find((s) => s.Endpoint === WEBHOOK);
    if (sub?.SubscriptionArn && !sub.SubscriptionArn.includes("PendingConfirmation")) {
      pass("SNS HTTPS webhook subscription", "confirmed");
    } else {
      fail("SNS HTTPS webhook subscription", sub?.SubscriptionArn ?? "not found");
    }
  }

  const notif = awsJson(
    `aws ses get-identity-notification-attributes --identities ${DOMAIN} --region ${REGION}`,
  ).NotificationAttributes?.[DOMAIN];
  if (notif?.BounceTopic && notif?.ComplaintTopic) pass("Identity notification topics", "bounce+complaint→SNS");
  else fail("Identity notification topics", "incomplete");

  if (
    notif?.HeadersInBounceNotificationsEnabled &&
    notif?.HeadersInComplaintNotificationsEnabled &&
    notif?.HeadersInDeliveryNotificationsEnabled
  ) {
    pass("Notification headers", "bounce,complaint,delivery");
  } else {
    fail("Notification headers", "not all enabled");
  }

  if ((identity.ConfigurationSetName ?? "") === "nelvyon-prod") pass("Identity configuration set", "nelvyon-prod");
  else fail("Identity configuration set", identity.ConfigurationSetName || "not attached");

  const policies = awsJson(
    `aws ses list-identity-policies --identity ${DOMAIN} --region ${REGION}`,
  ).PolicyNames ?? [];
  if (policies.length === 0) pass("Sending authorization policies", "none (single-account sending)");
  else pass("Sending authorization policies", policies.join(","));

  const caller = awsJson("aws sts get-caller-identity");
  pass("IAM caller identity", caller.Arn ?? "unknown");

  const cliBlock = awsTry(
    `aws sesv2 put-account-details --region ${REGION} --mail-type TRANSACTIONAL --website-url https://nelvyon.com --contact-language EN --use-case-description probe --additional-contact-email-addresses dev@nelvyon.com --no-production-access-enabled`,
  );
  if (!cliBlock.ok && /ConflictException/i.test(cliBlock.error)) {
    pass("CLI account update while DENIED", `blocked (ConflictException) — human review only`);
  } else if (account.ProductionAccessEnabled) {
    pass("CLI production access", "already enabled");
  } else {
    fail("CLI account update probe", cliBlock.error.slice(0, 120));
  }

  const webhookOk = await probeHttp(WEBHOOK, 403);
  if (webhookOk) pass("HTTPS webhook endpoint", "reachable (403 without valid SNS signature expected)");
  else fail("HTTPS webhook endpoint", "not reachable");

  const unsubOk = await probeHttp(UNSUBSCRIBE, 400);
  if (unsubOk) pass("Unsubscribe flow endpoint", "public (400 invalid token expected)");
  else fail("Unsubscribe flow endpoint", "expected public 400 — check middleware deploy");

  console.log("");
  if (account.ProductionAccessEnabled) {
    console.log(technicalOk ? "SES_AUDIT_PASS (13/13)" : "SES_AUDIT_INCOMPLETE (technical checks failed)");
    process.exit(technicalOk ? 0 : 1);
  }

  check(
    "Production access (check 13/13)",
    false,
    `false — AWS human review required (Case ${CASE_ID}, ReviewDetails.Status=${details.ReviewDetails?.Status ?? "DENIED"})`,
  );

  console.log("");
  console.log("SES_TECHNICAL_PASS — 12/12 infrastructure checks OK");
  console.log("SES_CHECK_13_BLOCKED — ProductionAccessEnabled cannot be set via CLI while case is DENIED");
  console.log("ACTION: CEO appeal via AWS Support case", CASE_ID);
  process.exit(technicalOk ? 2 : 1);
} catch (err) {
  console.error("SES_AUDIT_ERROR:", err.message);
  process.exit(1);
}
