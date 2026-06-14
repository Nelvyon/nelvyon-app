export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <p className="sr-only">
        Pulso del workspace: Inversión ads, alcance social, conversiones embudo e ingresos tienda en tiempo real.
      </p>
      {children}
    </>
  );
}
