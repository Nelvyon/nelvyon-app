/**
 * PermissionGate — Conditionally renders children based on RBAC permissions.
 * Enhanced with action logging for security audit trail.
 *
 * Usage:
 *   <PermissionGate permission="clients:delete">
 *     <DeleteButton />
 *   </PermissionGate>
 *
 *   <PermissionGate permissions={["billing:read", "billing:manage"]} mode="any">
 *     <BillingPanel />
 *   </PermissionGate>
 *
 *   <PermissionGate minRole="admin">
 *     <AdminPanel />
 *   </PermissionGate>
 */
import React, { useEffect, useRef } from "react";
import { useRBAC } from "@/contexts/RBACContext";
import { type Permission, type Role } from "@/lib/rbac";
import { Lock, ShieldAlert } from "lucide-react";
import { recordMetric } from "@/lib/observability";

/** Log access attempts for security auditing */
function logAccessAttempt(
  granted: boolean,
  context: { permission?: Permission; permissions?: Permission[]; minRole?: Role; module?: string },
) {
  if (!granted) {
    // Log denied access attempts — useful for detecting privilege escalation
    recordMetric({
      endpoint: `rbac/denied/${context.permission || context.minRole || "unknown"}`,
      module: context.module || "permission-gate",
      latencyMs: 0,
      status: "error",
    });
  }
}

interface PermissionGateProps {
  children: React.ReactNode;
  /** Single permission to check */
  permission?: Permission;
  /** Multiple permissions to check */
  permissions?: Permission[];
  /** "all" = require all permissions, "any" = require at least one */
  mode?: "all" | "any";
  /** Minimum role level required */
  minRole?: Role;
  /** What to show when access is denied (default: nothing) */
  fallback?: React.ReactNode;
  /** Show a "no access" message instead of hiding */
  showDenied?: boolean;
  /** Module name for audit logging */
  module?: string;
  /** Log access attempts (default: true for denied) */
  logAccess?: boolean;
}

export function PermissionGate({
  children,
  permission,
  permissions,
  mode = "all",
  minRole,
  fallback,
  showDenied = false,
  module,
  logAccess = true,
}: PermissionGateProps) {
  const { can, canAll, canAny, isAtLeast, roleLoading, role } = useRBAC();
  const loggedRef = useRef(false);

  let hasAccess = true;

  // Check single permission
  if (permission) {
    hasAccess = can(permission);
  }

  // Check multiple permissions
  if (permissions && permissions.length > 0) {
    hasAccess = mode === "all" ? canAll(permissions) : canAny(permissions);
  }

  // Check minimum role
  if (minRole) {
    hasAccess = hasAccess && isAtLeast(minRole);
  }

  // Log denied access (once per mount to avoid spam)
  useEffect(() => {
    if (!roleLoading && !hasAccess && logAccess && !loggedRef.current) {
      loggedRef.current = true;
      logAccessAttempt(false, { permission, permissions, minRole, module });
    }
  }, [roleLoading, hasAccess, logAccess, permission, permissions, minRole, module]);

  // While loading, don't render anything
  if (roleLoading) return null;

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showDenied) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/5 border border-red-500/10 text-red-400 text-xs">
        <ShieldAlert className="w-3.5 h-3.5" />
        <div>
          <span>No tienes permisos para acceder a esta función.</span>
          <span className="text-[9px] text-red-400/50 ml-2">
            (Rol actual: {role}{permission ? ` · Requiere: ${permission}` : ""}{minRole ? ` · Mínimo: ${minRole}` : ""})
          </span>
        </div>
      </div>
    );
  }

  return null;
}

/**
 * PermissionButton — A button that is disabled/hidden based on permissions.
 * Enhanced with tooltip showing required permission info.
 */
interface PermissionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  permission?: Permission;
  minRole?: Role;
  hideWhenDenied?: boolean;
  /** Module name for audit logging */
  module?: string;
}

export function PermissionButton({
  permission,
  minRole,
  hideWhenDenied = false,
  module,
  children,
  ...props
}: PermissionButtonProps) {
  const { can, isAtLeast, role } = useRBAC();

  let hasAccess = true;
  if (permission) hasAccess = can(permission);
  if (minRole) hasAccess = hasAccess && isAtLeast(minRole);

  if (!hasAccess && hideWhenDenied) return null;

  const deniedTitle = !hasAccess
    ? `Sin permisos (Rol: ${role}${permission ? ` · Requiere: ${permission}` : ""}${minRole ? ` · Mínimo: ${minRole}` : ""})`
    : undefined;

  return (
    <button
      {...props}
      disabled={!hasAccess || props.disabled}
      title={deniedTitle || props.title}
      onClick={(e) => {
        if (!hasAccess) {
          // Log blocked action attempt
          logAccessAttempt(false, { permission, minRole, module });
          return;
        }
        props.onClick?.(e);
      }}
    >
      {children}
    </button>
  );
}

/**
 * CriticalActionGate — Extra protection for destructive operations.
 * Requires explicit confirmation and logs the action.
 */
interface CriticalActionGateProps {
  permission: Permission;
  minRole?: Role;
  actionName: string;
  onConfirm: () => void;
  children: React.ReactNode;
}

export function CriticalActionGate({
  permission,
  minRole,
  actionName,
  onConfirm,
  children,
}: CriticalActionGateProps) {
  const { can, isAtLeast, role } = useRBAC();
  const [showConfirm, setShowConfirm] = React.useState(false);

  let hasAccess = can(permission);
  if (minRole) hasAccess = hasAccess && isAtLeast(minRole);

  if (!hasAccess) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-lg bg-red-500/5 border border-red-500/10 text-red-400 text-[10px]">
        <Lock className="w-3 h-3" />
        <span>Acción restringida: {actionName}</span>
      </div>
    );
  }

  if (showConfirm) {
    return (
      <div className="p-3 rounded-lg bg-red-500/[0.06] border border-red-500/10 space-y-2">
        <p className="text-xs text-red-300 font-semibold">⚠️ Confirmar: {actionName}</p>
        <p className="text-[10px] text-zinc-400">Esta acción no se puede deshacer. ¿Estás seguro?</p>
        <div className="flex gap-2">
          <button onClick={() => {
            recordMetric({
              endpoint: `rbac/critical-action/${permission}`,
              module: "critical-action-gate",
              latencyMs: 0,
              status: "success",
            });
            onConfirm();
            setShowConfirm(false);
          }} className="px-3 py-1 rounded bg-red-600 text-white text-[10px] font-bold hover:bg-red-700">
            Confirmar
          </button>
          <button onClick={() => setShowConfirm(false)}
            className="px-3 py-1 rounded border border-white/10 text-zinc-400 text-[10px] hover:bg-white/5">
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div onClick={() => setShowConfirm(true)} className="cursor-pointer">
      {children}
    </div>
  );
}