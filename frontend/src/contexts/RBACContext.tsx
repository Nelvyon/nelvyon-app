/**
 * RBACContext — Provides role-based access control throughout the app.
 *
 * Loads the user's role from the backend `user_roles` table.
 * Falls back to "user" role if no role is assigned.
 * Provides permission checking hooks and components.
 */
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { useAuth } from "./AuthContext";
import { api } from "@/lib/api";
import {
  type Role,
  type Permission,
  DEFAULT_ROLE,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  getPermissionsForRole,
  isRoleAtLeast,
  getRoleLabel,
  getRoleColor,
} from "@/lib/rbac";

interface RBACContextValue {
  /** Current user's role */
  role: Role;
  /** Whether role data is still loading */
  roleLoading: boolean;
  /** The role record ID in the database (for updates) */
  roleRecordId: number | null;
  /** Check if user has a specific permission */
  can: (permission: Permission) => boolean;
  /** Check if user has ALL specified permissions */
  canAll: (permissions: Permission[]) => boolean;
  /** Check if user has ANY of the specified permissions */
  canAny: (permissions: Permission[]) => boolean;
  /** Check if user's role is at least the specified level */
  isAtLeast: (minRole: Role) => boolean;
  /** All permissions for the current role */
  permissions: Set<Permission>;
  /** Human-readable role label */
  roleLabel: string;
  /** CSS classes for role badge */
  roleColorClass: string;
  /** Refresh role from backend */
  refreshRole: () => Promise<void>;
}

const RBACContext = createContext<RBACContextValue>({
  role: DEFAULT_ROLE,
  roleLoading: true,
  roleRecordId: null,
  can: () => false,
  canAll: () => false,
  canAny: () => false,
  isAtLeast: () => false,
  permissions: new Set(),
  roleLabel: "",
  roleColorClass: "",
  refreshRole: async () => {},
});

export function RBACProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [role, setRole] = useState<Role>(DEFAULT_ROLE);
  const [roleLoading, setRoleLoading] = useState(true);
  const [roleRecordId, setRoleRecordId] = useState<number | null>(null);

  const loadRole = useCallback(async () => {
    if (!user?.id) {
      setRole(DEFAULT_ROLE);
      setRoleLoading(false);
      return;
    }

    try {
      setRoleLoading(true);
      // Query user_roles for this user
      const res = await api.getUserRoles(0, 100);
      const items = (res.items || []) as Array<Record<string, unknown>>;
      const myRole = items.find(
        (r) => r.user_id === user.id && r.is_active !== false
      );

      if (myRole) {
        setRole((myRole.role as Role) || DEFAULT_ROLE);
        setRoleRecordId((myRole.id as number) || null);
      } else {
        // No role assigned — create default role
        try {
          const created = await api.createUserRole({
            user_id: user.id,
            email: user.email || "",
            role: DEFAULT_ROLE,
            is_active: true,
            assigned_by: "system",
          });
          setRole(DEFAULT_ROLE);
          setRoleRecordId((created.id as number) || null);
        } catch (err) {
          if (import.meta.env.DEV) console.warn("[RBAC] Failed to create default role:", err);
          setRole(DEFAULT_ROLE);
        }
      }
    } catch (err) {
      if (import.meta.env.DEV) console.warn("[RBAC] Backend unavailable, using default role:", err);
      setRole(DEFAULT_ROLE);
    } finally {
      setRoleLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading) {
      loadRole();
    }
  }, [authLoading, loadRole]);

  const permissions = useMemo(() => getPermissionsForRole(role), [role]);

  const value = useMemo<RBACContextValue>(
    () => ({
      role,
      roleLoading,
      roleRecordId,
      can: (p: Permission) => hasPermission(role, p),
      canAll: (ps: Permission[]) => hasAllPermissions(role, ps),
      canAny: (ps: Permission[]) => hasAnyPermission(role, ps),
      isAtLeast: (minRole: Role) => isRoleAtLeast(role, minRole),
      permissions,
      roleLabel: getRoleLabel(role),
      roleColorClass: getRoleColor(role),
      refreshRole: loadRole,
    }),
    [role, roleLoading, roleRecordId, permissions, loadRole]
  );

  return <RBACContext.Provider value={value}>{children}</RBACContext.Provider>;
}

/** Hook to access RBAC context */
export function useRBAC() {
  return useContext(RBACContext);
}

/** Hook: returns true if user has the permission */
export function usePermission(permission: Permission): boolean {
  const { can } = useRBAC();
  return can(permission);
}

/** Hook: returns true if user has ALL permissions */
export function useAllPermissions(permissions: Permission[]): boolean {
  const { canAll } = useRBAC();
  return canAll(permissions);
}