import { UserRole } from "@/core/auth/types";

const WEIGHT: Record<UserRole, number> = {
  member: 1,
  operator: 2,
  admin: 3,
  super_admin: 4,
};

export function hasMinimumRole(role: UserRole, minimum: UserRole) {
  return WEIGHT[role] >= WEIGHT[minimum];
}
