import { DbClient } from "../db/DbClient";
import { sendEmail } from "../email";

export type OnboardingStep = "welcome_email_sent" | "profile_completed" | "first_agent_used" | "plan_activated";

export interface OnboardingStatus {
  userId: string;
  welcomeEmailSent: boolean;
  profileCompleted: boolean;
  firstAgentUsed: boolean;
  planActivated: boolean;
  completedAt: string | null;
  isComplete: boolean;
}

const STEP_COLUMNS: Record<OnboardingStep, string> = {
  welcome_email_sent: "welcome_email_sent",
  profile_completed: "profile_completed",
  first_agent_used: "first_agent_used",
  plan_activated: "plan_activated",
};

export async function initOnboarding(userId: string, userEmail: string, userName: string): Promise<void> {
  const db = DbClient.getInstance();
  await db.query(
    `INSERT INTO onboarding (user_id, welcome_email_sent)
     VALUES ($1, false)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId],
  );
  try {
    await sendEmail("welcome", {
      email: userEmail,
      name: userName,
      appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "https://nelvyon.com",
    });
    await db.query(`UPDATE onboarding SET welcome_email_sent=true, updated_at=now() WHERE user_id=$1`, [userId]);
  } catch (err) {
    console.error("[onboarding] welcome email failed:", err);
  }
}

export async function completeStep(userId: string, step: OnboardingStep): Promise<void> {
  const db = DbClient.getInstance();
  await db.query(
    `INSERT INTO onboarding (user_id, welcome_email_sent)
     VALUES ($1, false)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId],
  );
  const col = STEP_COLUMNS[step];
  await db.query(`UPDATE onboarding SET ${col} = true, updated_at=now() WHERE user_id=$1`, [userId]);
  const rows = await db.query<{
    welcome_email_sent: boolean;
    profile_completed: boolean;
    first_agent_used: boolean;
    plan_activated: boolean;
  }>(
    `SELECT welcome_email_sent, profile_completed, first_agent_used, plan_activated
     FROM onboarding WHERE user_id=$1`,
    [userId],
  );
  if (!rows.length) return;
  const row = rows[0];
  const allDone =
    row.welcome_email_sent && row.profile_completed && row.first_agent_used && row.plan_activated;
  if (allDone) {
    await db.query(`UPDATE onboarding SET completed_at=now(), updated_at=now() WHERE user_id=$1 AND completed_at IS NULL`, [
      userId,
    ]);
  }
}

export async function getOnboardingStatus(userId: string): Promise<OnboardingStatus> {
  const db = DbClient.getInstance();
  const rows = await db.query<{
    welcome_email_sent: boolean;
    profile_completed: boolean;
    first_agent_used: boolean;
    plan_activated: boolean;
    completed_at: string | null;
  }>(
    `SELECT welcome_email_sent, profile_completed, first_agent_used,
            plan_activated, completed_at
     FROM onboarding WHERE user_id=$1`,
    [userId],
  );
  if (!rows.length) {
    return {
      userId,
      welcomeEmailSent: false,
      profileCompleted: false,
      firstAgentUsed: false,
      planActivated: false,
      completedAt: null,
      isComplete: false,
    };
  }
  const r = rows[0];
  if (!r) {
    return {
      userId,
      welcomeEmailSent: false,
      profileCompleted: false,
      firstAgentUsed: false,
      planActivated: false,
      completedAt: null,
      isComplete: false,
    };
  }
  return {
    userId,
    welcomeEmailSent: r.welcome_email_sent,
    profileCompleted: r.profile_completed,
    firstAgentUsed: r.first_agent_used,
    planActivated: r.plan_activated,
    completedAt: r.completed_at,
    isComplete: !!r.completed_at,
  };
}
