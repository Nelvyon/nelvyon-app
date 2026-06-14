export default function PublicidadLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <p className="sr-only">Publicidad: Inversión total, ROAS combinado, Google Ads y Meta Ads unificados.</p>
      {children}
    </>
  );
}
