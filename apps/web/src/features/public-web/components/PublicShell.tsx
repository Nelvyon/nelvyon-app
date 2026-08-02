import type { ReactNode } from "react";

import { PublicFooter } from "./PublicFooter";
import { PublicNav } from "./PublicNav";

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="nv-public nv-brand min-h-screen">
      <PublicNav />
      <div id="contenido-principal">{children}</div>
      <PublicFooter />
    </div>
  );
}
