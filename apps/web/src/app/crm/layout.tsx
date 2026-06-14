export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <p className="sr-only">Revenue CRM: Datos demo de pipeline, deals recientes y conversión por etapa.</p>
      {children}
    </>
  );
}
