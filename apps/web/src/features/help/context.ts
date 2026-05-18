import { HelpModule } from "@/features/help/content";

const MODULE_PREFIXES: Array<{ prefix: string; module: HelpModule }> = [
  { prefix: "/crm", module: "crm" },
  { prefix: "/inbox", module: "inbox" },
  { prefix: "/campaigns", module: "campaigns" },
  { prefix: "/automations", module: "automations" },
  { prefix: "/billing", module: "billing" },
  { prefix: "/settings", module: "settings" },
  { prefix: "/os", module: "os" },
];

export function inferHelpModuleFromPath(pathname: string): HelpModule | null {
  for (const item of MODULE_PREFIXES) {
    if (pathname === item.prefix || pathname.startsWith(`${item.prefix}/`)) {
      return item.module;
    }
  }
  return null;
}
