export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <p className="sr-only">Analytics centro: Instantáneas de Publicidad, Social, Embudos y Ecommerce.</p>
      {children}
    </>
  );
}
