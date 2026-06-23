/** Datos legales editables — actualiza razón social y CIF antes del lanzamiento comercial. */
export const LEGAL_META = {
  productName: "NELVYON",
  companyLegalName: process.env.NEXT_PUBLIC_LEGAL_ENTITY_NAME?.trim() || "NELVYON (titular del software)",
  contactEmail: "legal@nelvyon.com",
  privacyEmail: "privacy@nelvyon.com",
  supportEmail: "hola@nelvyon.com",
  effectiveDate: "18 de junio de 2026",
  jurisdiction: "España",
  courts: "los juzgados y tribunales de Madrid (España)",
} as const;
