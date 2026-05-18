export type OnboardingStep =
  | "welcome_email_sent"
  | "profile_completed"
  | "first_agent_used"
  | "plan_activated";

export interface OnboardingStatus {
  userId: string;
  welcomeEmailSent: boolean;
  profileCompleted: boolean;
  firstAgentUsed: boolean;
  planActivated: boolean;
  completedAt: string | null;
  isComplete: boolean;
}
