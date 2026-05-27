import { Footer } from "./footer";
import { Navbar } from "./navbar";

export function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  );
}
