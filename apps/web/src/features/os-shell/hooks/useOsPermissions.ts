"use client";

import { useAuth } from "@/core/auth/AuthContext";
import { can } from "@/core/routing/roleMatrix";

export function useOsPermissions() {
  const { user } = useAuth();
  const role = user?.role;
  return {
    canView: role ? can(role, "os", "view") : false,
    canCreate: role ? can(role, "os", "create") : false,
    canEdit: role ? can(role, "os", "edit") : false,
    canDelete: role ? can(role, "os", "delete") : false,
  };
}
