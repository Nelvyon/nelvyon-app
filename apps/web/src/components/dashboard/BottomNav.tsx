"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { ProductNavItem } from "@/core/shell/navConfig";
import { isNavActive } from "@/core/shell/navConfig";
import { cn } from "@/core/ui/utils";

export function BottomNav({ items }: { items: ProductNavItem[] }) {
  const pathname = usePathname() ?? "";
  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Navegación principal móvil"
      className="fixed bottom-0 left-0 right-0 z-50 flex h-16 min-h-[4rem] border-t border-zinc-800 bg-zinc-950 pb-[env(safe-area-inset-bottom,0px)] lg:hidden"
    >
      <div className="flex h-full w-full max-w-full items-stretch overflow-x-auto overscroll-x-contain px-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((item) => {
          const active = isNavActive(pathname, item);
          const Icon = item.icon;
          return (
            <Link
              key={item.module}
              href={item.href}
              className={cn(
                "flex min-h-[44px] min-w-[4.5rem] flex-1 flex-col items-center justify-center gap-0.5 px-2 text-center text-[10px] font-medium leading-tight transition-colors sm:text-xs",
                active ? "text-indigo-400" : "text-zinc-500 hover:text-zinc-300",
              )}
            >
              <Icon aria-hidden className="h-5 w-5 shrink-0 opacity-90" />
              <span className="max-w-[5.5rem] truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
