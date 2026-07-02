import {
  getPartnerStripeAccount,
  upsertPartnerStripeAccount,
} from "@/lib/partners/partnerConnectStore";
import type { PartnerConnectStatus } from "@/lib/partners/partnerConnectTypes";
import {
  connectStatusLabel,
  createConnectAccountLink,
  createExpressConnectAccount,
  isStripeConnectConfigured,
  mapStripeAccountStatus,
  retrieveConnectAccount,
} from "@/lib/partners/partnerStripeConnect";

export function buildConnectStatus(
  row: Awaited<ReturnType<typeof getPartnerStripeAccount>>,
  configured: boolean,
): PartnerConnectStatus {
  if (!configured) {
    return {
      configured: false,
      onboarding_status: "not_started",
      charges_enabled: false,
      payouts_enabled: false,
      details_submitted: false,
      stripe_account_id: null,
      onboarding_complete: false,
      label: "Stripe no configurado",
    };
  }
  if (!row) {
    return {
      configured: true,
      onboarding_status: "not_started",
      charges_enabled: false,
      payouts_enabled: false,
      details_submitted: false,
      stripe_account_id: null,
      onboarding_complete: false,
      label: connectStatusLabel("not_started"),
    };
  }
  const complete =
    row.onboarding_status === "active" && row.charges_enabled && row.payouts_enabled;
  return {
    configured: true,
    onboarding_status: row.onboarding_status,
    charges_enabled: row.charges_enabled,
    payouts_enabled: row.payouts_enabled,
    details_submitted: row.details_submitted,
    stripe_account_id: row.stripe_account_id,
    onboarding_complete: complete,
    label: connectStatusLabel(row.onboarding_status),
  };
}

export async function getPartnerConnectStatus(
  workspaceId: number,
  refreshFromStripe = false,
): Promise<PartnerConnectStatus> {
  const configured = isStripeConnectConfigured();
  let row = await getPartnerStripeAccount(workspaceId);

  if (configured && refreshFromStripe && row?.stripe_account_id) {
    try {
      const account = await retrieveConnectAccount(row.stripe_account_id);
      row = await upsertPartnerStripeAccount({
        partnerWorkspaceId: workspaceId,
        partnerUserId: row.partner_user_id,
        stripeAccountId: account.id,
        onboardingStatus: mapStripeAccountStatus(account),
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
      });
    } catch {
      /* keep cached row */
    }
  }

  return buildConnectStatus(row, configured);
}

export async function startPartnerConnectOnboarding(params: {
  workspaceId: number;
  userId: string;
  email: string;
  returnUrl: string;
  refreshUrl: string;
}): Promise<{ url: string; account_id: string }> {
  if (!isStripeConnectConfigured()) {
    throw new Error("Stripe Connect no está configurado en este entorno");
  }

  const row = await getPartnerStripeAccount(params.workspaceId);
  let accountId = row?.stripe_account_id;

  if (!accountId) {
    const account = await createExpressConnectAccount({
      email: params.email,
      partnerWorkspaceId: params.workspaceId,
      partnerUserId: params.userId,
    });
    accountId = account.id;
    await upsertPartnerStripeAccount({
      partnerWorkspaceId: params.workspaceId,
      partnerUserId: params.userId,
      stripeAccountId: account.id,
      onboardingStatus: mapStripeAccountStatus(account),
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
    });
  }

  const link = await createConnectAccountLink({
    accountId,
    returnUrl: params.returnUrl,
    refreshUrl: params.refreshUrl,
  });

  return { url: link.url, account_id: accountId };
}
