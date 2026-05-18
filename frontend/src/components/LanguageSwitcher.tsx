import { useI18n, localeNames, localeFlags, type Locale } from "@/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

interface LanguageSwitcherProps {
  variant?: "ghost" | "outline" | "default";
  compact?: boolean;
  className?: string;
}

export default function LanguageSwitcher({ variant = "ghost", compact = false, className = "" }: LanguageSwitcherProps) {
  const { locale, setLocale } = useI18n();

  const locales = Object.keys(localeNames) as Locale[];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={compact ? "icon" : "sm"} className={`${className} ${compact ? "h-8 w-8" : "h-8 gap-1.5 px-2.5"}`}>
          <Globe className="w-4 h-4" />
          {!compact && (
            <span className="text-xs font-medium">
              {localeFlags[locale]} {localeNames[locale]}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-zinc-900 border-zinc-800 min-w-[180px] max-h-[320px] overflow-y-auto">
        {locales.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => setLocale(loc)}
            className={`cursor-pointer text-zinc-300 hover:text-white focus:text-white focus:bg-white/[0.06] ${
              locale === loc ? "bg-violet-500/10 text-violet-300" : ""
            }`}
          >
            <span className="mr-2 text-base">{localeFlags[loc]}</span>
            <span className="text-sm">{localeNames[loc]}</span>
            {locale === loc && (
              <span className="ml-auto text-violet-400 text-xs">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}