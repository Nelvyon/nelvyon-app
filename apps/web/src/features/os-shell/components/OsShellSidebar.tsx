"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { OS_SHELL_NAV, isOsShellNavActive } from "@/features/os-shell/osShellNav";
import { cn } from "@/core/ui/utils";

export function OsShellSidebar({ collapsed }: { collapsed?: boolean }) {
  const pathname = usePathname() ?? "";

  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col border-r border-white/10 bg-[#07122a]",
        collapsed ? "w-[72px]" : "w-60",
      )}
    >
      <div className={cn("border-b border-white/10 px-4 py-5", collapsed && "px-2 text-center")}>
        {!collapsed ? (
          <>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0084FF]">
              NELVYON
            </p>
            <p className="mt-1 text-lg font-semibold text-white">Operations</p>
            <p className="text-xs text-white/50">Uso interno · no SaaS cliente</p>
          </>
        ) : (
          <span className="text-sm font-bold text-[#0084FF]">N</span>
        )}
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2" aria-label="NELVYON OS">
        {OS_SHELL_NAV.map((item) => {
          const active = isOsShellNavActive(pathname, item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                "flex min-h-[44px] items-center rounded-lg text-sm transition-colors",
                collapsed ? "justify-center px-2" : "gap-3 px-3",
                active
                  ? "bg-[#0084FF] text-white shadow-[0_0_20px_rgba(0,132,255,0.25)]"
                  : "text-white/80 hover:bg-white/5 hover:text-white",
              )}
            >
              <Icon className="h-5 w-5 shrink-0 opacity-90" aria-hidden />
              {!collapsed ? <span>{item.label}</span> : null}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
