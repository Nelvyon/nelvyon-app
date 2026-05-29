import { NvFooter } from "./footer";
import { NvNavbar } from "./navbar";

export function NelvyonMarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="nv-mkt min-h-screen">
      <NvNavbar />
      {children}
      <NvFooter />
    </div>
  );
}

export { NvNavbar as NelvyonNavbar, NvFooter as NelvyonFooter };
