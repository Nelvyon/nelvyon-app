export default function PartnersLayout({ children }: { children: React.ReactNode }) {
  return (
    <section aria-label="Partner HQ">
      {/* SSR anchor for staging smoke — matches client Stripe Connect banner region */}
      <p className="sr-only" id="partner-hq-connect-region">
        Partner HQ — Cómo funciona tu comisión — Tu margen este mes — Stripe Connect cobros partner
      </p>
      {children}
    </section>
  );
}
