export interface UsageSummary {
  plan: string;
  monthlyLimit: number;
  usedThisMonth: number;
  remainingThisMonth: number;
  percentUsed: number;
  lastResetAt: string;
}
