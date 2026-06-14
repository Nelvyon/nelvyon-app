export default function OsPacksLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <p className="sr-only">Growth Packs: Local Growth Pack, Ecommerce Growth Pack y SaaS B2B Growth Pack autónomos.</p>
      {children}
    </>
  );
}
