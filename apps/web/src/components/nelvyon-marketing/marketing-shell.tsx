import { NelvyonFooter } from "./footer";
import { NelvyonNavbar } from "./navbar";

export function NelvyonMarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <NelvyonNavbar />
      {children}
      <NelvyonFooter />
    </div>
  );
}
