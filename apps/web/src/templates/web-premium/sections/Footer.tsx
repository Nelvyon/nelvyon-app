import Link from "next/link";

import { nelvyonSpacing } from "@/design-system/tokens";
import type { WebPremiumFooterSection } from "@/templates/web-premium/types";

interface Props {
  footer: WebPremiumFooterSection;
}

export function WebPremiumFooter({ footer }: Props) {
  const py = nelvyonSpacing[10];
  return (
    <footer className="border-t border-border bg-muted/30 text-muted-foreground" style={{ paddingTop: py, paddingBottom: py }}>
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 text-sm sm:px-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <p className="font-semibold text-foreground">{footer.orgName}</p>
          <p className="max-w-xl text-[14px] leading-[22px]">{footer.finePrint}</p>
        </div>
        <nav aria-label="Footer shortcuts">
          <ul className="flex flex-wrap gap-4">
            {footer.links.map((link) => (
              <li key={link.label}>
                {link.href.startsWith("#") ? (
                  <a
                    className="font-medium text-link underline-offset-4 hover:text-link-hover hover:underline"
                    href={link.href}
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link className="font-medium text-link underline-offset-4 hover:text-link-hover hover:underline" href={link.href}>
                    {link.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
