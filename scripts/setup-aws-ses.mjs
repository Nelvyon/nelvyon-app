/**
 * Provision Amazon SES for Nelvyon (domain + sender + IAM send user).
 *
 * Requires admin AWS credentials in env:
 *   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION (default eu-west-1)
 *
 * Usage:
 *   node scripts/setup-aws-ses.mjs
 *   node scripts/setup-aws-ses.mjs --domain nelvyon.com --from no-reply@nelvyon.com
 */
import {
  CreateAccessKeyCommand,
  CreateUserCommand,
  GetUserCommand,
  IAMClient,
  PutUserPolicyCommand,
} from "@aws-sdk/client-iam";
import {
  CreateEmailIdentityCommand,
  GetEmailIdentityCommand,
  GetAccountCommand,
  SESv2Client,
} from "@aws-sdk/client-sesv2";

const DOMAIN = process.argv.includes("--domain")
  ? process.argv[process.argv.indexOf("--domain") + 1]
  : "nelvyon.com";
const FROM_EMAIL = process.argv.includes("--from")
  ? process.argv[process.argv.indexOf("--from") + 1]
  : "no-reply@nelvyon.com";
const REGION = process.env.AWS_REGION?.trim() || process.env.SES_REGION?.trim() || "eu-west-1";
const IAM_USER = process.env.SES_IAM_USER?.trim() || "nelvyon-ses-sender";

function requireAdminCreds() {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY?.trim();
  if (!accessKeyId || !secretAccessKey) {
    throw new Error(
      "AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY required (admin IAM user to create SES + sender IAM user).",
    );
  }
  return { accessKeyId, secretAccessKey };
}

async function ensureDomainIdentity(ses, domain) {
  try {
    await ses.send(new GetEmailIdentityCommand({ EmailIdentity: domain }));
    return { action: "exists", identity: domain };
  } catch {
    const created = await ses.send(new CreateEmailIdentityCommand({ EmailIdentity: domain }));
    return { action: "created", identity: domain, dkim: created.DkimAttributes };
  }
}

async function ensureEmailIdentity(ses, email) {
  try {
    await ses.send(new GetEmailIdentityCommand({ EmailIdentity: email }));
    return { action: "exists", identity: email };
  } catch {
    await ses.send(new CreateEmailIdentityCommand({ EmailIdentity: email }));
    return { action: "created", identity: email };
  }
}

async function ensureIamSenderUser(iam, userName) {
  let userArn;
  try {
    const user = await iam.send(new GetUserCommand({ UserName: userName }));
    userArn = user.User?.Arn;
  } catch {
    const created = await iam.send(new CreateUserCommand({ UserName: userName }));
    userArn = created.User?.Arn;
  }

  const policyName = "NelvyonSesSendOnly";
  const policy = {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: ["ses:SendEmail", "ses:SendRawEmail"],
        Resource: "*",
      },
    ],
  };
  await iam.send(
    new PutUserPolicyCommand({
      UserName: userName,
      PolicyName: policyName,
      PolicyDocument: JSON.stringify(policy),
    }),
  );

  const keys = await iam.send(new CreateAccessKeyCommand({ UserName: userName }));
  return {
    userName,
    userArn,
    accessKeyId: keys.AccessKey?.AccessKeyId,
    secretAccessKey: keys.AccessKey?.SecretAccessKey,
  };
}

async function main() {
  const creds = requireAdminCreds();
  const ses = new SESv2Client({ region: REGION, credentials: creds });
  const iam = new IAMClient({ region: REGION, credentials: creds });

  const account = await ses.send(new GetAccountCommand({}));
  const domainResult = await ensureDomainIdentity(ses, DOMAIN);
  const emailResult = await ensureEmailIdentity(ses, FROM_EMAIL);
  const iamResult = await ensureIamSenderUser(iam, IAM_USER);

  console.log(
    JSON.stringify(
      {
        ok: true,
        region: REGION,
        productionAccessEnabled: account.ProductionAccessEnabled ?? null,
        domain: domainResult,
        fromEmail: emailResult,
        iam: {
          userName: iamResult.userName,
          accessKeyId: iamResult.accessKeyId,
        },
        railwayEnv: {
          SES_REGION: REGION,
          SES_ACCESS_KEY_ID: iamResult.accessKeyId,
          SES_SECRET_ACCESS_KEY: iamResult.secretAccessKey,
          SES_FROM_EMAIL: FROM_EMAIL,
          SES_FROM_NAME: "NELVYON",
        },
        nextSteps: [
          "Add DNS records for domain DKIM/verification in Route53 or your DNS provider (see AWS SES console → domain identity).",
          "If account is in SES sandbox, verify recipient test emails or request production access.",
          "Set railwayEnv vars on Railway Web staging and redeploy.",
          account.ProductionAccessEnabled
            ? "Production access enabled — can send to any recipient once domain is verified."
            : "Sandbox mode — only verified identities can receive mail.",
        ],
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: String(error.message || error) }, null, 2));
  process.exit(1);
});
