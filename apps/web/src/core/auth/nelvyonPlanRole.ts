import type { UserRole } from "@/core/auth/types";

/** Maps SaaS plan from nelvyon_users to UI RBAC (OS module requires at least member). */
export function nelvyonPlanToUiRole(plan: string): UserRole {
  if (plan === "admin") return "super_admin";
  if (plan === "enterprise") return "admin";
  if (plan === "pro" || plan === "starter") return "operator";
  return "member";
}
