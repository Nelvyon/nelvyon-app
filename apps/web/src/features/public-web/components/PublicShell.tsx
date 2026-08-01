import type { ReactNode } from "react";

import { PublicFooter } from "./PublicFooter";
import { PublicNav } from "./PublicNav";

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="nv-public min-h-screen">
      <PublicNav />
      {/* Root layout already provides <main>; keep a single landmark. */}
      <div id="contenido-principal">{children}</div>
      <PublicFooter />
    </div>
  );
}
