export default function DashboardGrowthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <p className="sr-only">Informe Growth Pack: métricas QA, entregables en portal y servicios élite conectados.</p>
      {children}
    </>
  );
}
