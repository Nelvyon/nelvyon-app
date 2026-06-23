"use client";

import { cn } from "@/lib/utils";

import { Button } from "@/components/button";
import { useState } from "react";
import { IconMenu2, IconX } from "@tabler/icons-react";
import { Logo } from "@/components/logo";
import { usePathname } from "next/navigation";
import Link from "next/link";

const navItems = [
  { label: "Work", href: "/work" },
  { label: "Products", href: "/products" },
  { label: "Pricing", href: "/pricing" },
  { label: "Blog", href: "/blog" },
];

export const Navbar = ({ className }: { className?: string | undefined }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  const isDarkMode = pathname === "/";

  return (
    <nav
      className={cn(
        isDarkMode
          ? "absolute inset-x-0 top-4 z-50 mx-auto w-full lg:top-4 lg:max-w-[calc(100%-4rem)]"
          : "mt-4",
        className,
      )}
    >
      <div className="max-w-container mx-auto px-8 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex shrink-0 items-center gap-2 lg:min-w-45">
            <Logo className="size-8" />
          </div>
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "px-3 py-2 text-sm font-medium transition-colors duration-200",
                    isDarkMode
                      ? "text-natural-white/80 hover:text-natural-white"
                      : "text-natural-black/80 hover:text-natural-black",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Desktop Navigation */}

          {/* Desktop CTA Button */}
          <div className="hidden md:block">
            <Button />
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 text-white/80 hover:text-white"
            >
              {isMenuOpen ? (
                <IconX className={cn("size-6", isDarkMode ? "text-natural-white" : "text-natural-black")} />
              ) : (
                <IconMenu2 className={cn("size-6", isDarkMode ? "text-natural-white" : "text-natural-black")} />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div
          className={cn(
            "overflow-hidden rounded-xl bg-neutral-900 transition-all duration-300 ease-in-out md:hidden",
            isMenuOpen ? "max-h-64 opacity-100" : "max-h-0 opacity-0",
          )}
        >
          <div className="gap-1 px-2 pt-2 pb-3">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="block px-3 py-2 text-base font-medium text-white/80 transition-colors duration-200 hover:text-white"
                onClick={() => setIsMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="px-2 pt-4">
              <Button />
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};
