import Link from "next/link";

import { nelvyonSpacing } from "@/design-system/tokens";
import type { EcommercePremiumStoreConfig } from "@/templates/ecommerce-premium/types";

interface Props {
  store: EcommercePremiumStoreConfig;
}

export function EcommercePremiumFooter({ store }: Props) {
  const py = nelvyonSpacing[10];
  return (
    <footer
      className="mt-auto border-t border-border bg-muted/30 text-muted-foreground"
      style={{ paddingTop: py, paddingBottom: py }}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 text-sm sm:px-6 lg:flex-row lg:justify-between">
        <div className="space-y-2">
          <p className="font-semibold text-foreground">{store.footer.orgLabel}</p>
          <p className="max-w-xl text-[14px] leading-[22px]">{store.footer.finePrint}</p>
        </div>
        <nav aria-label="Footer">
          <ul className="flex flex-wrap gap-x-6 gap-y-3">
            {store.footer.links.map((link) =>
              link.href.startsWith("/") ? (
                <li key={`${link.label}-${link.href}`}>
                  <Link className="font-medium text-link underline-offset-4 hover:text-link-hover hover:underline" href={link.href}>
                    {link.label}
                  </Link>
                </li>
              ) : (
                <li key={`${link.label}-${link.href}`}>
                  <a className="font-medium text-link underline-offset-4 hover:text-link-hover hover:underline" href={link.href}>
                    {link.label}
                  </a>
                </li>
              ),
            )}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
