"use client";

import Link from "next/link";

import { useAuth } from "@/core/auth/AuthContext";
import { getNavItemsForRole } from "@/core/shell/navConfig";
import { SubsectionTitle } from "@/core/ui/typography";

export function OsModuleShortcuts() {
  const { user } = useAuth();
  if (!user) return null;

  const items = getNavItemsForRole(user.role).filter((i) => i.module !== "os");

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-card">
      <SubsectionTitle>Quick access</SubsectionTitle>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item.module}>
            <Link className="text-sm text-link transition-colors hover:text-link-hover hover:underline" href={item.href}>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
