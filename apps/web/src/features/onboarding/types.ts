export interface OnboardingStepStatus {
  key: string;
  title: string;
  description: string;
  icon: string;
  order: number;
  category: string;
  completed: boolean;
  completed_at?: string | null;
}

export interface OnboardingProgressResponse {
  workspace_id: number;
  user_id: string;
  steps: OnboardingStepStatus[];
  completed_count: number;
  total_count: number;
  progress_percent: number;
  is_complete: boolean;
}
