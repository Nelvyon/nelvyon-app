#!/usr/bin/env node
/**
 * Audit Amazon SES production readiness (CLI only, no secrets printed).
 * Usage: node scripts/audit-ses-production.mjs
 */
import { execSync } from "node:child_process";

const DOMAIN = "nelvyon.com";
const REGION = process.env.SES_REGION || "eu-west-1";
const WEBHOOK = "https://nelvyon.com/api/webhooks/ses";
const TOPIC = "nelvyon-ses-events";

function awsJson(cmd) {
  return JSON.parse(execSync(cmd, { encoding: "utf8" }));
}

function check(label, ok, detail = "") {
  const icon = ok ? "PASS" : "FAIL";
  console.log(`${icon} ${label}${detail ? ` — ${detail}` : ""}`);
  return ok;
}

let allOk = true;
const fail = (l, d) => {
  allOk = false;
  check(l, false, d);
};
const pass = (l, d) => check(l, true, d);

try {
  const account = awsJson(`aws sesv2 get-account --region ${REGION}`);
  pass("SES account reachable", `ProductionAccessEnabled=${account.ProductionAccessEnabled}`);
  if (account.EnforcementStatus === "HEALTHY") pass("EnforcementStatus", "HEALTHY");
  else fail("EnforcementStatus", account.EnforcementStatus ?? "unknown");
  const suppressed = account.SuppressionAttributes?.SuppressedReasons ?? [];
  if (suppressed.includes("BOUNCE") && suppressed.includes("COMPLAINT")) {
    pass("Account suppression list", "BOUNCE,COMPLAINT");
  } else {
    fail("Account suppression list", suppressed.join(",") || "not configured");
  }
  if (!account.ProductionAccessEnabled) fail("Production access", "still false — AWS manual appeal required (Case 178372013800016)");

  const identity = awsJson(`aws sesv2 get-email-identity --email-identity ${DOMAIN} --region ${REGION}`);
  const verified = identity.VerificationStatus === "SUCCESS";
  if (verified) pass("Domain verification", "SUCCESS");
  else fail("Domain verification", `${identity.VerificationStatus} (${identity.VerificationInfo?.ErrorType ?? "no error"})`);

  const dkimOk = identity.DkimAttributes?.Status === "SUCCESS";
  if (dkimOk) pass("DKIM", "SUCCESS");
  else fail("DKIM", identity.DkimAttributes?.Status ?? "unknown");

  const configSets = awsJson(`aws sesv2 list-configuration-sets --region ${REGION}`).ConfigurationSets ?? [];
  if (configSets.includes("nelvyon-prod")) pass("Configuration set nelvyon-prod", "exists");
  else fail("Configuration set", "nelvyon-prod missing");

  const dest = awsJson(
    `aws sesv2 get-configuration-set-event-destinations --configuration-set-name nelvyon-prod --region ${REGION}`,
  ).EventDestinations ?? [];
  const snsDest = dest.find((d) => d.SnsDestination?.TopicArn?.includes(TOPIC));
  if (snsDest?.Enabled) pass("Event destination SNS", snsDest.MatchingEventTypes?.join(","));
  else fail("Event destination", "SNS webhook not configured");

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
      pass("SNS HTTPS subscription", "confirmed");
    } else {
      fail("SNS HTTPS subscription", sub?.SubscriptionArn ?? "not found");
    }
  }

  const notif = awsJson(
    `aws ses get-identity-notification-attributes --identities ${DOMAIN} --region ${REGION}`,
  ).NotificationAttributes?.[DOMAIN];
  if (notif?.BounceTopic && notif?.ComplaintTopic) pass("Identity bounce/complaint topics", "set");
  else fail("Identity notification topics", "incomplete");
  if (
    notif?.HeadersInBounceNotificationsEnabled &&
    notif?.HeadersInComplaintNotificationsEnabled &&
    notif?.HeadersInDeliveryNotificationsEnabled
  ) {
    pass("Notification headers", "bounce,complaint,delivery enabled");
  } else {
    fail("Notification headers", "enable via set-identity-headers-in-notifications-enabled");
  }

  const identityConfig = identity.ConfigurationSetName ?? "";
  if (identityConfig === "nelvyon-prod") pass("Identity configuration set", "nelvyon-prod");
  else fail("Identity configuration set", identityConfig || "not attached");

  console.log(allOk && verified && dkimOk && account.ProductionAccessEnabled ? "\nSES_AUDIT_PASS" : "\nSES_AUDIT_INCOMPLETE");
  process.exit(allOk && verified && dkimOk && account.ProductionAccessEnabled ? 0 : 1);
} catch (err) {
  console.error("SES_AUDIT_ERROR:", err.message);
  process.exit(1);
}
